import AppKit
import SwiftUI

struct ContentView: View {
    @EnvironmentObject private var session: EditorSession
    @State private var sidebarVisible = true
    @State private var inspectorVisible = false

    var body: some View {
        ZStack(alignment: .topTrailing) {
            HStack(spacing: 0) {
                if sidebarVisible {
                    VaultSidebar()
                    .frame(width: 224)
                    .background(Color.epheSidebar)
                    .overlay(alignment: .trailing) {
                        Rectangle()
                            .fill(Color.black.opacity(0.06))
                            .frame(width: 1)
                    }
                    .transition(.move(edge: .leading).combined(with: .opacity))
                }

                EditorPane()
                .frame(maxWidth: .infinity, maxHeight: .infinity)
            }
            .background(Color.epheCanvas)
            
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
        .background(WindowTitleHider())
        .frame(minWidth: 1040, minHeight: 660)
        .background {
            SidebarKeyboardNavigationHandler(
                isEnabled: sidebarVisible && !session.commandPalettePresented
            ) { delta in
                session.moveSidebarSelection(delta: delta)
            }
        }
        .toolbar {
            EpheWindowToolbar(
                sidebarVisible: sidebarVisible,
                inspectorVisible: inspectorVisible,
                toggleSidebar: {
                    withAnimation(.snappy(duration: 0.18)) {
                        sidebarVisible.toggle()
                    }
                },
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

private struct SidebarKeyboardNavigationHandler: NSViewRepresentable {
    var isEnabled: Bool
    var moveSelection: (Int) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(isEnabled: isEnabled, moveSelection: moveSelection)
    }

    func makeNSView(context: Context) -> NSView {
        let view = NSView(frame: .zero)
        context.coordinator.install()
        return view
    }

    func updateNSView(_ nsView: NSView, context: Context) {
        context.coordinator.isEnabled = isEnabled
        context.coordinator.moveSelection = moveSelection
    }

    static func dismantleNSView(_ nsView: NSView, coordinator: Coordinator) {
        coordinator.uninstall()
    }

    @MainActor
    final class Coordinator {
        var isEnabled: Bool
        var moveSelection: (Int) -> Void
        private var monitor: Any?

        init(isEnabled: Bool, moveSelection: @escaping (Int) -> Void) {
            self.isEnabled = isEnabled
            self.moveSelection = moveSelection
        }

        func install() {
            guard monitor == nil else { return }
            monitor = NSEvent.addLocalMonitorForEvents(matching: .keyDown) { [weak self] event in
                guard let self, self.isEnabled else { return event }
                let blockedModifiers: NSEvent.ModifierFlags = [.command, .control, .option]
                guard event.modifierFlags.intersection(blockedModifiers).isEmpty else { return event }
                guard !EpheMarkdownTextView.isUserEditingActive else { return event }

                switch event.keyCode {
                case 125:
                    self.moveSelection(1)
                    return nil
                case 126:
                    self.moveSelection(-1)
                    return nil
                default:
                    return event
                }
            }
        }

        func uninstall() {
            if let monitor {
                NSEvent.removeMonitor(monitor)
            }
            monitor = nil
        }

    }
}

private struct VaultSidebar: View {
    @EnvironmentObject private var session: EditorSession
    @FocusState private var focusedNoteID: NoteID?

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

            VStack(alignment: .leading, spacing: 4) {
                ScrollViewReader { proxy in
                    ScrollView {
                        LazyVStack(alignment: .leading, spacing: SidebarMetrics.rowSpacing) {
                            if session.vault == nil {
                                SidebarActionRow(title: "Open Vault", systemImage: "folder") {
                                    session.openVaultWithPanel()
                                }
                            } else {
                                let notes = session.sidebarNotes
                                SidebarFolderRow(title: session.vault?.displayName ?? "Ephe")

                                if notes.isEmpty {
                                    SidebarMutedRow(title: "No notes", systemImage: "doc")
                                } else {
                                    ForEach(notes) { entry in
                                        SidebarNoteRow(
                                            entry: entry,
                                            isSelected: entry.id == session.selectedNoteID
                                        ) {
                                            focusedNoteID = entry.id
                                            session.selectNote(entry.id)
                                            Task { @MainActor in
                                                focusedNoteID = entry.id
                                            }
                                        }
                                        .focusable(true)
                                        .focused($focusedNoteID, equals: entry.id)
                                        .focusEffectDisabled()
                                        .id(entry.id)
                                        .accessibilityIdentifier("note-row-\(entry.id.rawValue)")
                                    }
                                }
                            }
                        }
                        .padding(.horizontal, 8)
                    }
                    .onChange(of: session.selectedNoteID) { _, selectedNoteID in
                        guard let selectedNoteID else { return }
                        proxy.scrollTo(selectedNoteID, anchor: .center)
                        focusedNoteID = selectedNoteID
                    }
                }
            }

            Spacer(minLength: 0)
        }
    }
}

private enum SidebarMetrics {
    static let rowHeight: CGFloat = 24
    static let rowSpacing: CGFloat = 1
    static let rowHorizontalPadding: CGFloat = 6
    static let rowVerticalPadding: CGFloat = 2
}

private struct SidebarNoteRow: View {
    var entry: NoteIndexEntry
    var isSelected: Bool
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            SidebarIconLabel(
                title: entry.title,
                systemImage: "doc.text",
                iconColor: isSelected ? .white : Color.epheAccent.opacity(0.72)
            )
            .foregroundStyle(isSelected ? .white : .primary)
            .frame(maxWidth: .infinity, minHeight: SidebarMetrics.rowHeight, alignment: .leading)
            .contentShape(Rectangle())
            .background {
                RoundedRectangle(cornerRadius: 7)
                    .fill(isSelected ? Color.accentColor : Color.clear)
            }
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, minHeight: SidebarMetrics.rowHeight, alignment: .leading)
        .contentShape(Rectangle())
    }
}

private struct SidebarFolderRow: View {
    var title: String

    var body: some View {
        SidebarIconLabel(title: title, systemImage: "folder.fill", iconColor: Color.epheAccent)
            .foregroundStyle(.primary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(height: SidebarMetrics.rowHeight)
    }
}

private struct SidebarActionRow: View {
    var title: String
    var systemImage: String
    var action: () -> Void

    var body: some View {
        Button(action: action) {
            SidebarIconLabel(title: title, systemImage: systemImage, iconColor: Color.epheAccent)
                .foregroundStyle(.primary)
                .frame(maxWidth: .infinity, minHeight: SidebarMetrics.rowHeight, alignment: .leading)
                .contentShape(Rectangle())
        }
        .buttonStyle(.plain)
        .frame(maxWidth: .infinity, minHeight: SidebarMetrics.rowHeight, alignment: .leading)
        .contentShape(Rectangle())
    }
}

private struct SidebarMutedRow: View {
    var title: String
    var systemImage: String

    var body: some View {
        SidebarIconLabel(title: title, systemImage: systemImage, iconColor: .secondary)
            .foregroundStyle(.secondary)
            .frame(maxWidth: .infinity, alignment: .leading)
            .frame(height: SidebarMetrics.rowHeight)
    }
}

private struct SidebarIconLabel: View {
    var title: String
    var systemImage: String
    var iconColor: Color

    var body: some View {
        HStack(spacing: 7) {
            Image(systemName: systemImage)
                .font(.system(size: 12, weight: .medium))
                .foregroundStyle(iconColor)
                .frame(width: 15)

            Text(title)
                .font(.system(size: 13))
                .lineLimit(1)
                .frame(maxWidth: .infinity, alignment: .leading)
        }
        .padding(.horizontal, SidebarMetrics.rowHorizontalPadding)
        .padding(.vertical, SidebarMetrics.rowVerticalPadding)
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
    var inspectorVisible: Bool
    var toggleSidebar: () -> Void
    var toggleInspector: () -> Void

    var body: some ToolbarContent {
        ToolbarItemGroup(placement: .navigation) {
            Button(action: toggleSidebar) {
                Image(systemName: "sidebar.left")
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("toggle-sidebar-button")
            .help(sidebarVisible ? "Hide Sidebar" : "Show Sidebar")

            Button {
                session.createNote()
            } label: {
                Image(systemName: "plus")
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("new-note-button")
            .help("New Note")
            .disabled(session.vault == nil)

            Button {
                session.openVaultWithPanel()
            } label: {
                Image(systemName: "folder")
            }
            .buttonStyle(.plain)
            .help("Open Vault")
        }

        ToolbarItem(placement: .principal) {
            HeaderTitle(title: session.document?.title)
        }

        ToolbarItemGroup(placement: .primaryAction) {
            Button(action: toggleInspector) {
                Image(systemName: "list.bullet.rectangle")
            }
            .buttonStyle(.plain)
            .accessibilityIdentifier("toggle-inspector-button")
            .help(inspectorVisible ? "Hide Details" : "Show Details")
        }
    }
}

private struct HeaderTitle: View {
    var title: String?

    var body: some View {
        if let title, !title.isEmpty {
            Text(title)
                .font(.system(size: 14, weight: .semibold))
                .foregroundStyle(.primary)
                .lineLimit(1)
                .frame(maxWidth: 520, alignment: .center)
                .help(title)
        } else {
            Color.clear
                .frame(width: 1, height: 1)
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

    var body: some View {
        MarkdownDecoratedTextEditor(text: Binding(
            get: { session.document?.content ?? "" },
            set: { session.updateContent($0) }
        ), onWikiLink: { link in
            session.openWikiLink(link)
        })
        .padding(.horizontal, 28)
        .padding(.bottom, 22)
    }
}

private struct InspectorFloatingPanel: View {
    @EnvironmentObject private var session: EditorSession

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
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
                        SidebarIconLabel(title: entry.title, systemImage: "doc.text", iconColor: Color.epheAccent.opacity(0.72))
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
