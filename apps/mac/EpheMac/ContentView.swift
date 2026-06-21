import AppKit
import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var session: EditorSession
    @State private var sidebarVisibility: NavigationSplitViewVisibility = .all
    @State private var inspectorVisible = false
    @State private var folderName = "Untitled Folder"
    @State private var folderAlertPresented = false

    var body: some View {
        NavigationSplitView(columnVisibility: $sidebarVisibility) {
            VaultSidebar(
                sidebarVisible: sidebarVisibility != .detailOnly,
                toggleSidebar: toggleSidebar,
                newFolder: presentNewFolderAlert,
                inspectorVisible: inspectorVisible,
                toggleInspector: toggleInspector
            )
            .navigationSplitViewColumnWidth(min: 200, ideal: 224, max: 320)
        } detail: {
            ZStack(alignment: .topTrailing) {
                EditorPane()
                    .frame(maxWidth: .infinity, maxHeight: .infinity)

                if inspectorVisible {
                    InspectorFloatingPanel()
                        .frame(width: 300)
                        .frame(maxHeight: 420)
                        .padding(.top, 10)
                        .padding(.trailing, 16)
                        .transition(.scale(scale: 0.98, anchor: .topTrailing).combined(with: .opacity))
                        .zIndex(10)
                }
            }
            .background(Color.epheCanvas)
        }
        .navigationSplitViewStyle(.balanced)
        .background(Color.epheCanvas)
        .background(WindowTitleHider())
        .frame(minWidth: 1040, minHeight: 660)
        .sheet(isPresented: $session.commandPalettePresented) {
            CommandPaletteView()
                .environmentObject(session)
        }
        .alert("External Change", isPresented: Binding(
            get: { session.conflictMessage != nil },
            set: { if !$0 { session.conflictMessage = nil } }
        )) {
            Button("OK", role: .cancel) {}
        } message: {
            Text(session.conflictMessage ?? "")
        }
        .alert("New Folder", isPresented: $folderAlertPresented) {
            TextField("Name", text: $folderName)
            Button("Create") {
                session.createFolder(named: folderName)
                folderName = "Untitled Folder"
            }
            Button("Cancel", role: .cancel) {
                folderName = "Untitled Folder"
            }
        } message: {
            Text("Create a folder in the current note's folder.")
        }
    }

    private func toggleSidebar() {
        withAnimation(.snappy(duration: 0.16)) {
            sidebarVisibility = sidebarVisibility == .detailOnly ? .all : .detailOnly
        }
    }

    private func presentNewFolderAlert() {
        folderName = "Untitled Folder"
        folderAlertPresented = true
    }

    private func toggleInspector() {
        withAnimation(.snappy(duration: 0.16)) {
            inspectorVisible.toggle()
        }
    }
}

private struct WindowTitleHider: NSViewRepresentable {
    func makeNSView(context: Context) -> NSView {
        let view = NSView(frame: .zero)
        hideTitle(from: view)
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        hideTitle(from: nsView)
    }

    private func hideTitle(from view: NSView) {
        DispatchQueue.main.async {
            view.window?.title = ""
            view.window?.titleVisibility = .hidden
        }
    }
}

private struct VaultSidebar: View {
    @EnvironmentObject private var session: EditorSession
    var sidebarVisible: Bool
    var toggleSidebar: () -> Void
    var newFolder: () -> Void
    var inspectorVisible: Bool
    var toggleInspector: () -> Void
    @State private var renameTarget: NoteID?
    @State private var renameText = ""

    var body: some View {
        VStack(spacing: 0) {
            SidebarTopBar(
                sidebarVisible: sidebarVisible,
                toggleSidebar: toggleSidebar,
                newFolder: newFolder,
                inspectorVisible: inspectorVisible,
                toggleInspector: toggleInspector
            )

            if session.isIndexing {
                HStack(spacing: 8) {
                    ProgressView()
                        .controlSize(.small)
                    Text(session.statusMessage ?? "Indexing vault...")
                        .font(.caption)
                        .foregroundStyle(.secondary)
                        .lineLimit(1)
                }
                .padding(.horizontal)
                .padding(.bottom, 8)
            }

            if session.vault == nil {
                Button {
                    session.openVaultWithPanel()
                } label: {
                    Label("Open Vault", systemImage: "folder")
                }
                .buttonStyle(.plain)
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(.horizontal, 14)
                .padding(.vertical, 8)
                .accessibilityIdentifier("open-vault-row")
            } else {
                SidebarVaultLabel(title: session.vault?.displayName ?? "Ephe")
                    .padding(.horizontal, 14)
                    .padding(.vertical, 6)

                let notes = session.sidebarNotes
                if notes.isEmpty {
                    Label("No notes", systemImage: "doc")
                        .foregroundStyle(.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.horizontal, 14)
                        .padding(.vertical, 6)
                } else {
                    SidebarNotesTable(
                        notes: notes,
                        selectedNoteID: session.selectedNoteID,
                        pinnedNoteIDs: session.pinnedNoteIDs,
                        revision: session.sidebarRevision,
                        selectImmediately: { noteID in
                            session.selectNote(noteID)
                        },
                        selectDeferred: { noteID in
                            session.selectSidebarNote(noteID)
                        },
                        togglePin: { noteID in
                            session.togglePin(noteID)
                        },
                        rename: { noteID, title in
                            renameTarget = noteID
                            renameText = title
                        }
                    )
                    .frame(maxWidth: .infinity, maxHeight: .infinity)
                }
            }
        }
        .alert("Rename File", isPresented: renameAlertPresented) {
            TextField("Title", text: $renameText)
            Button("Rename") {
                if let renameTarget {
                    session.renameNote(renameTarget, to: renameText)
                }
                renameTarget = nil
            }
            Button("Cancel", role: .cancel) {
                renameTarget = nil
            }
        } message: {
            Text("Rename this Markdown file.")
        }
    }

    private var renameAlertPresented: Binding<Bool> {
        Binding(
            get: { renameTarget != nil },
            set: { isPresented in
                if !isPresented {
                    renameTarget = nil
                }
            }
        )
    }
}

private struct SidebarTopBar: View {
    @EnvironmentObject private var session: EditorSession
    var sidebarVisible: Bool
    var toggleSidebar: () -> Void
    var newFolder: () -> Void
    var inspectorVisible: Bool
    var toggleInspector: () -> Void

    var body: some View {
        HStack(spacing: 4) {
            BorderlessToolbarButton(
                systemName: "chevron.left",
                help: "Back",
                accessibilityIdentifier: "navigate-back-button",
                isEnabled: session.canNavigateBack
            ) {
                session.navigateBack()
            }
            .frame(width: 24, height: 24)

            BorderlessToolbarButton(
                systemName: "chevron.right",
                help: "Forward",
                accessibilityIdentifier: "navigate-forward-button",
                isEnabled: session.canNavigateForward
            ) {
                session.navigateForward()
            }
            .frame(width: 24, height: 24)

            BorderlessNewMenuButton(
                isEnabled: session.vault != nil,
                newFile: {
                    session.createNote()
                },
                newFolder: newFolder
            )
            .frame(width: 24, height: 24)

            Spacer(minLength: 8)

            BorderlessToolbarButton(
                systemName: "sidebar.left",
                help: sidebarVisible ? "Hide Sidebar" : "Show Sidebar",
                accessibilityIdentifier: "toggle-sidebar-button",
                action: toggleSidebar
            )
            .frame(width: 24, height: 24)

            BorderlessToolbarButton(
                systemName: "list.bullet.rectangle",
                help: inspectorVisible ? "Hide Details" : "Show Details",
                accessibilityIdentifier: "toggle-inspector-button",
                action: toggleInspector
            )
            .frame(width: 24, height: 24)
        }
        .frame(height: 36)
        .padding(.horizontal, 10)
        .padding(.top, 6)
        .padding(.bottom, 4)
    }
}

private struct SidebarVaultLabel: View {
    var title: String

    var body: some View {
        Label {
            Text(title)
                .lineLimit(1)
        } icon: {
            Image(systemName: "folder.fill")
        }
    }
}

private struct SidebarNotesTable: NSViewRepresentable {
    var notes: [NoteIndexEntry]
    var selectedNoteID: NoteID?
    var pinnedNoteIDs: Set<NoteID>
    var revision: Int
    var selectImmediately: (NoteID) -> Void
    var selectDeferred: (NoteID) -> Void
    var togglePin: (NoteID) -> Void
    var rename: (NoteID, String) -> Void

    func makeCoordinator() -> SidebarNotesTableController {
        SidebarNotesTableController()
    }

    func makeNSView(context: Context) -> NSScrollView {
        let scrollView = context.coordinator.makeScrollView()
        context.coordinator.selectImmediately = selectImmediately
        context.coordinator.selectDeferred = selectDeferred
        context.coordinator.togglePin = togglePin
        context.coordinator.rename = rename
        return scrollView
    }

    func updateNSView(_ scrollView: NSScrollView, context: Context) {
        context.coordinator.selectImmediately = selectImmediately
        context.coordinator.selectDeferred = selectDeferred
        context.coordinator.togglePin = togglePin
        context.coordinator.rename = rename
        context.coordinator.update(
            notes: notes,
            selectedNoteID: selectedNoteID,
            pinnedNoteIDs: pinnedNoteIDs,
            revision: revision
        )
    }
}

@MainActor
final class SidebarNotesTableController: NSObject, NSTableViewDataSource, NSTableViewDelegate {
    var selectImmediately: (NoteID) -> Void = { _ in }
    var selectDeferred: (NoteID) -> Void = { _ in }
    var togglePin: (NoteID) -> Void = { _ in }
    var rename: (NoteID, String) -> Void = { _, _ in }

    private(set) var notes: [NoteIndexEntry] = []
    private var pinnedNoteIDs: Set<NoteID> = []
    private var selectedNoteID: NoteID?
    private var revision: Int?
    private var suppressSelectionCallback = false
    private let tableView = SidebarNSTableView()

    func makeScrollView() -> NSScrollView {
        let column = NSTableColumn(identifier: .noteColumn)
        column.resizingMask = .autoresizingMask

        tableView.addTableColumn(column)
        tableView.headerView = nil
        tableView.rowHeight = 24
        tableView.intercellSpacing = NSSize(width: 0, height: 1)
        tableView.style = .sourceList
        tableView.allowsEmptySelection = true
        tableView.allowsMultipleSelection = false
        tableView.backgroundColor = .clear
        tableView.usesAlternatingRowBackgroundColors = false
        tableView.dataSource = self
        tableView.delegate = self
        tableView.target = self
        tableView.action = #selector(rowClicked(_:))
        tableView.menuProvider = { [weak self] row in
            self?.menu(for: row)
        }
        tableView.setAccessibilityIdentifier("notes-sidebar-table")

        let scrollView = NSScrollView()
        scrollView.drawsBackground = false
        scrollView.hasVerticalScroller = true
        scrollView.hasHorizontalScroller = false
        scrollView.borderType = .noBorder
        scrollView.documentView = tableView

        DispatchQueue.main.async { [weak tableView] in
            tableView?.window?.makeFirstResponder(tableView)
        }

        return scrollView
    }

    func update(
        notes: [NoteIndexEntry],
        selectedNoteID: NoteID?,
        pinnedNoteIDs: Set<NoteID>,
        revision: Int
    ) {
        self.selectedNoteID = selectedNoteID
        let shouldReload = self.revision != revision || self.notes.count != notes.count
        if shouldReload {
            self.notes = notes
            self.pinnedNoteIDs = pinnedNoteIDs
            self.revision = revision
            tableView.reloadData()
        } else {
            self.pinnedNoteIDs = pinnedNoteIDs
        }
        applySelection(scroll: true)
        DispatchQueue.main.async { [weak tableView] in
            guard let tableView, tableView.window?.firstResponder == nil else { return }
            tableView.window?.makeFirstResponder(tableView)
        }
    }

    func numberOfRows(in tableView: NSTableView) -> Int {
        notes.count
    }

    func tableView(_ tableView: NSTableView, heightOfRow row: Int) -> CGFloat {
        24
    }

    func tableView(_ tableView: NSTableView, rowViewForRow row: Int) -> NSTableRowView? {
        SidebarSelectionRowView()
    }

    func tableView(_ tableView: NSTableView, viewFor tableColumn: NSTableColumn?, row: Int) -> NSView? {
        guard notes.indices.contains(row) else { return nil }
        let cell = tableView.makeView(
            withIdentifier: SidebarNoteCellView.reuseIdentifier,
            owner: self
        ) as? SidebarNoteCellView ?? SidebarNoteCellView()
        let entry = notes[row]
        cell.configure(entry: entry, isPinned: pinnedNoteIDs.contains(entry.id))
        cell.onClick = { [weak self] noteID in
            self?.selectedNoteID = noteID
            self?.selectImmediately(noteID)
        }
        return cell
    }

    func tableViewSelectionDidChange(_ notification: Notification) {
        guard !suppressSelectionCallback else { return }
        let row = tableView.selectedRow
        guard notes.indices.contains(row) else { return }
        let noteID = notes[row].id
        selectedNoteID = noteID
        switch NSApp.currentEvent?.type {
        case .keyDown, .flagsChanged:
            selectDeferred(noteID)
        default:
            selectImmediately(noteID)
        }
    }

    @objc private func rowClicked(_ sender: NSTableView) {
        let row = sender.clickedRow
        guard notes.indices.contains(row) else { return }
        let noteID = notes[row].id
        selectedNoteID = noteID
        selectImmediately(noteID)
    }

    func select(row: Int) {
        guard notes.indices.contains(row) else { return }
        suppressSelectionCallback = true
        tableView.selectRowIndexes(IndexSet(integer: row), byExtendingSelection: false)
        suppressSelectionCallback = false
        tableView.scrollRowToVisible(row)
    }

    private func applySelection(scroll: Bool) {
        guard let selectedNoteID, let row = notes.firstIndex(where: { $0.id == selectedNoteID }) else {
            suppressSelectionCallback = true
            tableView.deselectAll(nil)
            suppressSelectionCallback = false
            return
        }
        guard tableView.selectedRow != row else { return }
        suppressSelectionCallback = true
        tableView.selectRowIndexes(IndexSet(integer: row), byExtendingSelection: false)
        suppressSelectionCallback = false
        if scroll {
            tableView.scrollRowToVisible(row)
        }
    }

    private func menu(for row: Int) -> NSMenu? {
        guard notes.indices.contains(row) else { return nil }
        if tableView.selectedRow != row {
            select(row: row)
        }
        let entry = notes[row]
        let menu = NSMenu()
        let pinTitle = pinnedNoteIDs.contains(entry.id) ? "Unpin" : "Pin"
        let pinItem = NSMenuItem(title: pinTitle, action: #selector(togglePinItem(_:)), keyEquivalent: "")
        pinItem.target = self
        pinItem.representedObject = entry.id.rawValue
        menu.addItem(pinItem)

        let renameItem = NSMenuItem(title: "Rename...", action: #selector(renameItem(_:)), keyEquivalent: "")
        renameItem.target = self
        renameItem.representedObject = entry.id.rawValue
        menu.addItem(renameItem)
        return menu
    }

    @objc private func togglePinItem(_ sender: NSMenuItem) {
        guard let rawValue = sender.representedObject as? String else { return }
        togglePin(NoteID(indexedPath: rawValue))
    }

    @objc private func renameItem(_ sender: NSMenuItem) {
        guard
            let rawValue = sender.representedObject as? String,
            let entry = notes.first(where: { $0.id.rawValue == rawValue })
        else {
            return
        }
        rename(entry.id, entry.title)
    }
}

private final class SidebarSelectionRowView: NSTableRowView {
    override var isEmphasized: Bool {
        get { true }
        set {}
    }
}

private final class SidebarNSTableView: NSTableView {
    var menuProvider: ((Int) -> NSMenu?)?

    override func menu(for event: NSEvent) -> NSMenu? {
        let point = convert(event.locationInWindow, from: nil)
        let row = row(at: point)
        guard row >= 0 else { return nil }
        return menuProvider?(row)
    }
}

private final class SidebarNoteCellView: NSTableCellView {
    static let reuseIdentifier = NSUserInterfaceItemIdentifier("SidebarNoteCellView")

    private let noteIconView = NSImageView()
    private let titleField = NSTextField(labelWithString: "")
    private let pinIconView = NSImageView()
    private var noteID: NoteID?
    var onClick: ((NoteID) -> Void)?

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        identifier = Self.reuseIdentifier
        wantsLayer = true
        setup()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        identifier = Self.reuseIdentifier
        wantsLayer = true
        setup()
    }

    func configure(entry: NoteIndexEntry, isPinned: Bool) {
        noteID = entry.id
        titleField.stringValue = entry.title
        pinIconView.isHidden = !isPinned
        setAccessibilityElement(true)
        setAccessibilityIdentifier("note-row-\(entry.id.rawValue)")
        setAccessibilityLabel(entry.title)
        setAccessibilityRole(.button)
    }

    override func mouseDown(with event: NSEvent) {
        super.mouseDown(with: event)
        if let noteID {
            onClick?(noteID)
        }
    }

    private func setup() {
        imageView = noteIconView
        textField = titleField

        noteIconView.image = NSImage(systemSymbolName: "doc.text", accessibilityDescription: nil)
        noteIconView.contentTintColor = .secondaryLabelColor
        noteIconView.translatesAutoresizingMaskIntoConstraints = false

        titleField.font = .systemFont(ofSize: 13)
        titleField.lineBreakMode = .byTruncatingTail
        titleField.textColor = .labelColor
        titleField.translatesAutoresizingMaskIntoConstraints = false

        pinIconView.image = NSImage(systemSymbolName: "pin.fill", accessibilityDescription: nil)
        pinIconView.contentTintColor = .tertiaryLabelColor
        pinIconView.translatesAutoresizingMaskIntoConstraints = false

        addSubview(noteIconView)
        addSubview(titleField)
        addSubview(pinIconView)

        NSLayoutConstraint.activate([
            noteIconView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 14),
            noteIconView.centerYAnchor.constraint(equalTo: centerYAnchor),
            noteIconView.widthAnchor.constraint(equalToConstant: 13),
            noteIconView.heightAnchor.constraint(equalToConstant: 13),

            titleField.leadingAnchor.constraint(equalTo: noteIconView.trailingAnchor, constant: 7),
            titleField.centerYAnchor.constraint(equalTo: centerYAnchor),

            pinIconView.leadingAnchor.constraint(equalTo: titleField.trailingAnchor, constant: 6),
            pinIconView.trailingAnchor.constraint(lessThanOrEqualTo: trailingAnchor, constant: -10),
            pinIconView.centerYAnchor.constraint(equalTo: centerYAnchor),
            pinIconView.widthAnchor.constraint(equalToConstant: 11),
            pinIconView.heightAnchor.constraint(equalToConstant: 11),
        ])
    }
}

private extension NSUserInterfaceItemIdentifier {
    static let noteColumn = NSUserInterfaceItemIdentifier("note")
}

private struct EditorPane: View {
    @EnvironmentObject private var session: EditorSession

    var body: some View {
        ZStack {
            MarkdownTextEditor()
                .opacity(session.document == nil ? 0 : 1)
                .allowsHitTesting(session.document != nil)
                .accessibilityHidden(session.document == nil)

            if session.document == nil {
                if session.isIndexing {
                    LoadingEditorState(message: indexingMessage)
                } else if session.isLoadingDocument {
                    LoadingEditorState(message: nil)
                } else {
                    EmptyEditorState()
                }
            } else if session.isIndexing {
                LoadingBadge(message: indexingMessage)
                    .frame(maxWidth: .infinity, maxHeight: .infinity, alignment: .topLeading)
                    .padding(.top, 18)
                    .padding(.leading, 28)
            }
        }
        .background(Color.epheCanvas)
    }

    private var indexingMessage: String {
        return session.statusMessage ?? "Loading vault..."
    }
}

private struct BorderlessNewMenuButton: NSViewRepresentable {
    var isEnabled: Bool
    var newFile: () -> Void
    var newFolder: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(newFile: newFile, newFolder: newFolder)
    }

    func makeNSView(context: Context) -> NSButton {
        let button = NSButton()
        button.isBordered = false
        button.bezelStyle = .regularSquare
        button.imagePosition = .imageOnly
        button.imageScaling = .scaleProportionallyDown
        button.setButtonType(.momentaryChange)
        button.contentTintColor = .secondaryLabelColor
        button.isEnabled = isEnabled
        button.target = context.coordinator
        button.action = #selector(Coordinator.showMenu(_:))
        button.toolTip = "New"
        button.setAccessibilityIdentifier("new-menu-button")
        return button
    }

    func updateNSView(_ button: NSButton, context: Context) {
        context.coordinator.newFile = newFile
        context.coordinator.newFolder = newFolder
        button.image = NSImage(systemSymbolName: "plus", accessibilityDescription: "New")
        button.isEnabled = isEnabled
        button.contentTintColor = isEnabled ? .secondaryLabelColor : .disabledControlTextColor
    }

    @MainActor
    final class Coordinator: NSObject {
        var newFile: () -> Void
        var newFolder: () -> Void

        init(newFile: @escaping () -> Void, newFolder: @escaping () -> Void) {
            self.newFile = newFile
            self.newFolder = newFolder
        }

        @objc func showMenu(_ sender: NSButton) {
            let menu = NSMenu()
            let newFileItem = NSMenuItem(title: "New File", action: #selector(createFile), keyEquivalent: "")
            newFileItem.target = self
            newFileItem.image = NSImage(systemSymbolName: "doc.badge.plus", accessibilityDescription: nil)
            menu.addItem(newFileItem)

            let newFolderItem = NSMenuItem(title: "New Folder", action: #selector(createFolder), keyEquivalent: "")
            newFolderItem.target = self
            newFolderItem.image = NSImage(systemSymbolName: "folder.badge.plus", accessibilityDescription: nil)
            menu.addItem(newFolderItem)

            menu.popUp(positioning: nil, at: NSPoint(x: 0, y: sender.bounds.maxY + 2), in: sender)
        }

        @objc private func createFile() {
            newFile()
        }

        @objc private func createFolder() {
            newFolder()
        }
    }
}

private struct BorderlessToolbarButton: NSViewRepresentable {
    var systemName: String
    var help: String
    var accessibilityIdentifier: String
    var isEnabled = true
    var action: () -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(action: action)
    }

    func makeNSView(context: Context) -> NSButton {
        let button = NSButton()
        button.isBordered = false
        button.bezelStyle = .regularSquare
        button.imagePosition = .imageOnly
        button.imageScaling = .scaleProportionallyDown
        button.setButtonType(.momentaryChange)
        button.contentTintColor = .secondaryLabelColor
        button.isEnabled = isEnabled
        button.target = context.coordinator
        button.action = #selector(Coordinator.performAction)
        button.toolTip = help
        button.setAccessibilityIdentifier(accessibilityIdentifier)
        return button
    }

    func updateNSView(_ button: NSButton, context: Context) {
        context.coordinator.action = action
        button.image = NSImage(systemSymbolName: systemName, accessibilityDescription: help)
        button.toolTip = help
        button.isEnabled = isEnabled
        button.contentTintColor = isEnabled ? .secondaryLabelColor : .disabledControlTextColor
        button.setAccessibilityIdentifier(accessibilityIdentifier)
    }

    @MainActor
    final class Coordinator: NSObject {
        var action: () -> Void

        init(action: @escaping () -> Void) {
            self.action = action
        }

        @objc func performAction() {
            action()
        }
    }
}

private struct EmptyEditorState: View {
    @EnvironmentObject private var session: EditorSession

    var body: some View {
        VStack(spacing: 10) {
            Text("Shortcuts")
                .font(.system(size: 12, weight: .semibold))
                .foregroundStyle(.secondary)
                .frame(width: 220, alignment: .leading)

            VStack(spacing: 0) {
                ShortcutRow(title: "New File", shortcut: "⌘N", systemImage: "doc.badge.plus") {
                    session.createNote()
                }
                .disabled(session.vault == nil)

                ShortcutRow(title: "Open...", shortcut: "⇧⌘O", systemImage: "arrow.up.right") {
                    session.openVaultWithPanel()
                }

                ShortcutRow(title: "Command", shortcut: "⌘K", systemImage: "command") {
                    session.commandPalettePresented = true
                }
            }
            .frame(width: 220)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .offset(y: -18)
    }
}

private struct LoadingEditorState: View {
    var message: String?

    var body: some View {
        VStack(spacing: 10) {
            ProgressView()
                .controlSize(.regular)
                .accessibilityIdentifier("loading-indicator")

            if let message {
                Text(message)
                    .font(.system(size: 12, weight: .medium))
                    .foregroundStyle(.secondary)
                    .lineLimit(1)
                    .frame(maxWidth: 280)
            }
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
        .offset(y: -18)
    }
}

private struct LoadingBadge: View {
    var message: String

    var body: some View {
        HStack(spacing: 8) {
            ProgressView()
                .controlSize(.small)
                .accessibilityIdentifier("loading-indicator")

            Text(message)
                .font(.system(size: 11, weight: .medium))
                .foregroundStyle(.secondary)
                .lineLimit(1)
        }
        .padding(.horizontal, 10)
        .padding(.vertical, 7)
        .background {
            Capsule()
                .fill(Color.epheFloatingPanel.opacity(0.94))
                .shadow(color: .black.opacity(0.08), radius: 12, x: 0, y: 4)
        }
        .overlay {
            Capsule()
                .stroke(Color.black.opacity(0.08), lineWidth: 1)
        }
        .accessibilityIdentifier("loading-badge")
    }
}

private struct ShortcutRow: View {
    var title: String
    var shortcut: String
    var systemImage: String
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 10) {
                Image(systemName: systemImage)
                    .font(.system(size: 12, weight: .regular))
                    .foregroundStyle(.secondary)
                    .frame(width: 18)

                Text(title)
                    .font(.system(size: 12))
                    .foregroundStyle(.primary)

                Spacer()

                Text(shortcut)
                    .font(.system(size: 12))
                    .foregroundStyle(.tertiary)
                    .monospaced()
            }
            .frame(height: 34)
            .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .overlay(alignment: .bottom) {
            Rectangle()
                .fill(Color.black.opacity(0.08))
                .frame(height: 1)
                .padding(.leading, 28)
        }
    }
}

private struct MarkdownTextEditor: View {
    @EnvironmentObject private var session: EditorSession
    @AppStorage(AppPreferenceKeys.editorFont) private var editorFontRawValue = EditorFontChoice.iaWriterMono.rawValue

    var body: some View {
        MarkdownDecoratedTextEditor(text: Binding(
            get: { session.document?.content ?? "" },
            set: { session.updateContent($0) }
        ), fontChoice: selectedFont, onWikiLink: { link in
            session.openWikiLink(link)
        })
        .padding(.horizontal, 28)
        .padding(.bottom, 22)
    }

    private var selectedFont: EditorFontChoice {
        EditorFontChoice(rawValue: editorFontRawValue) ?? .iaWriterMono
    }
}

private struct InspectorFloatingPanel: View {
    @EnvironmentObject private var session: EditorSession

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                InspectorSection(title: "Info") {
                    if let document = session.document {
                        VStack(alignment: .leading, spacing: 4) {
                            InspectorKeyValueRow(title: "Created", value: formattedDate(document.createdAt))
                            InspectorKeyValueRow(title: "Updated", value: formattedDate(document.modifiedAt))
                        }
                    } else {
                        InspectorEmptyText("No file selected")
                    }
                }

                InspectorSection(title: "Outline") {
                    if let entry = session.selectedEntry, !entry.headings.isEmpty {
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(entry.headings, id: \.self) { heading in
                                InspectorTextRow(title: heading, systemImage: "number")
                            }
                        }
                    } else {
                        InspectorEmptyText("No headings")
                    }
                }

                InspectorSection(title: "Backlinks") {
                    if session.backlinks.isEmpty {
                        InspectorEmptyText("No backlinks")
                    } else {
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(session.backlinks) { backlink in
                                Button {
                                    session.selectNote(backlink.source)
                                } label: {
                                    InspectorTextRow(title: backlink.source.rawValue, systemImage: "arrow.left")
                                }
                                .buttonStyle(.plain)
                                .accessibilityIdentifier("backlink-\(backlink.source.rawValue)")
                            }
                        }
                    }
                }

                InspectorSection(title: "Unresolved") {
                    if session.unresolvedLinks.isEmpty {
                        InspectorEmptyText("No unresolved links")
                    } else {
                        VStack(alignment: .leading, spacing: 4) {
                            ForEach(Array(session.unresolvedLinks.enumerated()), id: \.offset) { _, link in
                                Button {
                                    session.createNote(named: link.target)
                                } label: {
                                    InspectorTextRow(title: link.target, systemImage: "plus.circle")
                                }
                                .buttonStyle(.plain)
                            }
                        }
                    }
                }

                InspectorSection(title: "Ambiguous") {
                    if ambiguousLinks.isEmpty {
                        InspectorEmptyText("No ambiguous links")
                    } else {
                        VStack(alignment: .leading, spacing: 6) {
                            ForEach(Array(ambiguousLinks.enumerated()), id: \.offset) { _, item in
                                VStack(alignment: .leading, spacing: 3) {
                                    InspectorTextRow(title: item.0.target, systemImage: "questionmark.circle")
                                    ForEach(item.1, id: \.self) { candidate in
                                        Button {
                                            session.selectNote(candidate)
                                        } label: {
                                            Text(candidate.rawValue)
                                                .font(.system(size: 11))
                                                .foregroundStyle(.secondary)
                                                .lineLimit(1)
                                                .padding(.leading, 24)
                                        }
                                        .buttonStyle(.plain)
                                    }
                                }
                            }
                        }
                    }
                }
            }
            .padding(.horizontal, 16)
            .padding(.top, 16)
            .padding(.bottom, 20)
        }
        .background {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .fill(Color.epheFloatingPanel)
                .shadow(color: .black.opacity(0.10), radius: 18, x: 0, y: 8)
                .shadow(color: .black.opacity(0.06), radius: 2, x: 0, y: 1)
        }
        .overlay {
            RoundedRectangle(cornerRadius: 16, style: .continuous)
                .stroke(Color.black.opacity(0.08), lineWidth: 1)
        }
    }

    private var ambiguousLinks: [(WikiLink, [NoteID])] {
        guard let selectedNoteID = session.selectedNoteID else { return [] }
        return session.index.ambiguousLinks[selectedNoteID, default: []]
    }

    private func formattedDate(_ date: Date?) -> String {
        guard let date else { return "Unknown" }
        return date.formatted(date: .abbreviated, time: .shortened)
    }
}

private struct InspectorSection<Content: View>: View {
    var title: String
    @ViewBuilder var content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(title)
                .font(.system(size: 11, weight: .semibold))
                .foregroundStyle(.secondary)
                .textCase(.uppercase)
                .lineLimit(1)

            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
    }
}

private struct InspectorTextRow: View {
    var title: String
    var systemImage: String

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: systemImage)
                .font(.system(size: 11))
                .foregroundStyle(Color.epheAccent.opacity(0.78))
                .frame(width: 15)

            Text(title)
                .font(.system(size: 12))
                .foregroundStyle(.primary)
                .lineLimit(1)
        }
        .frame(height: 22)
        .contentShape(Rectangle())
    }
}

private struct InspectorKeyValueRow: View {
    var title: String
    var value: String

    var body: some View {
        HStack(spacing: 10) {
            Text(title)
                .font(.system(size: 12))
                .foregroundStyle(.secondary)
                .frame(width: 58, alignment: .leading)

            Text(value)
                .font(.system(size: 12))
                .foregroundStyle(.primary)
                .lineLimit(1)
        }
        .frame(height: 22, alignment: .leading)
    }
}

private struct InspectorEmptyText: View {
    var text: String

    init(_ text: String) {
        self.text = text
    }

    var body: some View {
        Text(text)
            .font(.system(size: 12))
            .foregroundStyle(.tertiary)
            .lineLimit(1)
            .frame(height: 22, alignment: .leading)
    }
}

private struct CommandPaletteView: View {
    @EnvironmentObject private var session: EditorSession
    @State private var query = ""

    var body: some View {
        VStack(spacing: 0) {
            TextField("Open note or command", text: $query)
                .textFieldStyle(.plain)
                .font(.title3)
                .padding()

            Divider()

            List {
                Button {
                    session.createNote(named: query.nilIfEmpty)
                    session.commandPalettePresented = false
                } label: {
                    Label(query.isEmpty ? "Create Untitled Note" : "Create \(query)", systemImage: "square.and.pencil")
                }

                ForEach(session.searchNotes(query)) { entry in
                    Button {
                        session.selectNote(entry.id)
                        session.commandPalettePresented = false
                    } label: {
                        Label(entry.title, systemImage: "doc.text")
                    }
                }
            }
        }
        .frame(width: 520, height: 420)
    }
}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}

private extension Color {
    static let epheCanvas = Color(nsColor: .textBackgroundColor)
    static let epheSidebar = Color(nsColor: NSColor(calibratedWhite: 0.965, alpha: 1))
    static let epheFloatingPanel = Color(nsColor: NSColor(calibratedWhite: 0.992, alpha: 1))
    static let epheAccent = Color(nsColor: NSColor(calibratedRed: 0.22, green: 0.51, blue: 0.93, alpha: 1))
}
