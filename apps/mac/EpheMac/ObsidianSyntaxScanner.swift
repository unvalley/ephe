import Foundation

struct ExtractedHeading: Equatable, Sendable {
    var level: Int
    var text: String
    var line: Int
}

enum ExtractedLinkKind: String, Sendable {
    case markdown
    case wiki
    case embed
}

struct ExtractedLink: Equatable, Sendable {
    var kind: ExtractedLinkKind
    var target: String
    var heading: String?
    var alias: String?
    var range: TextRange
}

struct ExtractedTag: Equatable, Sendable {
    var name: String
    var range: TextRange
}

struct NoteIndex: Equatable, Sendable {
    var id: NoteID
    var title: String
    var modifiedAt: Date
    var size: Int64
    var headings: [ExtractedHeading]
    var links: [ExtractedLink]
    var tags: [ExtractedTag]
    var searchableText: String
}

struct ObsidianSyntaxScanner: Sendable {
    private static let markdownLinkRegex = try! NSRegularExpression(pattern: #"!?\[([^\]\n]+)\]\(([^)\s]+)\)"#)
    private static let obsidianLinkRegex = try! NSRegularExpression(pattern: #"(!?)\[\[([^\[\]\n]+)\]\]"#)
    private static let tagRegex = try! NSRegularExpression(pattern: #"(?<![\w/#])#([A-Za-z0-9_\-/]+)"#)

    func scan(content: String, noteID: NoteID, modifiedAt: Date, size: Int64) -> NoteIndex {
        let headings = extractHeadings(from: content)
        let markdownLinks = extractMarkdownLinks(from: content)
        let obsidianLinks = extractObsidianLinks(from: content)
        let tags = extractTags(from: content)
        let title = headings.first?.text ?? noteID.title
        let searchableText = ([title, noteID.rawValue] + headings.map(\.text) + tags.map(\.name) + [String(content.prefix(4_000))])
            .joined(separator: "\n")

        return NoteIndex(
            id: noteID,
            title: title,
            modifiedAt: modifiedAt,
            size: size,
            headings: headings,
            links: markdownLinks + obsidianLinks,
            tags: tags,
            searchableText: searchableText
        )
    }

    func extractHeadings(from content: String) -> [ExtractedHeading] {
        content.components(separatedBy: .newlines).enumerated().compactMap { index, line in
            let trimmed = line.trimmingCharacters(in: .whitespaces)
            guard trimmed.hasPrefix("#") else { return nil }
            let level = trimmed.prefix { $0 == "#" }.count
            guard (1...6).contains(level), trimmed.dropFirst(level).first == " " else { return nil }
            let text = String(trimmed.dropFirst(level + 1)).trimmingCharacters(in: .whitespaces)
            guard !text.isEmpty else { return nil }
            return ExtractedHeading(level: level, text: text, line: index + 1)
        }
    }

    func extractMarkdownLinks(from content: String) -> [ExtractedLink] {
        let range = NSRange(content.startIndex..<content.endIndex, in: content)
        return Self.markdownLinkRegex.matches(in: content, range: range).compactMap { match in
            guard
                let wholeRange = Range(match.range(at: 0), in: content),
                let destinationRange = Range(match.range(at: 2), in: content)
            else { return nil }

            return ExtractedLink(
                kind: .markdown,
                target: String(content[destinationRange]),
                heading: nil,
                alias: nil,
                range: TextRange(
                    lowerBound: content.distance(from: content.startIndex, to: wholeRange.lowerBound),
                    upperBound: content.distance(from: content.startIndex, to: wholeRange.upperBound)
                )
            )
        }
    }

    func extractObsidianLinks(from content: String) -> [ExtractedLink] {
        let range = NSRange(content.startIndex..<content.endIndex, in: content)
        return Self.obsidianLinkRegex.matches(in: content, range: range).compactMap { match in
            guard
                let wholeRange = Range(match.range(at: 0), in: content),
                let embedRange = Range(match.range(at: 1), in: content),
                let bodyRange = Range(match.range(at: 2), in: content)
            else { return nil }

            let parsed = parseWikiBody(String(content[bodyRange]))
            guard !parsed.target.isEmpty else { return nil }
            return ExtractedLink(
                kind: content[embedRange].isEmpty ? .wiki : .embed,
                target: parsed.target,
                heading: parsed.heading,
                alias: parsed.alias,
                range: TextRange(
                    lowerBound: content.distance(from: content.startIndex, to: wholeRange.lowerBound),
                    upperBound: content.distance(from: content.startIndex, to: wholeRange.upperBound)
                )
            )
        }
    }

    func extractTags(from content: String) -> [ExtractedTag] {
        let range = NSRange(content.startIndex..<content.endIndex, in: content)
        return Self.tagRegex.matches(in: content, range: range).compactMap { match in
            guard
                let wholeRange = Range(match.range(at: 0), in: content),
                let tagRange = Range(match.range(at: 1), in: content)
            else { return nil }

            let tag = String(content[tagRange]).trimmingCharacters(in: .whitespacesAndNewlines)
            guard !tag.isEmpty else { return nil }
            return ExtractedTag(
                name: tag,
                range: TextRange(
                    lowerBound: content.distance(from: content.startIndex, to: wholeRange.lowerBound),
                    upperBound: content.distance(from: content.startIndex, to: wholeRange.upperBound)
                )
            )
        }
    }

    private func parseWikiBody(_ body: String) -> (target: String, heading: String?, alias: String?) {
        let trimmed = body.trimmingCharacters(in: .whitespacesAndNewlines)
        let aliasSplit = trimmed.split(separator: "|", maxSplits: 1, omittingEmptySubsequences: false)
        let targetAndHeading = String(aliasSplit.first ?? "")
        let alias = aliasSplit.count == 2 ? String(aliasSplit[1]).trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty : nil
        let headingSplit = targetAndHeading.split(separator: "#", maxSplits: 1, omittingEmptySubsequences: false)
        let target = String(headingSplit.first ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let heading = headingSplit.count == 2 ? String(headingSplit[1]).trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty : nil
        return (target, heading, alias)
    }
}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
