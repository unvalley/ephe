import XCTest

final class EpheMacUITests: XCTestCase {
    private var vaultURL: URL!

    override func setUpWithError() throws {
        continueAfterFailure = false
        vaultURL = FileManager.default.temporaryDirectory.appending(path: "EpheMacUITests-\(UUID().uuidString)", directoryHint: .isDirectory)
        try FileManager.default.createDirectory(at: vaultURL, withIntermediateDirectories: true)
        try "# Home\n[[Project]]\n[[Missing]]\n".write(to: vaultURL.appending(path: "Home.md"), atomically: true, encoding: .utf8)
        try "# Project\n".write(to: vaultURL.appending(path: "Project.md"), atomically: true, encoding: .utf8)
    }

    override func tearDownWithError() throws {
        if let vaultURL {
            try? FileManager.default.removeItem(at: vaultURL)
        }
    }

    @MainActor
    func testOpenFixtureVaultAndShowBacklink() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-vault", vaultURL.path(percentEncoded: false)]
        app.launch()

        let projectRow = app.descendants(matching: .any)["note-row-Project.md"].firstMatch
        XCTAssertTrue(projectRow.waitForExistence(timeout: 5))
        projectRow.click()

        let inspectorButton = app.descendants(matching: .any)["toggle-inspector-button"].firstMatch
        XCTAssertTrue(inspectorButton.waitForExistence(timeout: 2))
        inspectorButton.click()

        XCTAssertTrue(app.buttons["backlink-Home.md"].firstMatch.waitForExistence(timeout: 2))
    }

    @MainActor
    func testNewButtonCreatesAndSelectsUntitledNote() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-vault", vaultURL.path(percentEncoded: false)]
        app.launch()

        app.typeKey("n", modifierFlags: [.command])

        XCTAssertTrue(app.descendants(matching: .any)["note-row-Untitled.md"].firstMatch.waitForExistence(timeout: 5))
        XCTAssertTrue(FileManager.default.fileExists(atPath: vaultURL.appending(path: "Untitled.md").path(percentEncoded: false)))
    }

    @MainActor
    func testToolbarNavigationButtonsMoveThroughOpenedFileHistory() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-vault", vaultURL.path(percentEncoded: false)]
        app.launch()

        let homeRow = app.descendants(matching: .any)["note-row-Home.md"].firstMatch
        let projectRow = app.descendants(matching: .any)["note-row-Project.md"].firstMatch
        XCTAssertTrue(homeRow.waitForExistence(timeout: 5))
        XCTAssertTrue(projectRow.waitForExistence(timeout: 5))

        homeRow.click()
        let editor = app.textViews["markdown-editor"].firstMatch
        XCTAssertTrue(waitUntilTextViewContains(editor, text: "# Home", timeout: 5))

        projectRow.click()
        XCTAssertTrue(waitUntilTextViewContains(editor, text: "# Project", timeout: 5))

        let backButton = app.descendants(matching: .any)["navigate-back-button"].firstMatch
        XCTAssertTrue(backButton.waitForExistence(timeout: 2))
        backButton.click()
        XCTAssertTrue(waitUntilTextViewContains(editor, text: "# Home", timeout: 5))

        let forwardButton = app.descendants(matching: .any)["navigate-forward-button"].firstMatch
        XCTAssertTrue(forwardButton.waitForExistence(timeout: 2))
        forwardButton.click()
        XCTAssertTrue(waitUntilTextViewContains(editor, text: "# Project", timeout: 5))
    }

    @MainActor
    func testArrowKeysMoveSidebarSelection() throws {
        let app = XCUIApplication()
        app.launchArguments = ["--uitest-vault", vaultURL.path(percentEncoded: false)]
        app.launch()

        XCTAssertTrue(app.descendants(matching: .any)["note-row-Home.md"].firstMatch.waitForExistence(timeout: 5))

        app.typeKey(.downArrow, modifierFlags: [])
        let editor = app.textViews["markdown-editor"].firstMatch
        XCTAssertTrue(waitUntilTextViewContains(editor, text: "# Home", timeout: 5))

        app.typeKey(.downArrow, modifierFlags: [])
        XCTAssertTrue(waitUntilTextViewContains(editor, text: "# Project", timeout: 5))
    }

    @MainActor
    func testBenchmarkRealVaultOpen() throws {
        let pathFile = URL(fileURLWithPath: "/tmp/ephe-ui-benchmark-vault-path")
        guard
            let vaultPath = try? String(contentsOf: pathFile, encoding: .utf8)
                .trimmingCharacters(in: .whitespacesAndNewlines),
            !vaultPath.isEmpty
        else {
            throw XCTSkip("Write /tmp/ephe-ui-benchmark-vault-path to benchmark UI open performance.")
        }

        let app = XCUIApplication()
        app.launchArguments = ["--uitest-vault", vaultPath]

        let launchStart = DispatchTime.now().uptimeNanoseconds
        app.launch()
        let launchMs = milliseconds(since: launchStart)

        let rowStart = DispatchTime.now().uptimeNanoseconds
        let noteRow = app.buttons.matching(NSPredicate(format: "identifier BEGINSWITH %@", "note-row-")).firstMatch
        XCTAssertTrue(waitUntilExists(noteRow, timeout: 15))
        let postLaunchRowMs = milliseconds(since: rowStart)
        let firstRowMs = milliseconds(since: launchStart)

        let editorStart = DispatchTime.now().uptimeNanoseconds
        noteRow.click()
        let editor = app.textViews["markdown-editor"].firstMatch
        XCTAssertTrue(waitUntilExists(editor, timeout: 15))
        XCTAssertTrue(waitUntilTextViewHasContent(editor, timeout: 15))
        let editorMs = milliseconds(since: editorStart)

        let summary = """
        EPHE_UI_BENCHMARK_SUMMARY vault="\(vaultPath)" launch_ms=\(format(launchMs)) post_launch_first_note_row_ms=\(format(postLaunchRowMs)) first_note_row_ms=\(format(firstRowMs)) clicked_note_editor_ms=\(format(editorMs))
        """
        print(summary)
        try? summary.write(to: FileManager.default.temporaryDirectory.appending(path: "ephe-ui-benchmark-results.txt"), atomically: true, encoding: .utf8)
    }

    private func milliseconds(since start: UInt64) -> Double {
        Double(DispatchTime.now().uptimeNanoseconds - start) / 1_000_000
    }

    private func format(_ value: Double) -> String {
        String(format: "%.2f", value)
    }

    @MainActor
    private func waitUntilExists(_ element: XCUIElement, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if element.exists {
                return true
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.02))
        }
        return element.exists
    }

    @MainActor
    private func waitUntilTextViewHasContent(_ element: XCUIElement, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if let value = element.value as? String, !value.isEmpty {
                return true
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.02))
        }
        return (element.value as? String)?.isEmpty == false
    }

    @MainActor
    private func waitUntilTextViewContains(_ element: XCUIElement, text: String, timeout: TimeInterval) -> Bool {
        let deadline = Date().addingTimeInterval(timeout)
        while Date() < deadline {
            if let value = element.value as? String, value.contains(text) {
                return true
            }
            RunLoop.current.run(until: Date().addingTimeInterval(0.02))
        }
        return (element.value as? String)?.contains(text) == true
    }
}
