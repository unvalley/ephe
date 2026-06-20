import Foundation

enum MarkdownFormatter {
    static func format(_ content: String) -> String {
        let normalized = content
            .replacingOccurrences(of: "\r\n", with: "\n")
            .replacingOccurrences(of: "\r", with: "\n")
        var lines = normalized.split(separator: "\n", omittingEmptySubsequences: false).map(String.init)
        while lines.last == "" {
            lines.removeLast()
        }

        var formattedLines: [String] = []
        var blankLineCount = 0
        var inFencedCodeBlock = false

        for rawLine in lines {
            let fenceCandidate = rawLine.trimmingCharacters(in: .whitespaces)
            let isFence = fenceCandidate.hasPrefix("```") || fenceCandidate.hasPrefix("~~~")
            let line = inFencedCodeBlock ? rawLine : rawLine.trimmingTrailingWhitespace
            let isBlank = line.trimmingCharacters(in: .whitespaces).isEmpty

            if isBlank {
                blankLineCount += 1
                if blankLineCount == 1 {
                    formattedLines.append("")
                }
            } else {
                blankLineCount = 0
                formattedLines.append(line)
            }

            if isFence {
                inFencedCodeBlock.toggle()
            }
        }

        guard !formattedLines.isEmpty else { return "" }
        return formattedLines.joined(separator: "\n") + "\n"
    }
}

private extension String {
    var trimmingTrailingWhitespace: String {
        var end = endIndex
        while end > startIndex {
            let previous = index(before: end)
            guard self[previous] == " " || self[previous] == "\t" else { break }
            end = previous
        }
        return String(self[..<end])
    }
}
