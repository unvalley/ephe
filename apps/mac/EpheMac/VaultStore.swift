import Foundation

enum MarkdownFileReader {
    static func readString(from url: URL) throws -> String {
        let data = try Data(contentsOf: url, options: [.mappedIfSafe])
        if let content = String(data: data, encoding: .utf8) {
            return content
        }
        return String(decoding: data, as: UTF8.self)
    }
}

enum VaultStoreError: LocalizedError, Equatable {
    case notMarkdownFile
    case outsideVault
    case noteAlreadyExists(NoteID)
    case noteNotFound(NoteID)
    case ambiguousNoteName(String)

    var errorDescription: String? {
        switch self {
        case .notMarkdownFile:
            "Only Markdown files are supported."
        case .outsideVault:
            "The selected file is outside the current vault."
        case .noteAlreadyExists(let noteID):
            "A note already exists at \(noteID.rawValue)."
        case .noteNotFound(let noteID):
            "Could not find \(noteID.rawValue)."
        case .ambiguousNoteName(let name):
            "Multiple notes match \(name)."
        }
    }
}

final class VaultStore: @unchecked Sendable {
    private let fileManager: FileManager

    init(fileManager: FileManager = .default) {
        self.fileManager = fileManager
    }

    func openVault(at url: URL) throws -> Vault {
        let resolvedURL = url.resolvingSymlinksInPath().standardizedFileURL
        return Vault(rootURL: resolvedURL, displayName: resolvedURL.lastPathComponent, securityScopedBookmark: nil)
    }

    func reopenVault(from bookmark: Data) throws -> Vault {
        var stale = false
        let url = try URL(resolvingBookmarkData: bookmark, options: [.withSecurityScope], relativeTo: nil, bookmarkDataIsStale: &stale)
        let resolvedURL = url.resolvingSymlinksInPath().standardizedFileURL
        let refreshed = stale ? try? resolvedURL.bookmarkData(options: [.withSecurityScope], includingResourceValuesForKeys: nil, relativeTo: nil) : bookmark
        return Vault(rootURL: resolvedURL, displayName: resolvedURL.lastPathComponent, securityScopedBookmark: refreshed)
    }

    func securityScopedBookmark(for vault: Vault) throws -> Data {
        try vault.rootURL.bookmarkData(options: [.withSecurityScope], includingResourceValuesForKeys: nil, relativeTo: nil)
    }

    func listNotes(in vault: Vault) throws -> [NoteID] {
        try listNoteFiles(in: vault).map(\.id)
    }

    func listNoteFiles(in vault: Vault) throws -> [NoteFileInfo] {
        guard let enumerator = fileManager.enumerator(
            at: vault.rootURL,
            includingPropertiesForKeys: [.isDirectoryKey, .contentModificationDateKey, .fileSizeKey],
            options: [.skipsHiddenFiles, .skipsPackageDescendants]
        ) else {
            return []
        }

        var notes: [NoteFileInfo] = []
        for case let url as URL in enumerator {
            let resourceValues = try url.resourceValues(forKeys: [.isDirectoryKey, .contentModificationDateKey, .fileSizeKey])
            if resourceValues.isDirectory == true {
                continue
            }
            guard url.pathExtension.lowercased() == "md" else { continue }
            notes.append(NoteFileInfo(
                id: NoteID(rootURL: vault.rootURL, fileURL: url),
                modifiedAt: resourceValues.contentModificationDate ?? Date.distantPast,
                size: Int64(resourceValues.fileSize ?? 0)
            ))
        }
        return notes.sorted { $0.id < $1.id }
    }

    func readNote(_ noteID: NoteID, in vault: Vault) throws -> NoteDocument {
        let url = noteID.fileURL(in: vault)
        guard fileManager.fileExists(atPath: url.path(percentEncoded: false)) else {
            throw VaultStoreError.noteNotFound(noteID)
        }
        let values = try url.resourceValues(forKeys: [.creationDateKey, .contentModificationDateKey])
        let content = try MarkdownFileReader.readString(from: url)
        return NoteDocument(
            id: noteID,
            content: content,
            createdAt: values.creationDate,
            modifiedAt: values.contentModificationDate ?? Date(),
            isDirty: false
        )
    }

    func writeNote(_ document: NoteDocument, in vault: Vault) throws -> NoteDocument {
        try writeContent(document.content, to: document.id, in: vault)
        return try readNote(document.id, in: vault)
    }

    func writeContent(_ content: String, to noteID: NoteID, in vault: Vault) throws {
        let url = noteID.fileURL(in: vault)
        try ensureInsideVault(url, vault: vault)
        try fileManager.createDirectory(at: url.deletingLastPathComponent(), withIntermediateDirectories: true)
        let existingCreationDate = try? url.resourceValues(forKeys: [.creationDateKey]).creationDate

        let tempURL = url.deletingLastPathComponent().appending(path: ".\(url.lastPathComponent).tmp-\(UUID().uuidString)")
        try content.write(to: tempURL, atomically: true, encoding: .utf8)
        if fileManager.fileExists(atPath: url.path(percentEncoded: false)) {
            _ = try fileManager.replaceItemAt(url, withItemAt: tempURL, backupItemName: nil, options: [.usingNewMetadataOnly])
        } else {
            try fileManager.moveItem(at: tempURL, to: url)
        }
        if let existingCreationDate {
            try? fileManager.setAttributes([.creationDate: existingCreationDate], ofItemAtPath: url.path(percentEncoded: false))
        }
    }

    func createNote(named rawName: String, near source: NoteID?, in vault: Vault) throws -> NoteDocument {
        let cleanName = rawName.trimmingCharacters(in: .whitespacesAndNewlines)
        let relativeBase: String
        if cleanName.contains("/") {
            relativeBase = cleanName
        } else if let source {
            let parent = source.rawValue.split(separator: "/").dropLast().joined(separator: "/")
            relativeBase = parent.isEmpty ? cleanName : "\(parent)/\(cleanName)"
        } else {
            relativeBase = cleanName
        }

        let noteID = NoteID(relativeBase)
        let url = noteID.fileURL(in: vault)
        try ensureInsideVault(url, vault: vault)
        if fileManager.fileExists(atPath: url.path(percentEncoded: false)) {
            throw VaultStoreError.noteAlreadyExists(noteID)
        }
        try writeContent("# \(noteID.title)\n", to: noteID, in: vault)
        return try readNote(noteID, in: vault)
    }

    func renameNote(_ noteID: NoteID, to rawName: String, in vault: Vault) throws -> NoteID {
        let destinationID = NoteID(rawName)
        let sourceURL = noteID.fileURL(in: vault)
        let destinationURL = destinationID.fileURL(in: vault)
        guard fileManager.fileExists(atPath: sourceURL.path(percentEncoded: false)) else {
            throw VaultStoreError.noteNotFound(noteID)
        }
        if fileManager.fileExists(atPath: destinationURL.path(percentEncoded: false)) {
            throw VaultStoreError.noteAlreadyExists(destinationID)
        }
        try ensureInsideVault(destinationURL, vault: vault)
        try fileManager.createDirectory(at: destinationURL.deletingLastPathComponent(), withIntermediateDirectories: true)
        try fileManager.moveItem(at: sourceURL, to: destinationURL)
        return destinationID
    }

    func deleteNote(_ noteID: NoteID, in vault: Vault) throws {
        let url = noteID.fileURL(in: vault)
        guard fileManager.fileExists(atPath: url.path(percentEncoded: false)) else {
            throw VaultStoreError.noteNotFound(noteID)
        }
        try fileManager.removeItem(at: url)
    }

    private func ensureInsideVault(_ fileURL: URL, vault: Vault) throws {
        let root = vault.rootURL.resolvingSymlinksInPath().standardizedFileURL.path(percentEncoded: false).removingTrailingSlash
        let path = fileURL.resolvingSymlinksInPath().standardizedFileURL.path(percentEncoded: false).removingTrailingSlash
        guard path == root || path.hasPrefix(root + "/") else {
            throw VaultStoreError.outsideVault
        }
        guard fileURL.pathExtension.lowercased() == "md" else {
            throw VaultStoreError.notMarkdownFile
        }
    }
}

private extension String {
    var removingTrailingSlash: String {
        guard count > 1, hasSuffix("/") else { return self }
        return String(dropLast())
    }
}
