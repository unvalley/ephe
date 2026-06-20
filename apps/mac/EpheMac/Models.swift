import Foundation

struct Vault: Equatable, Sendable {
    var rootURL: URL
    var displayName: String
    var securityScopedBookmark: Data?
}

struct NoteID: Hashable, Identifiable, Comparable, Sendable {
    var rawValue: String

    var id: String { rawValue }
    var title: String {
        let name = URL(fileURLWithPath: rawValue).deletingPathExtension().lastPathComponent
        return name.isEmpty ? "Untitled" : name
    }

    init(_ rawValue: String) {
        self.rawValue = NoteID.normalize(rawValue)
    }

    init(rootURL: URL, fileURL: URL) {
        let rootPath = rootURL.resolvingSymlinksInPath().standardizedFileURL.path(percentEncoded: false).removingTrailingSlash
        let filePath = fileURL.resolvingSymlinksInPath().standardizedFileURL.path(percentEncoded: false).removingTrailingSlash
        let relative: String
        if filePath.hasPrefix(rootPath + "/") {
            relative = String(filePath.dropFirst(rootPath.count + 1))
        } else {
            relative = fileURL.lastPathComponent
        }
        self.init(relative)
    }

    static func < (lhs: NoteID, rhs: NoteID) -> Bool {
        lhs.rawValue.localizedStandardCompare(rhs.rawValue) == .orderedAscending
    }

    static func normalize(_ path: String) -> String {
        var components: [String] = []
        for component in path.replacingOccurrences(of: "\\", with: "/").split(separator: "/") {
            switch component {
            case ".", "":
                continue
            case "..":
                if !components.isEmpty {
                    components.removeLast()
                }
            default:
                components.append(String(component))
            }
        }
        var normalized = components.joined(separator: "/")
        if !normalized.lowercased().hasSuffix(".md") {
            normalized += ".md"
        }
        return normalized
    }

    func fileURL(in vault: Vault) -> URL {
        vault.rootURL.appending(path: rawValue)
    }
}

private extension String {
    var removingTrailingSlash: String {
        guard count > 1, hasSuffix("/") else { return self }
        return String(dropLast())
    }
}

struct NoteDocument: Identifiable, Equatable, Sendable {
    var id: NoteID
    var content: String
    var modifiedAt: Date
    var isDirty: Bool

    var title: String { id.title }
}

struct NoteFileInfo: Equatable, Sendable {
    var id: NoteID
    var modifiedAt: Date
}

struct NoteIndexMetadata: Equatable, Sendable {
    var id: NoteID
    var modifiedAt: Date
    var size: Int64
}

struct TextRange: Equatable, Sendable {
    var lowerBound: Int
    var upperBound: Int
}

struct WikiLink: Identifiable, Equatable, Sendable {
    var id = UUID()
    var target: String
    var heading: String?
    var alias: String?
    var sourceRange: TextRange

    var displayText: String {
        alias ?? heading.map { "\(target)#\($0)" } ?? target
    }
}

enum LinkResolution: Equatable, Sendable {
    case resolved(NoteID)
    case unresolved(String)
    case ambiguous(String, [NoteID])
}

struct NoteIndexEntry: Identifiable, Equatable, Sendable {
    var id: NoteID
    var title: String
    var modifiedAt: Date
    var headings: [String]
    var outgoingLinks: [WikiLink]
    var searchableText: String
}

struct Backlink: Identifiable, Equatable, Sendable {
    var id = UUID()
    var source: NoteID
    var link: WikiLink
}

struct VaultIndex: Sendable {
    var notes: [NoteID: NoteIndexEntry]
    var backlinks: [NoteID: [Backlink]]
    var unresolvedLinks: [NoteID: [WikiLink]]
    var ambiguousLinks: [NoteID: [(WikiLink, [NoteID])]]

    static let empty = VaultIndex(notes: [:], backlinks: [:], unresolvedLinks: [:], ambiguousLinks: [:])

    var sortedNotes: [NoteIndexEntry] {
        notes.values.sorted { $0.id < $1.id }
    }

    func entry(for noteID: NoteID?) -> NoteIndexEntry? {
        guard let noteID else { return nil }
        return notes[noteID]
    }
}
