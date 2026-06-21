import Foundation

actor VaultIndexer {
    private let store: VaultStore
    private let indexStore: VaultIndexStore
    private let scanner: ObsidianSyntaxScanner
    private let fileManager: FileManager

    init(
        store: VaultStore = VaultStore(),
        indexStore: VaultIndexStore,
        scanner: ObsidianSyntaxScanner = ObsidianSyntaxScanner(),
        fileManager: FileManager = .default
    ) {
        self.store = store
        self.indexStore = indexStore
        self.scanner = scanner
        self.fileManager = fileManager
    }

    func index(noteID: NoteID, in vault: Vault, refreshLinks: Bool = true) async throws {
        try Task.checkCancellation()
        let note = try extract(noteID: noteID, in: vault)
        try await indexStore.upsert(note, refreshLinks: refreshLinks)
    }

    @discardableResult
    func reindexChangedNotes(in vault: Vault) async throws -> Set<NoteID> {
        try Task.checkCancellation()
        let noteFiles = try store.listNoteFiles(in: vault)
        let indexedMetadata = try await indexStore.noteMetadata()
        guard !indexedMetadata.isEmpty else {
            try await rebuild(in: vault, noteFiles: noteFiles)
            return Set(noteFiles.map(\.id))
        }
        var changed = false
        for noteFile in noteFiles {
            try Task.checkCancellation()
            if shouldIndex(noteFile: noteFile, indexedMetadata: indexedMetadata) {
                changed = true
                try await index(noteID: noteFile.id, in: vault, refreshLinks: false)
            }
            await Task.yield()
        }
        if changed {
            try await indexStore.refreshResolvedLinks()
        }
        return Set(noteFiles.map(\.id))
    }

    func removeDeletedNotes(existingNoteIDs: Set<NoteID>) async throws {
        let indexedNotes = try await indexStore.allNotes().map(\.id)
        var removed = false
        for noteID in indexedNotes where !existingNoteIDs.contains(noteID) {
            try Task.checkCancellation()
            removed = true
            try await indexStore.remove(noteID: noteID, refreshLinks: false)
        }
        if removed {
            try await indexStore.refreshResolvedLinks()
        }
    }

    func rebuild(in vault: Vault) async throws {
        try Task.checkCancellation()
        let noteFiles = try store.listNoteFiles(in: vault)
        try await rebuild(in: vault, noteFiles: noteFiles)
    }

    private func rebuild(in vault: Vault, noteFiles: [NoteFileInfo]) async throws {
        var notes: [NoteIndex] = []
        notes.reserveCapacity(noteFiles.count)
        for noteFile in noteFiles {
            try Task.checkCancellation()
            notes.append(try extract(noteID: noteFile.id, in: vault))
            await Task.yield()
        }
        try await indexStore.replaceAll(with: notes)
    }

    private func shouldIndex(noteFile: NoteFileInfo, indexedMetadata: [NoteID: NoteIndexMetadata]) -> Bool {
        guard let indexed = indexedMetadata[noteFile.id] else { return true }
        return indexed.size != noteFile.size || abs(indexed.modifiedAt.timeIntervalSince(noteFile.modifiedAt)) > 0.001
    }

    private func extract(noteID: NoteID, in vault: Vault) throws -> NoteIndex {
        let url = noteID.fileURL(in: vault)
        let values = try url.resourceValues(forKeys: [.contentModificationDateKey, .fileSizeKey])
        let content = try MarkdownFileReader.readString(from: url)
        return scanner.scan(
            content: content,
            noteID: noteID,
            modifiedAt: values.contentModificationDate ?? Date.distantPast,
            size: Int64(values.fileSize ?? 0)
        )
    }
}
