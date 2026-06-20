import AppKit
import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var session: EditorSession
    @State private var sidebarVisibility: NavigationSplitViewVisibility = .all
    @State private var inspectorVisible = false

    var body: some View {
        NavigationSplitView(columnVisibility: $sidebarVisibility) {
            VaultSidebar()
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
        .toolbar {
            EpheWindowToolbar(
                sidebarVisible: sidebarVisibility != .detailOnly,
                toggleSidebar: {
                    withAnimation(.snappy(duration: 0.16)) {
                        sidebarVisibility = sidebarVisibility == .detailOnly ? .all : .detailOnly
                    }
                },
                inspectorVisible: inspectorVisible,
                toggleInspector: {
                    withAnimation(.snappy(duration: 0.16)) {
                        inspectorVisible.toggle()
                    }
                }
            )
        }
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
    @FocusState private var listFocused: Bool
    @State private var renameTarget: NoteID?
    @State private var renameText = ""

    var body: some View {
        VStack(spacing: 0) {
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

            ScrollViewReader { proxy in
                List(selection: selectedNoteBinding) {
                    if session.vault == nil {
                        Button {
                            session.openVaultWithPanel()
                        } label: {
                            Label("Open Vault", systemImage: "folder")
                        }
                        .accessibilityIdentifier("open-vault-row")
                    } else {
                        Section {
                            SidebarVaultLabel(title: session.vault?.displayName ?? "Ephe")

                            let notes = session.sidebarNotes
                            if notes.isEmpty {
                                Label("No notes", systemImage: "doc")
                                    .foregroundStyle(.secondary)
                            } else {
                                ForEach(notes) { entry in
                                    SidebarFileLabel(entry: entry, isPinned: session.isPinned(entry.id))
                                        .tag(entry.id)
                                        .id(entry.id)
                                        .contextMenu {
                                            Button(session.isPinned(entry.id) ? "Unpin" : "Pin") {
                                                session.togglePin(entry.id)
                                            }

                                            Button("Rename...") {
                                                renameTarget = entry.id
                                                renameText = entry.title
                                            }
                                        }
                                        .accessibilityIdentifier("note-row-\(entry.id.rawValue)")
                                }
                            }
                        }
                    }
                }
                .listStyle(.sidebar)
                .focused($listFocused)
                .onAppear {
                    listFocused = true
                    scrollToSelectedNote(with: proxy)
                }
                .onChange(of: session.selectedNoteID) { _, selectedNoteID in
                    if selectedNoteID != nil {
                        listFocused = true
                        scrollToSelectedNote(with: proxy)
                    }
                }
                .onChange(of: session.sidebarRevision) { _, _ in
                    scrollToSelectedNote(with: proxy)
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

    private func scrollToSelectedNote(with proxy: ScrollViewProxy) {
        guard let selectedNoteID = session.selectedNoteID else { return }
        Task { @MainActor in
            guard session.containsSidebarNote(selectedNoteID) else { return }
            withAnimation(.snappy(duration: 0.16)) {
                proxy.scrollTo(selectedNoteID, anchor: .center)
            }
        }
    }

    private var selectedNoteBinding: Binding<NoteID?> {
        Binding(
            get: { session.selectedNoteID },
            set: { noteID in
                guard let noteID, noteID != session.selectedNoteID else { return }
                listFocused = true
                session.selectSidebarNote(noteID)
            }
        )
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

private struct SidebarFileLabel: View {
    var entry: NoteIndexEntry
    var isPinned: Bool

    var body: some View {
        HStack(spacing: 0) {
            Label {
                Text(entry.title)
                    .lineLimit(1)
            } icon: {
                Image(systemName: "doc.text")
            }

            Spacer(minLength: 8)

            if isPinned {
                Image(systemName: "pin.fill")
                    .font(.system(size: 10, weight: .medium))
                    .foregroundStyle(.secondary)
            }
        }
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

private struct EpheWindowToolbar: ToolbarContent {
    @EnvironmentObject private var session: EditorSession
    var sidebarVisible: Bool
    var toggleSidebar: () -> Void
    var inspectorVisible: Bool
    var toggleInspector: () -> Void

    var body: some ToolbarContent {
        ToolbarItem(placement: .navigation) {
            HStack(spacing: 8) {
                BorderlessToolbarButton(
                    systemName: "sidebar.left",
                    help: sidebarVisible ? "Hide Sidebar" : "Show Sidebar",
                    accessibilityIdentifier: "toggle-sidebar-button",
                    action: toggleSidebar
                )
                .frame(width: 24, height: 24)

                BorderlessToolbarButton(
                    systemName: "chevron.left",
                    help: "Back",
                    accessibilityIdentifier: "navigate-back-button",
                    isEnabled: session.canNavigateBack,
                    action: {
                        session.navigateBack()
                    }
                )
                .frame(width: 24, height: 24)

                BorderlessToolbarButton(
                    systemName: "chevron.right",
                    help: "Forward",
                    accessibilityIdentifier: "navigate-forward-button",
                    isEnabled: session.canNavigateForward,
                    action: {
                        session.navigateForward()
                    }
                )
                .frame(width: 24, height: 24)
            }
            .frame(width: 88, height: 28, alignment: .leading)
        }

        ToolbarItem(placement: .principal) {
            HeaderTitle(title: session.document?.title)
        }

        ToolbarItem(placement: .primaryAction) {
            BorderlessToolbarButton(
                systemName: "list.bullet.rectangle",
                help: inspectorVisible ? "Hide Details" : "Show Details",
                accessibilityIdentifier: "toggle-inspector-button",
                isEnabled: true,
                action: toggleInspector
            )
            .frame(width: 24, height: 24)
        }
    }
}

private struct HeaderTitle: NSViewRepresentable {
    var title: String?

    func makeNSView(context: Context) -> NSTextField {
        let field = NSTextField(labelWithString: title ?? "")
        field.font = .systemFont(ofSize: 14, weight: .semibold)
        field.textColor = .labelColor
        field.alignment = .center
        field.lineBreakMode = .byTruncatingMiddle
        field.maximumNumberOfLines = 1
        field.isSelectable = false
        field.drawsBackground = false
        field.isBezeled = false
        field.setContentCompressionResistancePriority(.defaultLow, for: .horizontal)
        return field
    }

    func updateNSView(_ field: NSTextField, context: Context) {
        let text = title ?? ""
        field.stringValue = text
        field.toolTip = text.isEmpty ? nil : text
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
