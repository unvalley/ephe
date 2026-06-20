import SwiftUI

@main
struct EpheMacApp: App {
    @StateObject private var session = EditorSession()
    @AppStorage(AppPreferenceKeys.theme) private var themeRawValue = EpheTheme.system.rawValue
    @AppStorage(AppPreferenceKeys.editorFont) private var editorFontRawValue = EditorFontChoice.iaWriterMono.rawValue

    var body: some Scene {
        WindowGroup("") {
            ContentView()
                .environmentObject(session)
                .preferredColorScheme(selectedTheme.colorScheme)
                .task {
                    if let vaultPath = ProcessInfo.processInfo.value(after: "--uitest-vault") {
                        try? session.openVault(at: URL(fileURLWithPath: vaultPath, isDirectory: true))
                    } else {
                        session.reopenLastVaultIfAvailable()
                    }
                }
        }
        .commands {
            CommandMenu("Vault") {
                Button("Open Vault...") {
                    session.openVaultWithPanel()
                }
                .keyboardShortcut("o", modifiers: [.command, .shift])

                Button("New Note") {
                    session.createNote()
                }
                .keyboardShortcut("n", modifiers: [.command])
            }

            CommandMenu("Editor") {
                Button("Save") {
                    try? session.formatAndSaveSelectedNote()
                }
                .keyboardShortcut("s", modifiers: [.command])

                Button("Command Palette") {
                    session.commandPalettePresented = true
                }
                .keyboardShortcut("k", modifiers: [.command])
            }

            CommandMenu("Appearance") {
                Picker("Theme", selection: $themeRawValue) {
                    ForEach(EpheTheme.allCases) { theme in
                        Text(theme.title).tag(theme.rawValue)
                    }
                }

                Picker("Editor Font", selection: $editorFontRawValue) {
                    ForEach(EditorFontChoice.allCases) { font in
                        Text(font.title).tag(font.rawValue)
                    }
                }
            }
        }
    }

    private var selectedTheme: EpheTheme {
        EpheTheme(rawValue: themeRawValue) ?? .system
    }
}

private extension EpheTheme {
    var colorScheme: ColorScheme? {
        switch self {
        case .system: nil
        case .light: .light
        case .dark: .dark
        }
    }
}

private extension ProcessInfo {
    func value(after flag: String) -> String? {
        guard let index = arguments.firstIndex(of: flag), arguments.indices.contains(arguments.index(after: index)) else {
            return nil
        }
        return arguments[arguments.index(after: index)]
    }
}
