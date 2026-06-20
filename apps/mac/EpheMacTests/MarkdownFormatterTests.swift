import XCTest
@testable import EpheMac

final class MarkdownFormatterTests: XCTestCase {
    func testFormatNormalizesWhitespaceAndFinalNewline() {
        let input = "# Title  \r\n\r\n\r\nBody\t\r\n"

        XCTAssertEqual(MarkdownFormatter.format(input), "# Title\n\nBody\n")
    }

    func testFormatPreservesFencedCodeWhitespace() {
        let input = "```swift\nlet value = 1  \n```\n\n\nNext"

        XCTAssertEqual(MarkdownFormatter.format(input), "```swift\nlet value = 1  \n```\n\nNext\n")
    }
}
