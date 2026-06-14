import { RangeSetBuilder, type Extension, type Text } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, type DecorationSet, type ViewUpdate } from "@codemirror/view";

export type ParagraphRange = {
  from: number;
  to: number;
};

const isBlankLine = (text: string): boolean => text.trim().length === 0;

/**
 * Returns the blank-line-delimited block containing `pos`.
 * A blank line forms its own (empty) range so nothing stays highlighted
 * while the cursor rests between paragraphs.
 */
export const getParagraphRange = (doc: Text, pos: number): ParagraphRange => {
  const line = doc.lineAt(pos);
  if (isBlankLine(line.text)) {
    return { from: line.from, to: line.to };
  }
  let first = line.number;
  while (first > 1 && !isBlankLine(doc.line(first - 1).text)) {
    first--;
  }
  let last = line.number;
  while (last < doc.lines && !isBlankLine(doc.line(last + 1).text)) {
    last++;
  }
  return { from: doc.line(first).from, to: doc.line(last).to };
};

const dimLineDecoration = Decoration.line({ class: "cm-focus-dim" });

const buildDimDecorations = (view: EditorView): DecorationSet => {
  const { state } = view;
  const paragraph = getParagraphRange(state.doc, state.selection.main.head);
  const builder = new RangeSetBuilder<Decoration>();
  for (const { from, to } of view.visibleRanges) {
    let pos = from;
    while (pos <= to) {
      const line = state.doc.lineAt(pos);
      if (line.to < paragraph.from || line.from > paragraph.to) {
        builder.add(line.from, line.from, dimLineDecoration);
      }
      pos = line.to + 1;
    }
  }
  return builder.finish();
};

// Rebuilds the dim decorations whenever the caret's paragraph or the visible
// range changes.
const focusModePlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildDimDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.selectionSet || update.viewportChanged) {
        this.decorations = buildDimDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

const focusModeTheme = EditorView.theme({
  // Transitions only fire on class toggles of existing lines (paragraph
  // boundary moves), not on fresh viewport renders — exactly what we want.
  ".cm-line": {
    transition: "opacity 200ms ease-out",
  },
  ".cm-focus-dim": {
    opacity: "0.35",
  },
});

/**
 * Focus writing mode: dims everything outside the paragraph being edited so
 * only the current block stays sharp.
 */
export const focusModeExtension: Extension = [focusModePlugin, focusModeTheme];
