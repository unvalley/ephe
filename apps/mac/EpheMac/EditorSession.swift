import AppKit
import Combine
import Foundation

@MainActor
final class EditorSession: ObservableObject {
    @Published private(set) var vault: Vault?
    @Published private(set) var index: VaultIndex = .empty
    @Published var selectedNoteID: NoteID?
    @Published var document: NoteDocument?
    @Published var searchQuery = "" {
        didSet {
            scheduleSearchQuery()
        }
    }
    @Published var statusMessage: String?
    @Published var commandPalettePresented = false
    @Published var conflictMessage: String?
    @Published private(set) var isIndexing = false
    @Published private(set) var isLoadingDocument = false
    @Published private(set) var canNavigateBack = false
    @Published private(set) var canNavigateForward = false
    @Published private(set) var pinnedNoteIDs: Set<NoteID> = []
    @Published private var sortedNotesCache: [NoteIndexEntry] = []
    @Published private var sqliteBacklinks: [Backlink] = []
    @Published private var sqliteSearchResults: [NoteIndexEntry]?

    private let store: VaultStore
    private let indexer: MarkdownIndexer
    private let watcher: DirectoryWatcher
    private let makeIndexStore: (Vault) throws -> VaultIndexStore
    private let userDefaults: UserDefaults
    private var indexStore: VaultIndexStore?
    private var vaultIndexer: VaultIndexer?
    private var autosaveTask: Task<Void, Never>?
    private var reloadTask: Task<Void, Never>?
    private var derivedIndexTask: Task<Void, Never>?
    private var backlinkQueryTask: Task<Void, Never>?
    private var searchQueryTask: Task<Void, Never>?
    private var noteLoadTask: Task<Void, Never>?
    private var documentIndexTask: Task<Void, Never>?
    private var bookmarkTask: Task<Void, Never>?
    private var reloadGeneration = 0
    private var selectionGeneration = 0
    private var hasSecurityScopeAccess = false
    private var backHistory: [NoteID] = []
    private var forwardHistory: [NoteID] = []
    private let maxNavigationHistory = 100

    init(
        store: VaultStore = VaultStore(),
        indexer: MarkdownIndexer? = nil,
        watcher: DirectoryWatcher = DirectoryWatcher(),
        userDefaults: UserDefaults = .standard,
        makeIndexStore: @escaping (Vault) throws -> VaultIndexStore = { vault in
            VaultIndexStore(databaseURL: try VaultIndexStore.defaultDatabaseURL(for: vault))
        }
    ) {
        self.store = store
        self.indexer = indexer ?? MarkdownIndexer(store: store)
        self.watcher = watcher
        self.userDefaults = userDefaults
        self.makeIndexStore = makeIndexStore
    }

    var filteredNotes: [NoteIndexEntry] {
        let trimmedQuery = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedQuery.isEmpty else {
            return sortedNotesCache
        }
        if let sqliteSearchResults {
            return sqliteSearchResults
        }
        return indexer.search(trimmedQuery, in: index)
    }

    var sidebarNotes: [NoteIndexEntry] {
        filteredNotes.sorted { lhs, rhs in
            let lhsPinned = pinnedNoteIDs.contains(lhs.id)
            let rhsPinned = pinnedNoteIDs.contains(rhs.id)
            if lhsPinned != rhsPinned {
                return lhsPinned
            }
            return lhs.id < rhs.id
        }
    }

    func searchNotes(_ query: String) -> [NoteIndexEntry] {
        indexer.search(query, in: index)
    }

    var selectedEntry: NoteIndexEntry? {
        index.entry(for: selectedNoteID)
    }

    var backlinks: [Backlink] {
        sqliteBacklinks
    }

    var unresolvedLinks: [WikiLink] {
        guard let selectedNoteID else { return [] }
        return index.unresolvedLinks[selectedNoteID, default: []]
    }

    func openVaultWithPanel() {
        let panel = NSOpenPanel()
        panel.canChooseFiles = false
        panel.canChooseDirectories = true
        panel.allowsMultipleSelection = false
        panel.prompt = "Open Vault"
        if panel.runModal() == .OK, let url = panel.url {
            do {
                try openVault(at: url)
            } catch {
                statusMessage = error.localizedDescription
            }
        }
    }

    func openVault(at url: URL) throws {
        releaseSecurityScope()
        let vault = try store.openVault(at: url)
        hasSecurityScopeAccess = vault.rootURL.startAccessingSecurityScopedResource()
        self.vault = vault
        resetNavigationHistory()
        loadPinnedNotes(for: vault)
        configureDerivedIndex(for: vault)
        scheduleBookmarkPersistence(for: vault)
        scheduleReloadIndex(selectFirstIfNeeded: false)
        watcher.startWatching(url: vault.rootURL) { [weak self] in
            Task { @MainActor in
                self?.scheduleReloadIndex(selectFirstIfNeeded: false)
            }
        }
    }

    func reopenLastVaultIfAvailable() {
        guard let bookmark = userDefaults.data(forKey: "ephe.mac.lastVaultBookmark") else { return }
        do {
            releaseSecurityScope()
            let vault = try store.reopenVault(from: bookmark)
            hasSecurityScopeAccess = vault.rootURL.startAccessingSecurityScopedResource()
            self.vault = vault
            resetNavigationHistory()
            loadPinnedNotes(for: vault)
            configureDerivedIndex(for: vault)
            scheduleBookmarkPersistence(for: vault)
            scheduleReloadIndex(selectFirstIfNeeded: false)
            watcher.startWatching(url: vault.rootURL) { [weak self] in
                Task { @MainActor in
                    self?.scheduleReloadIndex(selectFirstIfNeeded: false)
                }
            }
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    func scheduleReloadIndex(selectFirstIfNeeded: Bool) {
        guard let vault else { return }
        reloadGeneration += 1
        let generation = reloadGeneration
        let loader = VaultLoadingService(store: store, indexer: indexer, indexStore: indexStore)

        reloadTask?.cancel()
        if index.notes.isEmpty {
            isIndexing = true
            statusMessage = "Loading \(vault.displayName)..."
        }

        reloadTask = Task { [weak self] in
            do {
                let cached = try await loader.cachedSnapshot()
                guard !Task.isCancelled else { return }
                if let cached {
                    await MainActor.run {
                        self?.applyReloadedIndexSnapshot(
                            cached,
                            generation: generation,
                            selectFirstIfNeeded: selectFirstIfNeeded
                        )
                    }
                } else {
                    let filesystemSnapshot = try await Task.detached(priority: .utility) {
                        try loader.filesystemSkeletonSnapshot(for: vault)
                    }.value
                    guard !Task.isCancelled else { return }
                    await MainActor.run {
                        self?.applyReloadedIndexSnapshot(
                            filesystemSnapshot,
                            generation: generation,
                            selectFirstIfNeeded: selectFirstIfNeeded
                        )
                    }
                }

                await MainActor.run {
                    guard self?.reloadGeneration == generation else { return }
                    self?.scheduleDerivedIndexRefresh(for: vault)
                }
            } catch is CancellationError {
            } catch {
                await MainActor.run {
                    guard self?.reloadGeneration == generation else { return }
                    self?.isIndexing = false
                    self?.statusMessage = error.localizedDescription
                }
            }
        }
    }

    func selectNote(_ noteID: NoteID) {
        selectNote(
            noteID,
            loadDelay: .zero,
            clearsDocumentBeforeLoad: true,
            showsLoadingDuringDelay: true,
            recordsHistory: true
        )
    }

    func navigateBack() {
        guard let current = selectedNoteID, let previous = backHistory.popLast() else {
            updateNavigationAvailability()
            return
        }
        forwardHistory.append(current)
        updateNavigationAvailability()
        selectNote(
            previous,
            loadDelay: .zero,
            clearsDocumentBeforeLoad: true,
            showsLoadingDuringDelay: true,
            recordsHistory: false
        )
    }

    func navigateForward() {
        guard let current = selectedNoteID, let next = forwardHistory.popLast() else {
            updateNavigationAvailability()
            return
        }
        backHistory.append(current)
        trimNavigationHistory()
        updateNavigationAvailability()
        selectNote(
            next,
            loadDelay: .zero,
            clearsDocumentBeforeLoad: true,
            showsLoadingDuringDelay: true,
            recordsHistory: false
        )
    }

    func isPinned(_ noteID: NoteID) -> Bool {
        pinnedNoteIDs.contains(noteID)
    }

    func togglePin(_ noteID: NoteID) {
        if pinnedNoteIDs.contains(noteID) {
            pinnedNoteIDs.remove(noteID)
        } else {
            pinnedNoteIDs.insert(noteID)
        }
        persistPinnedNotes()
    }

    private func recordNavigationHistory(beforeSelecting noteID: NoteID) {
        guard selectedNoteID != noteID else {
            updateNavigationAvailability()
            return
        }
        if let selectedNoteID, backHistory.last != selectedNoteID {
            backHistory.append(selectedNoteID)
            trimNavigationHistory()
        }
        forwardHistory.removeAll()
        updateNavigationAvailability()
    }

    private func resetNavigationHistory() {
        backHistory.removeAll()
        forwardHistory.removeAll()
        updateNavigationAvailability()
    }

    private func trimNavigationHistory() {
        if backHistory.count > maxNavigationHistory {
            backHistory.removeFirst(backHistory.count - maxNavigationHistory)
        }
        if forwardHistory.count > maxNavigationHistory {
            forwardHistory.removeFirst(forwardHistory.count - maxNavigationHistory)
        }
    }

    private func updateNavigationAvailability() {
        canNavigateBack = !backHistory.isEmpty
        canNavigateForward = !forwardHistory.isEmpty
    }

    func moveSidebarSelection(delta: Int) {
        let notes = sidebarNotes
        guard !notes.isEmpty else { return }
        let currentIndex = selectedNoteID.flatMap { selectedNoteID in
            notes.firstIndex { $0.id == selectedNoteID }
        }
        let proposedIndex: Int
        if let currentIndex {
            proposedIndex = currentIndex + delta
        } else {
            proposedIndex = delta > 0 ? 0 : notes.count - 1
        }
        let boundedIndex = min(max(proposedIndex, 0), notes.count - 1)
        let shouldDebounceLoad = document != nil
        selectNote(
            notes[boundedIndex].id,
            loadDelay: shouldDebounceLoad ? .milliseconds(90) : .zero,
            clearsDocumentBeforeLoad: false,
            showsLoadingDuringDelay: !shouldDebounceLoad,
            recordsHistory: true
        )
    }

    private func selectNote(
        _ noteID: NoteID,
        loadDelay: Duration,
        clearsDocumentBeforeLoad: Bool,
        showsLoadingDuringDelay: Bool,
        recordsHistory: Bool
    ) {
        guard let vault else { return }
        autosaveTask?.cancel()
        noteLoadTask?.cancel()
        documentIndexTask?.cancel()
        selectionGeneration += 1
        let generation = selectionGeneration
        let store = store

        if recordsHistory {
            recordNavigationHistory(beforeSelecting: noteID)
        }
        selectedNoteID = noteID
        isLoadingDocument = showsLoadingDuringDelay && document?.id != noteID
        if clearsDocumentBeforeLoad, document?.id != noteID {
            document = nil
        }
        conflictMessage = nil
        scheduleBacklinkQuery(for: noteID)

        noteLoadTask = Task { [weak self] in
            do {
                if loadDelay != .zero {
                    try await Task.sleep(for: loadDelay)
                }
                guard !Task.isCancelled else { return }
                let shouldLoad = await MainActor.run {
                    guard
                        self?.selectionGeneration == generation,
                        self?.selectedNoteID == noteID
                    else {
                        return false
                    }
                    guard self?.document?.id != noteID else {
                        self?.isLoadingDocument = false
                        return false
                    }
                    self?.isLoadingDocument = true
                    return true
                }
                guard shouldLoad else { return }
                let loadedDocument = try await Task.detached(priority: .userInitiated) {
                    try store.readNote(noteID, in: vault)
                }.value

                await MainActor.run {
                    guard
                        self?.selectionGeneration == generation,
                        self?.selectedNoteID == noteID
                    else {
                        return
                    }
                    self?.document = loadedDocument
                    self?.isLoadingDocument = false
                    self?.scheduleDocumentIndexRefresh(for: loadedDocument)
                    self?.scheduleBacklinkQuery(for: noteID)
                }
            } catch is CancellationError {
            } catch {
                await MainActor.run {
                    guard
                        self?.selectionGeneration == generation,
                        self?.selectedNoteID == noteID
                    else {
                        return
                    }
                    self?.isLoadingDocument = false
                    self?.statusMessage = error.localizedDescription
                }
            }
        }
    }

    func updateContent(_ content: String) {
        guard var document else { return }
        document.content = content
        document.isDirty = true
        self.document = document
        autosaveTask?.cancel()
        autosaveTask = Task { @MainActor [weak self] in
            try? await Task.sleep(for: .milliseconds(700))
            guard !Task.isCancelled else { return }
            try? self?.saveSelectedNote()
        }
    }

    func saveSelectedNote() throws {
        try saveSelectedNote(formatMarkdown: false)
    }

    func formatAndSaveSelectedNote() throws {
        try saveSelectedNote(formatMarkdown: true)
    }

    private func saveSelectedNote(formatMarkdown: Bool) throws {
        guard let vault, let document else { return }
        autosaveTask?.cancel()
        let documentToSave: NoteDocument
        if formatMarkdown {
            var formattedDocument = document
            formattedDocument.content = MarkdownFormatter.format(document.content)
            formattedDocument.isDirty = true
            self.document = formattedDocument
            documentToSave = formattedDocument
        } else {
            documentToSave = document
        }
        let saved = try store.writeNote(documentToSave, in: vault)
        self.document = saved
        conflictMessage = nil
        insertDocumentIntoIndex(saved)
        scheduleDerivedIndexUpdate(for: saved.id)
        statusMessage = formatMarkdown ? "Formatted \(saved.id.rawValue)" : "Saved \(saved.id.rawValue)"
    }

    func renameNote(_ noteID: NoteID, to rawName: String) {
        guard let vault else { return }
        let trimmedName = rawName.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
        guard let trimmedName else { return }

        do {
            if noteID == document?.id, document?.isDirty == true {
                try saveSelectedNote()
            }
            let destinationName = relativeRenamePath(for: noteID, rawName: trimmedName)
            let renamedID = try store.renameNote(noteID, to: destinationName, in: vault)
            if pinnedNoteIDs.remove(noteID) != nil {
                pinnedNoteIDs.insert(renamedID)
                persistPinnedNotes()
            }
            index.notes.removeValue(forKey: noteID)
            if selectedNoteID == noteID {
                selectedNoteID = renamedID
                let renamedDocument = try store.readNote(renamedID, in: vault)
                document = renamedDocument
                insertDocumentIntoIndex(renamedDocument)
                scheduleDocumentIndexRefresh(for: renamedDocument)
                scheduleBacklinkQuery(for: renamedID)
            }
            scheduleReloadIndex(selectFirstIfNeeded: false)
            scheduleDerivedIndexUpdate(for: renamedID)
            statusMessage = "Renamed \(noteID.rawValue) to \(renamedID.rawValue)"
        } catch {
            statusMessage = error.localizedDescription
        }
    }

    func createNote(named name: String? = nil) {
        guard let vault else { return }
        let trimmedName = name?.trimmingCharacters(in: .whitespacesAndNewlines).nilIfEmpty
        let candidateNames: [String]
        if let trimmedName {
            candidateNames = [trimmedName]
        } else {
            candidateNames = (1...999).map { number in
                number == 1 ? "Untitled" : "Untitled \(number)"
            }
        }

        for candidateName in candidateNames {
            do {
                let newDocument = try store.createNote(named: candidateName, near: selectedNoteID, in: vault)
                autosaveTask?.cancel()
                noteLoadTask?.cancel()
                selectionGeneration += 1
                recordNavigationHistory(beforeSelecting: newDocument.id)
                selectedNoteID = newDocument.id
                isLoadingDocument = false
                document = newDocument
                conflictMessage = nil
                insertDocumentIntoIndex(newDocument)
                scheduleDerivedIndexUpdate(for: newDocument.id)
                statusMessage = "Created \(newDocument.id.rawValue)"
                return
            } catch VaultStoreError.noteAlreadyExists where trimmedName == nil {
                continue
            } catch {
                statusMessage = error.localizedDescription
                return
            }
        }
        statusMessage = "Could not find an available Untitled note name."
    }

    func openWikiLink(_ link: WikiLink) {
        guard let selectedNoteID else { return }
        switch indexer.resolve(link, from: selectedNoteID, in: index.notes) {
        case .resolved(let noteID):
            selectNote(noteID)
        case .unresolved:
            createNote(named: link.target)
        case .ambiguous(let target, let candidates):
            statusMessage = "Ambiguous link \(target): \(candidates.map(\.rawValue).joined(separator: ", "))"
        }
    }

    private func releaseSecurityScope() {
        reloadTask?.cancel()
        derivedIndexTask?.cancel()
        backlinkQueryTask?.cancel()
        searchQueryTask?.cancel()
        noteLoadTask?.cancel()
        documentIndexTask?.cancel()
        bookmarkTask?.cancel()
        isIndexing = false
        isLoadingDocument = false
        sortedNotesCache = []
        sqliteBacklinks = []
        sqliteSearchResults = nil
        pinnedNoteIDs = []
        if hasSecurityScopeAccess {
            vault?.rootURL.stopAccessingSecurityScopedResource()
            hasSecurityScopeAccess = false
        }
    }

    private func applyReloadedIndexSnapshot(
        _ snapshot: VaultIndexSnapshot,
        generation: Int,
        selectFirstIfNeeded: Bool
    ) {
        guard reloadGeneration == generation else { return }
        index = snapshot.index
        sortedNotesCache = snapshot.sortedNotes
        if let document {
            scheduleDocumentIndexRefresh(for: document)
        }
        isIndexing = false
        if selectedNoteID == nil || index.entry(for: selectedNoteID) == nil {
            selectedNoteID = selectFirstIfNeeded ? sortedNotesCache.first?.id : selectedNoteID
        }
        if let selectedNoteID, document?.id != selectedNoteID {
            selectNote(selectedNoteID)
        }
        switch snapshot.source {
        case .sqliteCache:
            statusMessage = "Loaded cached \(snapshot.sortedNotes.count) notes"
        case .filesystemSkeleton:
            statusMessage = "Loaded \(snapshot.sortedNotes.count) notes"
        }
        if let selectedNoteID {
            scheduleBacklinkQuery(for: selectedNoteID)
        }
        scheduleSearchQuery()
    }

    private func insertDocumentIntoIndex(_ document: NoteDocument) {
        insertDocumentIntoIndex(
            document,
            headings: indexer.parseHeadings(in: document.content),
            outgoingLinks: indexer.parseWikiLinks(in: document.content)
        )
    }

    private func insertDocumentIntoIndex(
        _ document: NoteDocument,
        headings: [String],
        outgoingLinks: [WikiLink]
    ) {
        let entry = NoteIndexEntry(
            id: document.id,
            title: document.title,
            modifiedAt: document.modifiedAt,
            headings: headings,
            outgoingLinks: outgoingLinks,
            searchableText: ([document.title, document.id.rawValue] + headings + [document.content]).joined(separator: "\n")
        )
        index.notes[document.id] = entry
        sortedNotesCache = index.sortedNotes

        var unresolved: [WikiLink] = []
        var ambiguous: [(WikiLink, [NoteID])] = []
        for link in outgoingLinks {
            switch indexer.resolve(link, from: document.id, in: index.notes) {
            case .resolved:
                continue
            case .unresolved:
                unresolved.append(link)
            case .ambiguous(_, let candidates):
                ambiguous.append((link, candidates))
            }
        }
        index.unresolvedLinks[document.id] = unresolved
        index.ambiguousLinks[document.id] = ambiguous
    }

    private func scheduleDocumentIndexRefresh(for document: NoteDocument) {
        let indexer = indexer
        let selectedGeneration = selectionGeneration
        documentIndexTask?.cancel()
        documentIndexTask = Task { [weak self] in
            do {
                let parsed = try await Task.detached(priority: .utility) {
                    try Task.checkCancellation()
                    return (
                        headings: indexer.parseHeadings(in: document.content),
                        outgoingLinks: indexer.parseWikiLinks(in: document.content)
                    )
                }.value
                await MainActor.run {
                    guard
                        self?.selectionGeneration == selectedGeneration,
                        self?.selectedNoteID == document.id
                    else {
                        return
                    }
                    self?.insertDocumentIntoIndex(
                        document,
                        headings: parsed.headings,
                        outgoingLinks: parsed.outgoingLinks
                    )
                }
            } catch is CancellationError {
            } catch {
            }
        }
    }

    private func configureDerivedIndex(for vault: Vault) {
        do {
            let indexStore = try makeIndexStore(vault)
            self.indexStore = indexStore
            vaultIndexer = VaultIndexer(store: store, indexStore: indexStore)
        } catch {
            statusMessage = error.localizedDescription
            indexStore = nil
            vaultIndexer = nil
        }
    }

    private func scheduleBookmarkPersistence(for vault: Vault) {
        let store = store
        let vaultRootURL = vault.rootURL
        bookmarkTask?.cancel()
        bookmarkTask = Task { [weak self] in
            do {
                let bookmark = try await Task.detached(priority: .utility) {
                    try store.securityScopedBookmark(for: vault)
                }.value
                await MainActor.run {
                    guard self?.vault?.rootURL == vaultRootURL else { return }
                    self?.userDefaults.set(bookmark, forKey: "ephe.mac.lastVaultBookmark")
                }
            } catch is CancellationError {
            } catch {
                await MainActor.run {
                    guard self?.vault?.rootURL == vaultRootURL else { return }
                    self?.statusMessage = error.localizedDescription
                }
            }
        }
    }

    private func scheduleDerivedIndexRefresh(for vault: Vault) {
        guard let vaultIndexer, let indexStore else { return }
        let loader = VaultLoadingService(store: store, indexer: indexer, indexStore: indexStore)
        let vaultRootURL = vault.rootURL
        derivedIndexTask?.cancel()
        derivedIndexTask = Task(priority: .background) { [weak self] in
            do {
                try await Task.sleep(for: .milliseconds(1_200))
                guard !Task.isCancelled else { return }
                let existingNoteIDs = try await vaultIndexer.reindexChangedNotes(in: vault)
                try await vaultIndexer.removeDeletedNotes(existingNoteIDs: existingNoteIDs)
                let refreshed = try await loader.cachedSnapshot()
                await MainActor.run {
                    guard self?.vault?.rootURL == vaultRootURL else { return }
                    if let refreshed {
                        self?.index = refreshed.index
                        self?.sortedNotesCache = refreshed.sortedNotes
                        self?.statusMessage = "Indexed \(refreshed.sortedNotes.count) notes"
                    }
                    self?.scheduleBacklinkQuery(for: self?.selectedNoteID)
                    self?.scheduleSearchQuery()
                }
            } catch is CancellationError {
            } catch {
                await MainActor.run {
                    self?.statusMessage = error.localizedDescription
                }
            }
        }
    }

    private func scheduleDerivedIndexUpdate(for noteID: NoteID) {
        guard let vault, let vaultIndexer else { return }
        derivedIndexTask?.cancel()
        derivedIndexTask = Task { [weak self] in
            do {
                try await Task.sleep(for: .milliseconds(150))
                guard !Task.isCancelled else { return }
                try await vaultIndexer.index(noteID: noteID, in: vault)
                await MainActor.run {
                    self?.scheduleBacklinkQuery(for: self?.selectedNoteID)
                    self?.scheduleSearchQuery()
                }
            } catch is CancellationError {
            } catch {
                await MainActor.run {
                    self?.statusMessage = error.localizedDescription
                }
            }
        }
    }

    private func scheduleBacklinkQuery(for noteID: NoteID?) {
        guard let noteID, let indexStore else {
            sqliteBacklinks = []
            return
        }
        backlinkQueryTask?.cancel()
        backlinkQueryTask = Task { [weak self] in
            do {
                let backlinks = try await indexStore.backlinks(to: noteID)
                await MainActor.run {
                    guard self?.selectedNoteID == noteID else { return }
                    self?.sqliteBacklinks = backlinks
                }
            } catch {
                await MainActor.run {
                    guard self?.selectedNoteID == noteID else { return }
                    self?.sqliteBacklinks = self?.index.backlinks[noteID, default: []].sorted { $0.source < $1.source } ?? []
                }
            }
        }
    }

    private func scheduleSearchQuery() {
        let trimmed = searchQuery.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmed.isEmpty else {
            searchQueryTask?.cancel()
            sqliteSearchResults = nil
            return
        }
        guard let indexStore else {
            sqliteSearchResults = nil
            return
        }
        searchQueryTask?.cancel()
        searchQueryTask = Task { [weak self] in
            do {
                try await Task.sleep(for: .milliseconds(120))
                guard !Task.isCancelled else { return }
                let results = try await indexStore.search(trimmed)
                await MainActor.run {
                    guard self?.searchQuery.trimmingCharacters(in: .whitespacesAndNewlines) == trimmed else { return }
                    self?.sqliteSearchResults = results
                }
            } catch is CancellationError {
            } catch {
                await MainActor.run {
                    self?.sqliteSearchResults = nil
                }
            }
        }
    }

    private func relativeRenamePath(for noteID: NoteID, rawName: String) -> String {
        if rawName.contains("/") {
            return rawName
        }
        let parent = noteID.rawValue.split(separator: "/").dropLast().joined(separator: "/")
        return parent.isEmpty ? rawName : "\(parent)/\(rawName)"
    }

    private func loadPinnedNotes(for vault: Vault) {
        let byVault = userDefaults.object(forKey: AppPreferenceKeys.pinnedNotesByVault) as? [String: [String]] ?? [:]
        pinnedNoteIDs = Set(byVault[pinnedStorageKey(for: vault), default: []].map(NoteID.init))
    }

    private func persistPinnedNotes() {
        guard let vault else { return }
        var byVault = userDefaults.object(forKey: AppPreferenceKeys.pinnedNotesByVault) as? [String: [String]] ?? [:]
        byVault[pinnedStorageKey(for: vault)] = pinnedNoteIDs.map(\.rawValue).sorted()
        userDefaults.set(byVault, forKey: AppPreferenceKeys.pinnedNotesByVault)
    }

    private func pinnedStorageKey(for vault: Vault) -> String {
        vault.rootURL.resolvingSymlinksInPath().standardizedFileURL.path(percentEncoded: false)
    }

    deinit {
        autosaveTask?.cancel()
        reloadTask?.cancel()
        derivedIndexTask?.cancel()
        backlinkQueryTask?.cancel()
        searchQueryTask?.cancel()
        noteLoadTask?.cancel()
        documentIndexTask?.cancel()
        bookmarkTask?.cancel()
    }
}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}
