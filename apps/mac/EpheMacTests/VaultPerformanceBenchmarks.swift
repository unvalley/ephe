import AppKit
import SwiftUI
import XCTest
@testable import EpheMac

final class VaultPerformanceBenchmarks: XCTestCase {
    func testVaultPerformance() async throws {
        guard let vaultPath = benchmarkVaultPath() else {
            throw XCTSkip("Set EPHE_BENCHMARK_VAULT or write /tmp/ephe-benchmark-vault-path to benchmark a real vault.")
        }

        let vaultURL = URL(fileURLWithPath: vaultPath, isDirectory: true)
        let store = VaultStore()
        let markdownIndexer = MarkdownIndexer(store: store)
        let vault = try store.openVault(at: vaultURL)
        let databaseDirectory = FileManager.default.temporaryDirectory
            .appending(path: "EpheMacBench-\(UUID().uuidString)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: databaseDirectory, withIntermediateDirectories: true)
        defer { try? FileManager.default.removeItem(at: databaseDirectory) }

        let indexStore = VaultIndexStore(databaseURL: databaseDirectory.appending(path: "vault.sqlite"))
        let vaultIndexer = VaultIndexer(store: store, indexStore: indexStore)

        let (noteFiles, listMs) = try timed("list_note_files_ms") {
            try store.listNoteFiles(in: vault)
        }
        let (_, skeletonMs) = try timed("skeleton_index_ms") {
            try markdownIndexer.buildSkeletonIndex(from: noteFiles)
        }
        let (_, initialSQLiteMs) = try await timedAsync("sqlite_initial_index_ms") {
            try await vaultIndexer.reindexChangedNotes(in: vault)
        }
        let (_, cachedAllNotesMs) = try await timedAsync("sqlite_cached_all_notes_ms") {
            try await indexStore.allNotes()
        }
        let cachedOpenSidebarMs = try await Self.measureEditorSessionCachedOpenSidebar(vaultURL: vaultURL, indexStore: indexStore)
        print("EPHE_BENCHMARK editor_session_cached_open_sidebar_ms=\(format(cachedOpenSidebarMs))")
        let (_, unchangedSQLiteMs) = try await timedAsync("sqlite_unchanged_refresh_ms") {
            try await vaultIndexer.reindexChangedNotes(in: vault)
        }

        let largest = try largestNote(in: noteFiles, vault: vault)
        let (_, largestReadMs) = try timed("largest_note_read_ms") {
            try store.readNote(largest.id, in: vault)
        }
        let (_, largestScanMs) = try timed("largest_note_scan_ms") {
            let content = try MarkdownFileReader.readString(from: largest.id.fileURL(in: vault))
            _ = ObsidianSyntaxScanner().scan(
                content: content,
                noteID: largest.id,
                modifiedAt: Date.distantPast,
                size: largest.size
            )
        }
        let largestContent = try MarkdownFileReader.readString(from: largest.id.fileURL(in: vault))
        let largestTextViewDisplayMs = try await Self.measureTextViewDisplay(content: largestContent)
        print("EPHE_BENCHMARK largest_note_textview_display_ms=\(format(largestTextViewDisplayMs))")
        let largestFullHighlightMs = try await Self.measureMarkdownHighlight(content: largestContent)
        print("EPHE_BENCHMARK largest_note_full_highlight_ms=\(format(largestFullHighlightMs))")
        let largestCachedHighlightMs = try await Self.measureMarkdownCachedHighlight(content: largestContent)
        print("EPHE_BENCHMARK largest_note_cached_highlight_ms=\(format(largestCachedHighlightMs))")
        let largestPartialHighlightMs = try await Self.measureMarkdownPartialHighlight(content: largestContent)
        print("EPHE_BENCHMARK largest_note_partial_highlight_ms=\(format(largestPartialHighlightMs))")
        let editorSessionSelectMs = try await Self.measureEditorSessionSelect(vaultURL: vaultURL, indexStore: indexStore, noteID: largest.id)
        print("EPHE_BENCHMARK editor_session_select_largest_ms=\(format(editorSessionSelectMs))")
        let sidebarKeyboardMoveMs = try await Self.measureSidebarKeyboardNavigation(vaultURL: vaultURL, indexStore: indexStore)
        print("EPHE_BENCHMARK sidebar_keyboard_move_ms=\(format(sidebarKeyboardMoveMs))")

        let summary = """
            EPHE_BENCHMARK_SUMMARY vault="\(vaultURL.path(percentEncoded: false))" \
            notes=\(noteFiles.count) \
            largest_note="\(largest.id.rawValue)" largest_bytes=\(largest.size) \
            list_note_files_ms=\(format(listMs)) \
            skeleton_index_ms=\(format(skeletonMs)) \
            sqlite_initial_index_ms=\(format(initialSQLiteMs)) \
            sqlite_cached_all_notes_ms=\(format(cachedAllNotesMs)) \
            editor_session_cached_open_sidebar_ms=\(format(cachedOpenSidebarMs)) \
            sqlite_unchanged_refresh_ms=\(format(unchangedSQLiteMs)) \
            largest_note_read_ms=\(format(largestReadMs)) \
            largest_note_scan_ms=\(format(largestScanMs)) \
            largest_note_textview_display_ms=\(format(largestTextViewDisplayMs)) \
            largest_note_full_highlight_ms=\(format(largestFullHighlightMs)) \
            largest_note_cached_highlight_ms=\(format(largestCachedHighlightMs)) \
            largest_note_partial_highlight_ms=\(format(largestPartialHighlightMs)) \
            editor_session_select_largest_ms=\(format(editorSessionSelectMs)) \
            sidebar_keyboard_move_ms=\(format(sidebarKeyboardMoveMs))
            """
        print(summary)
        try summary.write(to: URL(fileURLWithPath: "/tmp/ephe-benchmark-results.txt"), atomically: true, encoding: .utf8)
    }

    private func timed<T>(_ label: String, _ body: () throws -> T) throws -> (T, Double) {
        let start = DispatchTime.now().uptimeNanoseconds
        let value = try body()
        let milliseconds = Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
        print("EPHE_BENCHMARK \(label)=\(format(milliseconds))")
        return (value, milliseconds)
    }

    private func timedAsync<T>(_ label: String, _ body: () async throws -> T) async throws -> (T, Double) {
        let start = DispatchTime.now().uptimeNanoseconds
        let value = try await body()
        let milliseconds = Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
        print("EPHE_BENCHMARK \(label)=\(format(milliseconds))")
        return (value, milliseconds)
    }

    @MainActor
    private static func measureTextViewDisplay(content: String) throws -> Double {
        let start = DispatchTime.now().uptimeNanoseconds
        let editor = MarkdownEditorScrollView()
        editor.textView.string = content
        if let textContainer = editor.textView.textContainer {
            editor.textView.layoutManager?.ensureLayout(for: textContainer)
        }
        return Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
    }

    @MainActor
    private static func measureMarkdownHighlight(content: String) throws -> Double {
        let editor = MarkdownEditorScrollView()
        let coordinator = MarkdownDecoratedTextEditor.Coordinator(text: .constant(content), onWikiLink: { _ in })
        editor.textView.string = content
        coordinator.applyBaseAttributes(to: editor.textView)
        let start = DispatchTime.now().uptimeNanoseconds
        coordinator.applyHighlightingForBenchmark(to: editor.textView)
        return Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
    }

    @MainActor
    private static func measureMarkdownCachedHighlight(content: String) throws -> Double {
        let warmEditor = MarkdownEditorScrollView()
        let warmCoordinator = MarkdownDecoratedTextEditor.Coordinator(text: .constant(content), onWikiLink: { _ in })
        warmEditor.textView.string = content
        warmCoordinator.applyBaseAttributes(to: warmEditor.textView)
        warmCoordinator.applyHighlightingForBenchmark(to: warmEditor.textView)

        let editor = MarkdownEditorScrollView()
        let coordinator = MarkdownDecoratedTextEditor.Coordinator(text: .constant(content), onWikiLink: { _ in })
        editor.textView.string = content
        coordinator.applyBaseAttributes(to: editor.textView)
        let start = DispatchTime.now().uptimeNanoseconds
        XCTAssertTrue(coordinator.applyCachedHighlightingIfAvailable(to: editor.textView))
        return Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
    }

    @MainActor
    private static func measureMarkdownPartialHighlight(content: String) throws -> Double {
        let editor = MarkdownEditorScrollView()
        let coordinator = MarkdownDecoratedTextEditor.Coordinator(text: .constant(content), onWikiLink: { _ in })
        editor.textView.string = content
        coordinator.applyBaseAttributes(to: editor.textView)
        let middle = (content as NSString).length / 2
        let range = NSRange(location: middle, length: 1)
        let start = DispatchTime.now().uptimeNanoseconds
        coordinator.applyHighlightingForBenchmark(to: editor.textView, range: range)
        return Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
    }

    @MainActor
    private static func measureEditorSessionCachedOpenSidebar(vaultURL: URL, indexStore: VaultIndexStore) async throws -> Double {
        let session = EditorSession(makeIndexStore: { _ in indexStore })
        let start = DispatchTime.now().uptimeNanoseconds
        try session.openVault(at: vaultURL)
        try await waitForSidebarNotes(in: session)
        return Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
    }

    @MainActor
    private static func measureEditorSessionSelect(vaultURL: URL, indexStore: VaultIndexStore, noteID: NoteID) async throws -> Double {
        let session = EditorSession(makeIndexStore: { _ in indexStore })
        try session.openVault(at: vaultURL)
        try await waitForSidebarNotes(in: session)
        let start = DispatchTime.now().uptimeNanoseconds
        session.selectNote(noteID)
        try await waitForSelectedDocument(in: session, noteID: noteID)
        return Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
    }

    @MainActor
    private static func measureSidebarKeyboardNavigation(vaultURL: URL, indexStore: VaultIndexStore) async throws -> Double {
        let session = EditorSession(makeIndexStore: { _ in indexStore })
        try session.openVault(at: vaultURL)
        try await waitForSidebarNotes(in: session)
        let iterations = max(1, min(50, session.sidebarNotes.count - 1))
        let start = DispatchTime.now().uptimeNanoseconds
        for _ in 0..<iterations {
            session.moveSidebarSelection(delta: 1)
        }
        return Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000 / Double(iterations)
    }

    @MainActor
    private static func waitForSelectedDocument(in session: EditorSession, noteID: NoteID) async throws {
        let timeout = DispatchTime.now().uptimeNanoseconds + 1_000_000_000
        while session.document?.id != noteID {
            if DispatchTime.now().uptimeNanoseconds > timeout {
                throw NSError(
                    domain: "EpheBenchmark",
                    code: 1,
                    userInfo: [NSLocalizedDescriptionKey: "Timed out waiting for \(noteID.rawValue)"]
                )
            }
            try await Task.sleep(for: .milliseconds(1))
        }
    }

    @MainActor
    private static func waitForSidebarNotes(in session: EditorSession) async throws {
        let timeout = DispatchTime.now().uptimeNanoseconds + 5_000_000_000
        while session.sidebarNotes.isEmpty {
            if DispatchTime.now().uptimeNanoseconds > timeout {
                throw NSError(
                    domain: "EpheBenchmark",
                    code: 2,
                    userInfo: [NSLocalizedDescriptionKey: "Timed out waiting for sidebar notes"]
                )
            }
            try await Task.sleep(for: .milliseconds(1))
        }
    }

    private func largestNote(in noteFiles: [NoteFileInfo], vault: Vault) throws -> (id: NoteID, size: Int64) {
        var largest: (id: NoteID, size: Int64)?
        for noteFile in noteFiles {
            let values = try noteFile.id.fileURL(in: vault).resourceValues(forKeys: [.fileSizeKey])
            let size = Int64(values.fileSize ?? 0)
            if largest == nil || size > largest!.size {
                largest = (noteFile.id, size)
            }
        }
        return try XCTUnwrap(largest)
    }

    private func format(_ value: Double) -> String {
        String(format: "%.2f", value)
    }

    private func benchmarkVaultPath() -> String? {
        if let path = ProcessInfo.processInfo.environment["EPHE_BENCHMARK_VAULT"], !path.isEmpty {
            return path
        }
        let pathFile = URL(fileURLWithPath: "/tmp/ephe-benchmark-vault-path")
        guard
            let rawPath = try? String(contentsOf: pathFile, encoding: .utf8)
                .trimmingCharacters(in: .whitespacesAndNewlines),
            !rawPath.isEmpty
        else {
            return nil
        }
        return rawPath
    }
}
