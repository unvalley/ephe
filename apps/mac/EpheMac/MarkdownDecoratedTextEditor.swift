import AppKit
import SwiftUI

struct MarkdownDecoratedTextEditor: NSViewRepresentable {
    @Binding var text: String
    var onWikiLink: (WikiLink) -> Void

    func makeCoordinator() -> Coordinator {
        Coordinator(text: $text, onWikiLink: onWikiLink)
    }

    func makeNSView(context: Context) -> MarkdownEditorScrollView {
        let scrollView = MarkdownEditorScrollView()
        let textView = scrollView.textView
        textView.delegate = context.coordinator
        textView.activateWikiLink = onWikiLink
        textView.string = text
        textView.setAccessibilityIdentifier("markdown-editor")
        context.coordinator.applyBaseAttributes(to: textView)
        if !context.coordinator.applyCachedHighlightingIfAvailable(to: textView) {
            context.coordinator.scheduleHighlighting(to: textView, delay: .milliseconds(16))
        }
        return scrollView
    }

    func updateNSView(_ scrollView: MarkdownEditorScrollView, context: Context) {
        context.coordinator.text = $text
        context.coordinator.onWikiLink = onWikiLink

        let textView = scrollView.textView
        textView.activateWikiLink = onWikiLink
        if textView.string != text {
            context.coordinator.isApplyingProgrammaticChange = true
            textView.string = text
            context.coordinator.isApplyingProgrammaticChange = false
            context.coordinator.applyBaseAttributes(to: textView)
            if !context.coordinator.applyCachedHighlightingIfAvailable(to: textView) {
                context.coordinator.scheduleHighlighting(to: textView, delay: .milliseconds(16))
            }
        } else {
            context.coordinator.scheduleHighlightingIfNeeded(to: textView)
        }
    }

    @MainActor
    final class Coordinator: NSObject, NSTextViewDelegate {
        private static let highlightCache = MarkdownHighlightCache()

        var text: Binding<String>
        var onWikiLink: (WikiLink) -> Void
        var isApplyingProgrammaticChange = false

        private let baseFont = NSFont.monospacedSystemFont(ofSize: 15, weight: .regular)
        private let codeFont = NSFont.monospacedSystemFont(ofSize: 14, weight: .regular)
        private let decoratedCharacterLimit = 120_000
        private var highlightTask: Task<Void, Never>?
        private var lastHighlightedString: String?
        private var pendingHighlightString: String?
        private var editedRange: NSRange?

        init(text: Binding<String>, onWikiLink: @escaping (WikiLink) -> Void) {
            self.text = text
            self.onWikiLink = onWikiLink
        }

        func textView(_ textView: NSTextView, shouldChangeTextIn affectedCharRange: NSRange, replacementString: String?) -> Bool {
            let replacementLength = (replacementString as NSString?)?.length ?? 0
            editedRange = NSRange(location: affectedCharRange.location, length: replacementLength)
            return true
        }

        func textDidChange(_ notification: Notification) {
            guard !isApplyingProgrammaticChange, let textView = notification.object as? NSTextView else { return }
            text.wrappedValue = textView.string
            scheduleHighlighting(to: textView, delay: .milliseconds(12), range: editedRange)
            editedRange = nil
        }

        func scheduleHighlightingIfNeeded(to textView: NSTextView) {
            guard lastHighlightedString != textView.string else { return }
            guard pendingHighlightString != textView.string else { return }
            if applyCachedHighlightingIfAvailable(to: textView) { return }
            scheduleHighlighting(to: textView, delay: .milliseconds(16))
        }

        func scheduleHighlighting(to textView: NSTextView, delay: Duration, range: NSRange? = nil) {
            highlightTask?.cancel()
            pendingHighlightString = textView.string
            highlightTask = Task { @MainActor [weak self, weak textView] in
                if delay != .zero {
                    try? await Task.sleep(for: delay)
                }
                guard let self else { return }
                self.pendingHighlightString = nil
                guard !Task.isCancelled, let textView else { return }
                self.applyHighlighting(to: textView, range: range)
            }
        }

        func applyBaseAttributes(to textView: NSTextView) {
            textView.font = baseFont
            textView.textColor = NSColor.textColor
            textView.typingAttributes = baseAttributes
            lastHighlightedString = nil
        }

        func applyCachedHighlightingIfAvailable(to textView: NSTextView) -> Bool {
            let string = textView.string
            guard let attributedString = Self.highlightCache.attributedString(for: string) else {
                return false
            }
            guard let storage = textView.textStorage else { return false }
            let selectedRanges = textView.selectedRanges
            storage.beginEditing()
            storage.setAttributedString(attributedString)
            storage.endEditing()
            lastHighlightedString = string
            pendingHighlightString = nil
            textView.selectedRanges = selectedRanges
            textView.typingAttributes = baseAttributes
            return true
        }

        #if DEBUG
        func applyHighlightingForBenchmark(to textView: NSTextView, range: NSRange? = nil) {
            applyHighlighting(to: textView, range: range)
        }
        #endif

        private func applyHighlighting(to textView: NSTextView, range requestedRange: NSRange?) {
            let string = textView.string
            guard requestedRange != nil || lastHighlightedString != string else { return }
            let nsString = string as NSString
            let fullRange = NSRange(location: 0, length: nsString.length)
            guard fullRange.length > 0 else {
                lastHighlightedString = string
                textView.typingAttributes = baseAttributes
                return
            }

            let selectedRanges = textView.selectedRanges
            guard let storage = textView.textStorage else { return }
            guard requestedRange != nil || fullRange.length <= decoratedCharacterLimit else {
                lastHighlightedString = string
                textView.typingAttributes = baseAttributes
                return
            }
            let highlightRange = normalizedHighlightRange(requestedRange, in: nsString, fallback: fullRange)
            let features = HighlightFeatures(text: nsString.substring(with: highlightRange))

            storage.beginEditing()
            storage.setAttributes(baseAttributes, range: highlightRange)

            if features.hasHeading {
                MarkdownSyntax.headingRegex.enumerateMatches(in: string, range: highlightRange) { match, _, _ in
                    guard let match else { return }
                    let headingLevel = match.range(at: 1).length
                    storage.addAttributes([
                        .font: headingFont(for: headingLevel),
                        .foregroundColor: NSColor.labelColor,
                    ], range: match.range(at: 0))
                }
            }

            if features.hasBold {
                MarkdownSyntax.boldRegex.enumerateMatches(in: string, range: highlightRange) { match, _, _ in
                    guard let range = match?.range(at: 0) else { return }
                    addFontTrait(.boldFontMask, storage: storage, range: range)
                }
            }

            if features.hasItalic {
                MarkdownSyntax.italicRegex.enumerateMatches(in: string, range: highlightRange) { match, _, _ in
                    guard let range = match?.range(at: 0) else { return }
                    addFontTrait(.italicFontMask, storage: storage, range: range)
                }
            }

            if features.hasInlineCode {
                MarkdownSyntax.inlineCodeRegex.enumerateMatches(in: string, range: highlightRange) { match, _, _ in
                    guard let range = match?.range(at: 0) else { return }
                    storage.addAttributes([
                        .font: codeFont,
                        .foregroundColor: NSColor.controlTextColor,
                        .backgroundColor: NSColor.textColor.withAlphaComponent(0.06),
                    ], range: range)
                }
            }

            if features.hasStrikethrough {
                MarkdownSyntax.strikethroughRegex.enumerateMatches(in: string, range: highlightRange) { match, _, _ in
                    guard let range = match?.range(at: 0) else { return }
                    storage.addAttributes([
                        .strikethroughStyle: NSUnderlineStyle.single.rawValue,
                        .foregroundColor: NSColor.secondaryLabelColor,
                    ], range: range)
                }
            }

            var markdownLinkDestinationRanges: [NSRange] = []
            if features.hasMarkdownLink {
                MarkdownSyntax.markdownLinkRegex.enumerateMatches(in: string, range: highlightRange) { match, _, _ in
                    guard let match else { return }
                    let rawDestinationRange = match.range(at: 2)
                    markdownLinkDestinationRanges.append(rawDestinationRange)
                    var attributes: [NSAttributedString.Key: Any] = [
                        .foregroundColor: NSColor.systemBlue,
                        .underlineStyle: 0,
                    ]
                    if
                        let destinationRange = Range(rawDestinationRange, in: string),
                        let url = URL(string: String(string[destinationRange])),
                        let scheme = url.scheme?.lowercased(),
                        ["http", "https", "mailto"].contains(scheme)
                    {
                        attributes[.epheExternalURL] = url
                    }
                    storage.addAttributes(attributes, range: match.range(at: 0))
                }
            }

            if features.hasBareURL {
                MarkdownSyntax.bareURLRegex.enumerateMatches(in: string, range: highlightRange) { match, _, _ in
                    guard
                        let match,
                        let urlRange = Range(match.range(at: 0), in: string),
                        !markdownLinkDestinationRanges.contains(where: { NSIntersectionRange(match.range(at: 0), $0).length > 0 }),
                        let url = URL(string: String(string[urlRange]))
                    else {
                        return
                    }

                    storage.addAttributes([
                        .foregroundColor: NSColor.systemBlue,
                        .underlineStyle: 0,
                        .epheExternalURL: url,
                    ], range: match.range(at: 0))
                }
            }

            if features.hasWikiLink {
                MarkdownSyntax.wikiLinkRegex.enumerateMatches(in: string, range: highlightRange) { match, _, _ in
                    guard
                        let match,
                        match.numberOfRanges >= 2,
                        let bodyRange = Range(match.range(at: 1), in: string)
                    else {
                        return
                    }

                    let body = String(string[bodyRange]).trimmingCharacters(in: .whitespacesAndNewlines)
                    guard let wikiLink = MarkdownSyntax.parseWikiLink(body: body, sourceRange: match.range(at: 0)) else {
                        return
                    }

                    storage.addAttributes([
                        .foregroundColor: NSColor.systemBlue,
                        .epheWikiLink: WikiLinkAttribute(wikiLink),
                    ], range: match.range(at: 0))
                }
            }

            storage.endEditing()
            if requestedRange == nil {
                Self.highlightCache.store(storage.attributedSubstring(from: fullRange), for: string)
            }
            lastHighlightedString = string
            textView.selectedRanges = selectedRanges
            textView.typingAttributes = baseAttributes
        }

        private func normalizedHighlightRange(_ requestedRange: NSRange?, in string: NSString, fallback: NSRange) -> NSRange {
            guard var range = requestedRange else { return fallback }
            range.location = max(0, min(range.location, string.length))
            range.length = max(0, min(range.length, string.length - range.location))
            if range.length == 0, string.length > 0 {
                range.length = min(1, string.length - range.location)
            }
            let lineRange = string.lineRange(for: range)
            let previousLocation = max(0, lineRange.location - 1)
            let expandedStart = string.lineRange(for: NSRange(location: previousLocation, length: 0)).location
            let expandedEndSeed = min(string.length, NSMaxRange(lineRange) + 1)
            let expandedEnd = NSMaxRange(string.lineRange(for: NSRange(location: expandedEndSeed, length: 0)))
            return NSIntersectionRange(NSRange(location: expandedStart, length: expandedEnd - expandedStart), fallback)
        }

        private func headingFont(for level: Int) -> NSFont {
            let size: CGFloat
            switch level {
            case 1: size = 22
            case 2: size = 19
            case 3: size = 17
            default: size = 15
            }
            return NSFont.monospacedSystemFont(ofSize: size, weight: .bold)
        }

        private func addFontTrait(_ trait: NSFontTraitMask, storage: NSTextStorage, range: NSRange) {
            guard range.location < storage.length else { return }
            let currentFont = storage.attribute(.font, at: range.location, effectiveRange: nil) as? NSFont ?? baseFont
            let updatedFont = NSFontManager.shared.convert(currentFont, toHaveTrait: trait)
            storage.addAttribute(.font, value: updatedFont, range: range)
        }

        private var baseAttributes: [NSAttributedString.Key: Any] {
            [
                .font: baseFont,
                .foregroundColor: NSColor.textColor,
            ]
        }
    }
}

private struct HighlightFeatures {
    let hasHeading: Bool
    let hasBold: Bool
    let hasItalic: Bool
    let hasInlineCode: Bool
    let hasStrikethrough: Bool
    let hasMarkdownLink: Bool
    let hasBareURL: Bool
    let hasWikiLink: Bool

    init(text: String) {
        hasHeading = text.contains("#")
        hasBold = text.contains("**") || text.contains("__")
        hasItalic = text.contains("*") || text.contains("_")
        hasInlineCode = text.contains("`")
        hasStrikethrough = text.contains("~~")
        hasMarkdownLink = text.contains("](")
        hasBareURL = text.contains("http://") || text.contains("https://")
        hasWikiLink = text.contains("[[")
    }
}

@MainActor
private final class MarkdownHighlightCache {
    private struct Key: Hashable {
        let length: Int
        let hash: UInt64

        init(_ string: String) {
            length = (string as NSString).length
            var hash: UInt64 = 14_695_981_039_346_656_037
            for byte in string.utf8 {
                hash ^= UInt64(byte)
                hash &*= 1_099_511_628_211
            }
            self.hash = hash
        }
    }

    private struct Entry {
        let attributedString: NSAttributedString
        let cost: Int
    }

    private let entryCharacterLimit = 120_000
    private let totalCharacterLimit = 500_000
    private let countLimit = 24
    private var entries: [Key: Entry] = [:]
    private var mostRecentKeys: [Key] = []
    private var totalCost = 0

    func attributedString(for string: String) -> NSAttributedString? {
        let key = Key(string)
        guard let entry = entries[key] else { return nil }
        promote(key)
        return entry.attributedString.copy() as? NSAttributedString
    }

    func store(_ attributedString: NSAttributedString, for string: String) {
        let key = Key(string)
        let cost = key.length
        guard cost > 0, cost <= entryCharacterLimit else { return }
        if let existing = entries[key] {
            totalCost -= existing.cost
        }
        entries[key] = Entry(
            attributedString: attributedString.copy() as? NSAttributedString ?? attributedString,
            cost: cost
        )
        totalCost += cost
        promote(key)
        evictIfNeeded()
    }

    private func promote(_ key: Key) {
        mostRecentKeys.removeAll { $0 == key }
        mostRecentKeys.insert(key, at: 0)
    }

    private func evictIfNeeded() {
        while totalCost > totalCharacterLimit || entries.count > countLimit {
            guard let key = mostRecentKeys.popLast(), let entry = entries.removeValue(forKey: key) else {
                return
            }
            totalCost -= entry.cost
        }
    }
}

final class MarkdownEditorScrollView: NSScrollView {
    let textView = EpheMarkdownTextView()

    override init(frame frameRect: NSRect) {
        super.init(frame: frameRect)
        configure()
    }

    required init?(coder: NSCoder) {
        super.init(coder: coder)
        configure()
    }

    private func configure() {
        drawsBackground = false
        hasVerticalScroller = true
        hasHorizontalScroller = false
        borderType = .noBorder

        textView.minSize = NSSize(width: 0, height: 0)
        textView.maxSize = NSSize(width: CGFloat.greatestFiniteMagnitude, height: CGFloat.greatestFiniteMagnitude)
        textView.isVerticallyResizable = true
        textView.isHorizontallyResizable = false
        textView.autoresizingMask = [.width]
        textView.textContainer?.containerSize = NSSize(width: contentSize.width, height: CGFloat.greatestFiniteMagnitude)
        textView.textContainer?.widthTracksTextView = true
        textView.textContainerInset = NSSize(width: 18, height: 18)
        textView.drawsBackground = false
        textView.isRichText = false
        textView.isEditable = true
        textView.isSelectable = true
        textView.allowsUndo = true
        textView.isAutomaticLinkDetectionEnabled = false
        textView.isAutomaticDataDetectionEnabled = false
        textView.isAutomaticQuoteSubstitutionEnabled = false
        textView.isAutomaticDashSubstitutionEnabled = false

        documentView = textView
    }
}

final class EpheMarkdownTextView: NSTextView {
    private static weak var userFocusedTextView: EpheMarkdownTextView?
    var activateWikiLink: ((WikiLink) -> Void)?
    private var linkTrackingArea: NSTrackingArea?

    static var isUserEditingActive: Bool {
        guard let textView = userFocusedTextView else { return false }
        return textView.window?.firstResponder === textView
    }

    override func mouseDown(with event: NSEvent) {
        Self.userFocusedTextView = self
        if
            let linkAction = linkAction(at: event.locationInWindow),
            linkAction.canActivate(event.modifierFlags)
        {
            linkAction.activate()
            return
        }
        super.mouseDown(with: event)
    }

    override func mouseMoved(with event: NSEvent) {
        super.mouseMoved(with: event)
        toolTip = linkAction(at: event.locationInWindow)?.tooltip
    }

    override func updateTrackingAreas() {
        super.updateTrackingAreas()
        if let linkTrackingArea {
            removeTrackingArea(linkTrackingArea)
        }
        let trackingArea = NSTrackingArea(
            rect: .zero,
            options: [.activeInKeyWindow, .inVisibleRect, .mouseMoved],
            owner: self,
            userInfo: nil
        )
        addTrackingArea(trackingArea)
        linkTrackingArea = trackingArea
    }

    override func resignFirstResponder() -> Bool {
        if Self.userFocusedTextView === self {
            Self.userFocusedTextView = nil
        }
        return super.resignFirstResponder()
    }

    private func linkAction(at windowLocation: NSPoint) -> LinkAction? {
        guard
            let textStorage,
            textStorage.length > 0,
            let characterIndex = characterIndex(at: windowLocation),
            characterIndex < textStorage.length
        else {
            return nil
        }

        if let wikiLink = textStorage.attribute(.epheWikiLink, at: characterIndex, effectiveRange: nil) as? WikiLinkAttribute {
            let tooltip = attributedSubstringTooltip(at: characterIndex) ?? "Open wiki link"
            return LinkAction(
                tooltip: tooltip,
                canActivate: { _ in true },
                activate: { [weak self] in self?.activateWikiLink?(wikiLink.link) }
            )
        }

        if let url = textStorage.attribute(.epheExternalURL, at: characterIndex, effectiveRange: nil) as? URL {
            return LinkAction(
                tooltip: url.absoluteString,
                canActivate: { modifiers in modifiers.contains(.command) },
                activate: { NSWorkspace.shared.open(url) }
            )
        }

        return nil
    }

    private func characterIndex(at windowLocation: NSPoint) -> Int? {
        guard let layoutManager, let textContainer else { return nil }
        var location = convert(windowLocation, from: nil)
        location.x -= textContainerOrigin.x
        location.y -= textContainerOrigin.y
        guard location.x >= 0, location.y >= 0 else { return nil }

        var fraction: CGFloat = 0
        let glyphIndex = layoutManager.glyphIndex(
            for: location,
            in: textContainer,
            fractionOfDistanceThroughGlyph: &fraction
        )
        guard glyphIndex < layoutManager.numberOfGlyphs else { return nil }

        let glyphRect = layoutManager.boundingRect(forGlyphRange: NSRange(location: glyphIndex, length: 1), in: textContainer)
        guard glyphRect.insetBy(dx: -3, dy: -4).contains(location) else { return nil }
        return layoutManager.characterIndexForGlyph(at: glyphIndex)
    }

    private func attributedSubstringTooltip(at characterIndex: Int) -> String? {
        guard let textStorage else { return nil }
        var effectiveRange = NSRange(location: 0, length: 0)
        _ = textStorage.attribute(.epheWikiLink, at: characterIndex, effectiveRange: &effectiveRange)
        guard effectiveRange.length > 0, NSMaxRange(effectiveRange) <= textStorage.length else { return nil }
        return textStorage.attributedSubstring(from: effectiveRange).string
    }

    private struct LinkAction {
        var tooltip: String
        var canActivate: (NSEvent.ModifierFlags) -> Bool
        var activate: () -> Void
    }
}

private enum MarkdownSyntax {
    static let wikiLinkRegex = try! NSRegularExpression(pattern: #"\[\[([^\[\]\n]+)\]\]"#)
    static let headingRegex = try! NSRegularExpression(pattern: #"(?m)^(#{1,6})[ \t]+.+$"#)
    static let markdownLinkRegex = try! NSRegularExpression(pattern: #"\[([^\]\n]+)\]\(([^)\s]+)\)"#)
    static let bareURLRegex = try! NSRegularExpression(pattern: #"https?://[^\s<>\]\)\"']+"#)
    static let boldRegex = try! NSRegularExpression(pattern: #"(?s)(\*\*|__)(?=\S).+?(?<=\S)\1"#)
    static let italicRegex = try! NSRegularExpression(pattern: #"(?s)(?<!\*)\*(?!\*)(?=\S).+?(?<=\S)(?<!\*)\*(?!\*)|(?<!_)_(?!_)(?=\S).+?(?<=\S)(?<!_)_(?!_)"#)
    static let inlineCodeRegex = try! NSRegularExpression(pattern: #"`[^`\n]+`"#)
    static let strikethroughRegex = try! NSRegularExpression(pattern: #"~~(?=\S).+?(?<=\S)~~"#)

    static func parseWikiLink(body: String, sourceRange: NSRange) -> WikiLink? {
        let aliasSplit = body.split(separator: "|", maxSplits: 1, omittingEmptySubsequences: false)
        let targetAndHeading = String(aliasSplit.first ?? "")
        let alias = aliasSplit.count == 2 ? String(aliasSplit[1]).trimmingCharacters(in: .whitespacesAndNewlines) : nil
        let headingSplit = targetAndHeading.split(separator: "#", maxSplits: 1, omittingEmptySubsequences: false)
        let target = String(headingSplit.first ?? "").trimmingCharacters(in: .whitespacesAndNewlines)
        let heading = headingSplit.count == 2 ? String(headingSplit[1]).trimmingCharacters(in: .whitespacesAndNewlines) : nil
        guard !target.isEmpty else { return nil }

        return WikiLink(
            target: target,
            heading: heading?.nilIfEmpty,
            alias: alias?.nilIfEmpty,
            sourceRange: TextRange(lowerBound: sourceRange.location, upperBound: sourceRange.location + sourceRange.length)
        )
    }
}

private extension String {
    var nilIfEmpty: String? {
        isEmpty ? nil : self
    }
}

private extension NSAttributedString.Key {
    static let epheExternalURL = NSAttributedString.Key("ephe.externalURL")
    static let epheWikiLink = NSAttributedString.Key("ephe.wikiLink")
}

private final class WikiLinkAttribute: NSObject {
    let link: WikiLink

    init(_ link: WikiLink) {
        self.link = link
    }
}
