import XCTest
@testable import EpheMac

final class MarkdownIndexerTests: XCTestCase {
    func testParseWikiLinksWithHeadingAndAlias() {
        let indexer = MarkdownIndexer()
        let links = indexer.parseWikiLinks(in: "[[Daily]] [[Daily#Tasks]] [[Daily|Today]] [[Daily#Tasks|Today tasks]]")

        XCTAssertEqual(links.map(\.target), ["Daily", "Daily", "Daily", "Daily"])
        XCTAssertEqual(links.map(\.heading), [nil, "Tasks", nil, "Tasks"])
        XCTAssertEqual(links.map(\.alias), [nil, nil, "Today", "Today tasks"])
    }

    func testHeadingParsing() {
        let indexer = MarkdownIndexer()
        XCTAssertEqual(indexer.parseHeadings(in: "# Title\nText\n## Tasks\n#### Deep"), ["Title", "Tasks", "Deep"])
    }

    func testResolveExactRelativeThenBasename() {
        let indexer = MarkdownIndexer()
        let entries: [NoteID: NoteIndexEntry] = [
            NoteID("Folder/Source.md"): entry("Folder/Source.md"),
            NoteID("Folder/Target.md"): entry("Folder/Target.md"),
            NoteID("Other/Unique.md"): entry("Other/Unique.md"),
        ]

        XCTAssertEqual(
            indexer.resolve(WikiLink(target: "Target", heading: nil, alias: nil, sourceRange: TextRange(lowerBound: 0, upperBound: 10)), from: NoteID("Folder/Source.md"), in: entries),
            .resolved(NoteID("Folder/Target.md"))
        )
        XCTAssertEqual(
            indexer.resolve(WikiLink(target: "Unique", heading: nil, alias: nil, sourceRange: TextRange(lowerBound: 0, upperBound: 10)), from: NoteID("Folder/Source.md"), in: entries),
            .resolved(NoteID("Other/Unique.md"))
        )
    }

    func testResolveAmbiguousAndUnresolvedLinks() {
        let indexer = MarkdownIndexer()
        let entries: [NoteID: NoteIndexEntry] = [
            NoteID("A/Dupe.md"): entry("A/Dupe.md"),
            NoteID("B/Dupe.md"): entry("B/Dupe.md"),
        ]

        switch indexer.resolve(WikiLink(target: "Dupe", heading: nil, alias: nil, sourceRange: TextRange(lowerBound: 0, upperBound: 10)), from: NoteID("Home.md"), in: entries) {
        case .ambiguous(let target, let candidates):
            XCTAssertEqual(target, "Dupe")
            XCTAssertEqual(candidates, [NoteID("A/Dupe.md"), NoteID("B/Dupe.md")])
        default:
            XCTFail("Expected ambiguous result")
        }

        XCTAssertEqual(
            indexer.resolve(WikiLink(target: "Missing", heading: nil, alias: nil, sourceRange: TextRange(lowerBound: 0, upperBound: 10)), from: NoteID("Home.md"), in: entries),
            .unresolved("Missing")
        )
    }

    func testBuildIndexCreatesBacklinksAndUnresolvedLinks() throws {
        let fixture = try TempVault()
        try fixture.write("Home.md", "# Home\n[[Project]]\n[[Missing]]")
        try fixture.write("Project.md", "# Project\n")

        let store = VaultStore()
        let vault = try store.openVault(at: fixture.url)
        let index = try MarkdownIndexer(store: store).buildIndex(for: vault)

        XCTAssertEqual(index.backlinks[NoteID("Project.md")]?.first?.source, NoteID("Home.md"))
        XCTAssertEqual(index.unresolvedLinks[NoteID("Home.md")]?.map(\.target), ["Missing"])
    }

    func testBuildSkeletonIndexDoesNotReadMarkdownContent() throws {
        let fixture = try TempVault()
        let fileURL = fixture.url.appending(path: "Broken.md")
        try FileManager.default.createDirectory(at: fileURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try Data([0xFF, 0xFE, 0xFD]).write(to: fileURL)

        let store = VaultStore()
        let vault = try store.openVault(at: fixture.url)
        let index = try MarkdownIndexer(store: store).buildSkeletonIndex(for: vault)

        XCTAssertEqual(index.sortedNotes.map(\.id), [NoteID("Broken.md")])
        XCTAssertEqual(index.entry(for: NoteID("Broken.md"))?.headings, [])
        XCTAssertEqual(index.entry(for: NoteID("Broken.md"))?.searchableText, "Broken\nBroken.md")
    }

    func testSearchUsesTitlePathHeadingAndContent() throws {
        let fixture = try TempVault()
        try fixture.write("Work/Plan.md", "# Roadmap\nship the native app")

        let store = VaultStore()
        let vault = try store.openVault(at: fixture.url)
        let index = try MarkdownIndexer(store: store).buildIndex(for: vault)
        let results = MarkdownIndexer(store: store).search("native", in: index)

        XCTAssertEqual(results.map(\.id), [NoteID("Work/Plan.md")])
    }

    private func entry(_ path: String) -> NoteIndexEntry {
        let id = NoteID(path)
        return NoteIndexEntry(id: id, title: id.title, modifiedAt: Date(), headings: [], outgoingLinks: [], searchableText: id.rawValue)
    }
}
