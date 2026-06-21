import XCTest
@testable import EpheMac

final class VaultStoreTests: XCTestCase {
    func testListNotesSkipsHiddenFoldersGitAndNonMarkdownFiles() throws {
        let fixture = try TempVault()
        try fixture.write("Inbox.md", "# Inbox")
        try fixture.write("Folder/Nested.md", "# Nested")
        try fixture.write(".git/Ignored.md", "# Ignored")
        try fixture.write(".obsidian/Ignored.md", "# Ignored")
        try fixture.write("notes.txt", "Nope")

        let store = VaultStore()
        let vault = try store.openVault(at: fixture.url)

        XCTAssertEqual(try store.listNotes(in: vault), [NoteID("Folder/Nested.md"), NoteID("Inbox.md")])
    }

    func testReadWriteCreateRenameAndDeleteNote() throws {
        let fixture = try TempVault()
        try fixture.write("Folder/Source.md", "# Source")
        let store = VaultStore()
        let vault = try store.openVault(at: fixture.url)

        var document = try store.readNote(NoteID("Folder/Source.md"), in: vault)
        document.content = "# Source\nupdated"
        let saved = try store.writeNote(document, in: vault)
        XCTAssertFalse(saved.isDirty)
        XCTAssertEqual(try String(contentsOf: fixture.url.appending(path: "Folder/Source.md"), encoding: .utf8), "# Source\nupdated")

        let created = try store.createNote(named: "Linked", near: NoteID("Folder/Source.md"), in: vault)
        XCTAssertEqual(created.id, NoteID("Folder/Linked.md"))

        let folder = try store.createFolder(named: "Drafts", near: NoteID("Folder/Source.md"), in: vault)
        XCTAssertEqual(folder, "Folder/Drafts")
        XCTAssertTrue(FileManager.default.fileExists(atPath: fixture.url.appending(path: "Folder/Drafts").path(percentEncoded: false)))

        let renamed = try store.renameNote(created.id, to: "Archive/Linked.md", in: vault)
        XCTAssertEqual(renamed, NoteID("Archive/Linked.md"))
        XCTAssertTrue(FileManager.default.fileExists(atPath: fixture.url.appending(path: "Archive/Linked.md").path(percentEncoded: false)))

        try store.deleteNote(renamed, in: vault)
        XCTAssertFalse(FileManager.default.fileExists(atPath: fixture.url.appending(path: "Archive/Linked.md").path(percentEncoded: false)))
    }

    func testPathNormalization() {
        XCTAssertEqual(NoteID.normalize("Folder/../Today"), "Today.md")
        XCTAssertEqual(NoteID.normalize("Folder\\Today.md"), "Folder/Today.md")
        XCTAssertEqual(NoteID("Folder/./Today").rawValue, "Folder/Today.md")
    }

    @MainActor
    func testCreateUntitledNoteSkipsExistingNameAndSelectsNewDocument() throws {
        let fixture = try TempVault()
        try fixture.write("Untitled.md", "# Untitled")
        let session = EditorSession()

        try session.openVault(at: fixture.url)
        session.createNote()

        XCTAssertTrue(FileManager.default.fileExists(atPath: fixture.url.appending(path: "Untitled 2.md").path(percentEncoded: false)))
        XCTAssertEqual(session.selectedNoteID, NoteID("Untitled 2.md"))
        XCTAssertEqual(session.document?.id, NoteID("Untitled 2.md"))
    }

    @MainActor
    func testFormatAndSaveSelectedNoteWritesFormattedMarkdown() async throws {
        let fixture = try TempVault()
        try fixture.write("Draft.md", "# Draft  \n\n\nBody")
        let session = EditorSession()

        try session.openVault(at: fixture.url)
        session.selectNote(NoteID("Draft.md"))
        let didLoadDocument = await waitUntil { session.document?.id == NoteID("Draft.md") }
        XCTAssertTrue(didLoadDocument)
        session.updateContent("# Draft  \n\n\nBody")
        try session.formatAndSaveSelectedNote()

        XCTAssertEqual(session.document?.content, "# Draft\n\nBody\n")
        XCTAssertEqual(try String(contentsOf: fixture.url.appending(path: "Draft.md"), encoding: .utf8), "# Draft\n\nBody\n")
    }

    @MainActor
    func testRenameNoteKeepsFolderAndSelection() throws {
        let fixture = try TempVault()
        try fixture.write("Folder/Old.md", "# Old")
        let session = EditorSession()

        try session.openVault(at: fixture.url)
        session.selectNote(NoteID("Folder/Old.md"))
        session.renameNote(NoteID("Folder/Old.md"), to: "New")

        XCTAssertFalse(FileManager.default.fileExists(atPath: fixture.url.appending(path: "Folder/Old.md").path(percentEncoded: false)))
        XCTAssertTrue(FileManager.default.fileExists(atPath: fixture.url.appending(path: "Folder/New.md").path(percentEncoded: false)))
        XCTAssertEqual(session.selectedNoteID, NoteID("Folder/New.md"))
        XCTAssertEqual(session.document?.id, NoteID("Folder/New.md"))
    }

    @MainActor
    func testPinningPersistsPerVaultAndSortsSidebarFirst() async throws {
        let fixture = try TempVault()
        try fixture.write("A.md", "# A")
        try fixture.write("B.md", "# B")
        let suiteName = "EpheMacTests-\(UUID().uuidString)"
        let defaults = try XCTUnwrap(UserDefaults(suiteName: suiteName))
        defer {
            defaults.removePersistentDomain(forName: suiteName)
        }
        let session = EditorSession(userDefaults: defaults)

        try session.openVault(at: fixture.url)
        let didLoadSidebar = await waitUntil { session.sidebarNotes.map(\.id) == [NoteID("A.md"), NoteID("B.md")] }
        XCTAssertTrue(didLoadSidebar)

        session.togglePin(NoteID("B.md"))
        XCTAssertTrue(session.isPinned(NoteID("B.md")))
        XCTAssertEqual(session.sidebarNotes.map(\.id), [NoteID("B.md"), NoteID("A.md")])

        let reopened = EditorSession(userDefaults: defaults)
        try reopened.openVault(at: fixture.url)
        XCTAssertTrue(reopened.isPinned(NoteID("B.md")))
    }

    @MainActor
    func testEditorSessionNavigationHistoryTracksSelections() throws {
        let fixture = try TempVault()
        try fixture.write("A.md", "# A")
        try fixture.write("B.md", "# B")
        try fixture.write("C.md", "# C")
        let session = EditorSession()

        try session.openVault(at: fixture.url)
        session.selectNote(NoteID("A.md"))
        XCTAssertFalse(session.canNavigateBack)
        XCTAssertFalse(session.canNavigateForward)

        session.selectNote(NoteID("B.md"))
        session.selectNote(NoteID("C.md"))
        XCTAssertTrue(session.canNavigateBack)
        XCTAssertFalse(session.canNavigateForward)

        session.navigateBack()
        XCTAssertEqual(session.selectedNoteID, NoteID("B.md"))
        XCTAssertTrue(session.canNavigateBack)
        XCTAssertTrue(session.canNavigateForward)

        session.navigateBack()
        XCTAssertEqual(session.selectedNoteID, NoteID("A.md"))
        XCTAssertFalse(session.canNavigateBack)
        XCTAssertTrue(session.canNavigateForward)

        session.navigateForward()
        XCTAssertEqual(session.selectedNoteID, NoteID("B.md"))
        XCTAssertTrue(session.canNavigateBack)
        XCTAssertTrue(session.canNavigateForward)

        session.selectNote(NoteID("C.md"))
        XCTAssertTrue(session.canNavigateBack)
        XCTAssertFalse(session.canNavigateForward)
    }
}

@MainActor
private func waitUntil(
    timeout: TimeInterval = 2,
    condition: @escaping () -> Bool
) async -> Bool {
    let deadline = Date().addingTimeInterval(timeout)
    while Date() < deadline {
        if condition() {
            return true
        }
        try? await Task.sleep(for: .milliseconds(20))
    }
    return condition()
}

final class TempVault {
    let url: URL

    init() throws {
        url = FileManager.default.temporaryDirectory.appending(path: "EpheMacTests-\(UUID().uuidString)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: url, withIntermediateDirectories: true)
    }

    deinit {
        try? FileManager.default.removeItem(at: url)
    }

    func write(_ relativePath: String, _ content: String) throws {
        let fileURL = url.appending(path: relativePath)
        try FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try content.write(to: fileURL, atomically: true, encoding: .utf8)
    }
}
