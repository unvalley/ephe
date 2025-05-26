import { EditorView, Decoration, DecorationSet, ViewPlugin, ViewUpdate } from "@codemirror/view";
import { RangeSetBuilder } from "@codemirror/state";

const MARKDOWN_LINK_REGEX = /\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g;
const URL_REGEX = /https?:\/\/[^\s<>"{}|\\^`[\]()]+/g;

const urlDecoration = Decoration.mark({
  class: "cm-url",
  attributes: { style: "cursor: pointer;" },
});

type Range = { from: number; to: number };

const getMatchRanges = (text: string, regex: RegExp): Range[] =>
  Array.from(text.matchAll(regex))
    .filter((m) => m.index !== undefined)
    .map((m) => ({
      from: m.index!,
      to: m.index! + m[0].length,
    }));

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
        const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
        if (pos == null) return false;

        const { from, text } = view.state.doc.lineAt(pos);
        const offset = pos - from;

        for (const match of text.matchAll(MARKDOWN_LINK_REGEX)) {
          const index = match.index;
          if (index !== undefined && offset >= index && offset < index + match[0].length) {
            window.open(match[2], "_blank", "noopener,noreferrer");
            event.preventDefault();
            return true;
          }
        }

        for (const match of text.matchAll(URL_REGEX)) {
          const index = match.index;
          if (index !== undefined && offset >= index && offset < index + match[0].length) {
            window.open(match[0], "_blank", "noopener,noreferrer");
            event.preventDefault();
            return true;
          }
        }

        return false;
      },
    },
  },
);
