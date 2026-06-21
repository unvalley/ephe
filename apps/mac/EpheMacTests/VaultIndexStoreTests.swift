import XCTest
@testable import EpheMac

final class VaultIndexStoreTests: XCTestCase {
    func testObsidianScannerExtractsDerivedData() {
        let scanner = ObsidianSyntaxScanner()
        let note = scanner.scan(
            content: """
            # Home
            See [site](https://example.com) and [[Project#Plan|project plan]].
            ![[image.png]]
            #swift/native
            """,
            noteID: NoteID("Home.md"),
            modifiedAt: Date(timeIntervalSince1970: 10),
            size: 120
        )

        XCTAssertEqual(note.title, "Home")
        XCTAssertEqual(note.headings, [ExtractedHeading(level: 1, text: "Home", line: 1)])
        XCTAssertEqual(note.links.map(\.kind), [.markdown, .wiki, .embed, .wiki])
        XCTAssertEqual(note.links.map(\.target), ["https://example.com", "Project", "image.png", "swift/native"])
        XCTAssertEqual(note.links[1].heading, "Plan")
        XCTAssertEqual(note.links[1].alias, "project plan")
        XCTAssertEqual(note.tags.map(\.name), ["swift/native"])
    }

    func testIndexUpdateDeleteBacklinksAndSearch() async throws {
        let fixture = try TempVault()
        try fixture.write("Home.md", "# Home\n[[Project]]\n#inbox\n")
        try fixture.write("Project.md", "# Project\nship native app\n")
        try fixture.write("inbox.md", "# Inbox\n")

        let store = VaultStore()
        let vault = try store.openVault(at: fixture.url)
        let indexStore = try makeIndexStore()
        let indexer = VaultIndexer(store: store, indexStore: indexStore)

        try await indexer.rebuild(in: vault)

        let backlinks = try await indexStore.backlinks(to: NoteID("Project.md"))
        XCTAssertEqual(backlinks.map(\.source), [NoteID("Home.md")])
        let tagBacklinks = try await indexStore.backlinks(to: NoteID("inbox.md"))
        XCTAssertEqual(tagBacklinks.map(\.source), [NoteID("Home.md")])

        let searchResults = try await indexStore.search("native")
        XCTAssertEqual(searchResults.map(\.id), [NoteID("Project.md")])

        try fixture.write("Home.md", "# Home\n[[Project]]\n[[Second]]\n")
        try fixture.write("Second.md", "# Second\n")
        try await indexer.index(noteID: NoteID("Second.md"), in: vault)
        try await indexer.index(noteID: NoteID("Home.md"), in: vault)

        let updatedBacklinks = try await indexStore.backlinks(to: NoteID("Second.md"))
        XCTAssertEqual(updatedBacklinks.map(\.source), [NoteID("Home.md")])

        try FileManager.default.removeItem(at: fixture.url.appending(path: "Second.md"))
        try await indexer.removeDeletedNotes(existingNoteIDs: Set(try store.listNotes(in: vault)))

        let deletedBacklinks = try await indexStore.backlinks(to: NoteID("Second.md"))
        XCTAssertEqual(deletedBacklinks, [])
    }

    func testEmbedsCanCreateBacklinks() async throws {
        let fixture = try TempVault()
        try fixture.write("Home.md", "# Home\n![[Project]]\n")
        try fixture.write("Project.md", "# Project\n")

        let store = VaultStore()
        let vault = try store.openVault(at: fixture.url)
        let indexStore = try makeIndexStore()
        let indexer = VaultIndexer(store: store, indexStore: indexStore)

        try await indexer.rebuild(in: vault)

        let backlinks = try await indexStore.backlinks(to: NoteID("Project.md"))
        XCTAssertEqual(backlinks.map(\.source), [NoteID("Home.md")])
    }

    private func makeIndexStore() throws -> VaultIndexStore {
        let directory = FileManager.default.temporaryDirectory.appending(path: "EpheMacIndexTests-\(UUID().uuidString)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: directory, withIntermediateDirectories: true)
        return VaultIndexStore(databaseURL: directory.appending(path: "index.sqlite"))
    }
}
