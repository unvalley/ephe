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
