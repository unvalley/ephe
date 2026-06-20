import Foundation

enum VaultIndexSnapshotSource: Sendable {
    case sqliteCache
    case filesystemSkeleton
}

struct VaultIndexSnapshot: Sendable {
    var index: VaultIndex
    var sortedNotes: [NoteIndexEntry]
    var source: VaultIndexSnapshotSource
}

struct VaultLoadingService: Sendable {
    private let store: VaultStore
    private let indexer: MarkdownIndexer
    private let indexStore: VaultIndexStore?

    init(store: VaultStore, indexer: MarkdownIndexer, indexStore: VaultIndexStore?) {
        self.store = store
        self.indexer = indexer
        self.indexStore = indexStore
    }

    func cachedSnapshot() async throws -> VaultIndexSnapshot? {
        guard let indexStore else { return nil }
        let entries = try await indexStore.allNotes()
        guard !entries.isEmpty else { return nil }
        return snapshot(from: entries, source: .sqliteCache)
    }

    func filesystemSkeletonSnapshot(for vault: Vault) throws -> VaultIndexSnapshot {
        let noteFiles = try store.listNoteFiles(in: vault)
        let index = try indexer.buildSkeletonIndex(from: noteFiles)
        return VaultIndexSnapshot(index: index, sortedNotes: index.sortedNotes, source: .filesystemSkeleton)
    }

    func snapshot(from entries: [NoteIndexEntry], source: VaultIndexSnapshotSource) -> VaultIndexSnapshot {
        var notes: [NoteID: NoteIndexEntry] = [:]
        notes.reserveCapacity(entries.count)
        for entry in entries {
            notes[entry.id] = entry
        }
        let index = VaultIndex(
            notes: notes,
            backlinks: [:],
            unresolvedLinks: [:],
            ambiguousLinks: [:]
        )
        return VaultIndexSnapshot(index: index, sortedNotes: entries, source: source)
    }
}
