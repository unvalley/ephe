import Foundation

final class MarkdownIndexer: @unchecked Sendable {
    private let store: VaultStore
    private let searchableContentLimit = 4_000

    init(store: VaultStore = VaultStore()) {
        self.store = store
    }

    func parseWikiLinks(in content: String) -> [WikiLink] {
        let pattern = #"\[\[([^\[\]\n]+)\]\]"#
        guard let regex = try? NSRegularExpression(pattern: pattern) else { return [] }
        let nsRange = NSRange(content.startIndex..<content.endIndex, in: content)
        return regex.matches(in: content, range: nsRange).compactMap { match in
            guard
                let wholeRange = Range(match.range(at: 0), in: content),
                let bodyRange = Range(match.range(at: 1), in: content)
            else {
                return nil
            }

            let body = String(content[bodyRange]).trimmingCharacters(in: .whitespacesAndNewlines)
            let aliasSplit = body.split(separator: "|", maxSplits: 1, omittingEmptySubsequences: false)
            let targetAndHeading = String(aliasSplit.first ?? "")
            let alias = aliasSplit.count == 2 ? String(aliasSplit[1]).trimmingCharacters(in: .whitespacesAndNewlines) : nil
            let headingSplit = targetAndHeading.split(separator: "#", maxSplits: 1, omittingEmptySubsequences: false)
            let target = String(headingSplit.first ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
            let heading = headingSplit.count == 2 ? String(headingSplit[1]).trimmingCharacters(in: .whitespacesAndNewlines) : nil

            guard !target.isEmpty else { return nil }
            return WikiLink(
                target: target,
                heading: heading?.nilIfEmpty,
                alias: alias?.nilIfEmpty,
                sourceRange: TextRange(
                    lowerBound: content.distance(from: content.startIndex, to: wholeRange.lowerBound),
                    upperBound: content.distance(from: content.startIndex, to: wholeRange.upperBound)
                )
            )
        }
    }

    func parseHeadings(in content: String) -> [String] {
        return content
            .components(separatedBy: .newlines)
            .compactMap { line in
                let trimmed = line.trimmingCharacters(in: .whitespaces)
                guard trimmed.hasPrefix("#") else { return nil }
                let hashes = trimmed.prefix { $0 == "#" }.count
                guard (1...6).contains(hashes), trimmed.dropFirst(hashes).first == " " else { return nil }
                return String(trimmed.dropFirst(hashes + 1)).trimmingCharacters(in: .whitespaces).nilIfEmpty
            }
    }

    func buildIndex(for vault: Vault) throws -> VaultIndex {
        try buildIndex(for: vault, noteFiles: store.listNoteFiles(in: vault))
    }

    func buildIndex(for vault: Vault, noteFiles: [NoteFileInfo]) throws -> VaultIndex {
        var entries: [NoteID: NoteIndexEntry] = [:]

        for noteFile in noteFiles {
            try Task.checkCancellation()
            let document = try store.readNote(noteFile.id, in: vault)
            let links = parseWikiLinks(in: document.content)
            let headings = parseHeadings(in: document.content)
            entries[noteFile.id] = NoteIndexEntry(
                id: noteFile.id,
                title: document.title,
                modifiedAt: document.modifiedAt,
                headings: headings,
                outgoingLinks: links,
                searchableText: searchableText(for: document, headings: headings)
            )
        }

        var backlinks: [NoteID: [Backlink]] = [:]
        var unresolved: [NoteID: [WikiLink]] = [:]
        var ambiguous: [NoteID: [(WikiLink, [NoteID])]] = [:]
        let basenameIndex = makeBasenameIndex(from: entries)

        for entry in entries.values {
            try Task.checkCancellation()
            for link in entry.outgoingLinks {
                switch resolve(link, from: entry.id, in: entries, basenameIndex: basenameIndex) {
                case .resolved(let destination):
                    backlinks[destination, default: []].append(Backlink(source: entry.id, link: link))
                case .unresolved:
                    unresolved[entry.id, default: []].append(link)
                case .ambiguous(_, let candidates):
                    ambiguous[entry.id, default: []].append((link, candidates))
                }
            }
        }

        return VaultIndex(notes: entries, backlinks: backlinks, unresolvedLinks: unresolved, ambiguousLinks: ambiguous)
    }

    func buildSkeletonIndex(for vault: Vault) throws -> VaultIndex {
        try buildSkeletonIndex(from: store.listNoteFiles(in: vault))
    }

    func buildSkeletonIndex(from noteFiles: [NoteFileInfo]) throws -> VaultIndex {
        let entries = try noteFiles.reduce(into: [NoteID: NoteIndexEntry]()) { result, noteFile in
            try Task.checkCancellation()
            result[noteFile.id] = NoteIndexEntry(
                id: noteFile.id,
                title: noteFile.id.title,
                modifiedAt: noteFile.modifiedAt,
                headings: [],
                outgoingLinks: [],
                searchableText: "\(noteFile.id.title)\n\(noteFile.id.rawValue)"
            )
        }
        return VaultIndex(notes: entries, backlinks: [:], unresolvedLinks: [:], ambiguousLinks: [:])
    }

    func resolve(_ link: WikiLink, from source: NoteID, in entries: [NoteID: NoteIndexEntry]) -> LinkResolution {
        resolve(link, from: source, in: entries, basenameIndex: makeBasenameIndex(from: entries))
    }

    private func resolve(
        _ link: WikiLink,
        from source: NoteID,
        in entries: [NoteID: NoteIndexEntry],
        basenameIndex: [String: [NoteID]]
    ) -> LinkResolution {
        let target = link.target.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !target.isEmpty else { return .unresolved(link.target) }

        let sourceFolder = source.rawValue.split(separator: "/").dropLast().joined(separator: "/")
        let relativeTarget = sourceFolder.isEmpty || target.contains("/")
            ? target
            : "\(sourceFolder)/\(target)"

        let exact = NoteID.normalize(relativeTarget)
        let exactID = NoteID(exact)
        if entries[exactID] != nil {
            return .resolved(exactID)
        }

        let targetWithExtension = target.lowercased().hasSuffix(".md") ? target : "\(target).md"
        let basename = URL(fileURLWithPath: targetWithExtension).deletingPathExtension().lastPathComponent
        let candidates = basenameIndex[basename, default: []]
        if candidates.count == 1, let first = candidates.first {
            return .resolved(first)
        }
        if candidates.count > 1 {
            return .ambiguous(target, candidates)
        }
        return .unresolved(target)
    }

    func search(_ query: String, in index: VaultIndex) -> [NoteIndexEntry] {
        let trimmed = query.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else { return index.sortedNotes }
        let needle = trimmed.lowercased()
        return index.sortedNotes
            .map { entry in (entry, score: fuzzyScore(needle: needle, haystack: entry.searchableText.lowercased())) }
            .filter { $0.score > 0 }
            .sorted(by: { left, right in
                if left.score == right.score { return left.0.id < right.0.id }
                return left.score > right.score
            })
            .map { $0.0 }
    }

    private func searchableText(for document: NoteDocument, headings: [String]) -> String {
        let searchableContent = String(document.content.prefix(searchableContentLimit))
        return ([document.title, document.id.rawValue] + headings + [searchableContent]).joined(separator: "\n")
    }

    private func makeBasenameIndex(from entries: [NoteID: NoteIndexEntry]) -> [String: [NoteID]] {
        var index: [String: [NoteID]] = [:]
        for noteID in entries.keys {
            index[noteID.title, default: []].append(noteID)
        }
        for key in index.keys {
            index[key]?.sort()
        }
        return index
    }

    private func fuzzyScore(needle: String, haystack: String) -> Int {
        if haystack.contains(needle) {
            return 100 + needle.count
        }
        var score = 0
        var searchStart = haystack.startIndex
        for character in needle {
            guard let found = haystack[searchStart...].firstIndex(of: character) else {
                return 0
            }
            score += found == searchStart ? 3 : 1
            searchStart = haystack.index(after: found)
        }
        return score
    }
}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
