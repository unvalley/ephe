import SwiftUI

@main
struct EpheMacApp: App {
    @StateObject private var session = EditorSession()

    var body: some Scene {
        WindowGroup("") {
            ContentView()
                .environmentObject(session)
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
                    try? session.saveSelectedNote()
                }
                .keyboardShortcut("s", modifiers: [.command])

                Button("Command Palette") {
                    session.commandPalettePresented = true
                }
                .keyboardShortcut("k", modifiers: [.command])
            }
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
