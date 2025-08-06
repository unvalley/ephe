import {
  type EditorView,
  Decoration,
  type DecorationSet,
  ViewPlugin,
  type ViewUpdate,
  hoverTooltip,
} from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";
import { getModifierKeyName, isLinkActivationModifier } from "../../../utils/platform";

const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]()]+/g;

const urlDecoration = Decoration.mark({
  attributes: {
    style: "text-decoration: underline; text-underline-offset: 2px;",
  },
});

type Range = { from: number; to: number };

const getMatchRanges = (text: string, regex: RegExp): Range[] =>
  Array.from(text.matchAll(regex)).flatMap((m) =>
    m.index !== undefined
      ? [
          {
            from: m.index,
            to: m.index + m[0].length,
          },
        ]
      : [],
  );

const overlaps = (a: Range, b: Range) => !(a.to <= b.from || a.from >= b.to);

const createUrlDecorations = (view: EditorView): DecorationSet => {
  const builder = new RangeSetBuilder<Decoration>();
  const doc = view.state.doc;

  for (let i = 1; i <= doc.lines; i++) {
    const { from: lineStart, text } = doc.line(i);
    const mdRanges = getMatchRanges(text, MARKDOWN_LINK_REGEX);

    for (const { from, to } of mdRanges) {
      builder.add(lineStart + from, lineStart + to, urlDecoration);
    }

    const urlRanges = getMatchRanges(text, URL_REGEX).filter((range) => !mdRanges.some((md) => overlaps(range, md)));

    for (const { from, to } of urlRanges) {
      builder.add(lineStart + from, lineStart + to, urlDecoration);
    }
  }

  return builder.finish();
};

const findUrlAtPos = (view: EditorView, pos: number): { url: string; from: number; to: number } | null => {
  const { from: lineFrom, text } = view.state.doc.lineAt(pos);
  const offset = pos - lineFrom;

  for (const match of text.matchAll(MARKDOWN_LINK_REGEX)) {
    const index = match.index;
    if (index !== undefined && offset >= index && offset < index + match[0].length) {
      return {
        url: match[2],
        from: lineFrom + index,
        to: lineFrom + index + match[0].length,
      };
    }
  }

  for (const match of text.matchAll(URL_REGEX)) {
    const index = match.index;
    if (index !== undefined && offset >= index && offset < index + match[0].length) {
      return {
        url: match[0],
        from: lineFrom + index,
        to: lineFrom + index + match[0].length,
      };
    }
  }

  return null;
};

// Create tooltip DOM node once
const tooltipDom = document.createElement("div");
tooltipDom.textContent = `${getModifierKeyName()}+Click to open link`;

export const urlHoverTooltip = hoverTooltip((view, pos) => {
  const urlInfo = findUrlAtPos(view, pos);
  if (!urlInfo) return null;

  return {
    pos: urlInfo.from,
    end: urlInfo.to,
    above: true,
    create: () => ({ dom: tooltipDom }),
  };
});

export const urlClickPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = createUrlDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = createUrlDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
    eventHandlers: {
      mousedown: (event, view) => {
        if (!isLinkActivationModifier(event)) return false;

        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos == null) return false;

        const urlInfo = findUrlAtPos(view, pos);
        if (!urlInfo) return false;

        window.open(urlInfo.url, "_blank", "noopener,noreferrer")?.focus();
        event.preventDefault();
        return true;
      },
    },
  },
);
