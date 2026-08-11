import { RangeSetBuilder, type Extension } from "@codemirror/state";
import { Decoration, EditorView, ViewPlugin, WidgetType, type DecorationSet, type ViewUpdate } from "@codemirror/view";
import { evaluateCalcDocument, formatCalcValue } from "./calc-document";

class CalcResultWidget extends WidgetType {
  constructor(private readonly formatted: string) {
    super();
  }

  eq(other: CalcResultWidget): boolean {
    return other.formatted === this.formatted;
  }

  toDOM(): HTMLElement {
    const dom = document.createElement("span");
    dom.className = "cm-calc-result";
    dom.textContent = `= ${this.formatted}`;
    dom.title = "Click to copy";
    dom.setAttribute("aria-hidden", "true");
    dom.addEventListener("mousedown", (event) => {
      // preventDefault keeps the editor selection (and focus) untouched.
      event.preventDefault();
      void navigator.clipboard?.writeText(this.formatted);
      dom.textContent = "copied";
      setTimeout(() => {
        dom.textContent = `= ${this.formatted}`;
      }, 800);
    });
    return dom;
  }
}

const buildCalcDecorations = (view: EditorView): DecorationSet => {
  const doc = view.state.doc;
  // Variables and aggregates depend on lines above, so the whole document is
  // evaluated even though only visible lines end up decorated.
  const lines = doc.toString().split("\n");
  const builder = new RangeSetBuilder<Decoration>();
  for (const result of evaluateCalcDocument(lines)) {
    const line = doc.line(result.index + 1);
    const widget = new CalcResultWidget(formatCalcValue(result.value));
    builder.add(line.to, line.to, Decoration.widget({ widget, side: 1 }));
  }
  return builder.finish();
};

const inlineCalcPlugin = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = buildCalcDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.decorations = buildCalcDecorations(update.view);
      }
    }
  },
  { decorations: (plugin) => plugin.decorations },
);

// opacity + currentColor keep the widget legible in both light and dark themes.
const inlineCalcTheme = EditorView.baseTheme({
  ".cm-calc-result": {
    marginLeft: "0.75em",
    padding: "0.05em 0.45em",
    borderRadius: "4px",
    fontSize: "0.85em",
    backgroundColor: "rgba(125, 125, 125, 0.14)",
    opacity: "0.75",
    cursor: "pointer",
    userSelect: "none",
    webkitUserSelect: "none",
  },
});

/**
 * Inline calculator: evaluates math lines, variable assignments, and
 * sum/average keywords, rendering results at the end of the line.
 */
export const inlineCalcExtension: Extension = [inlineCalcPlugin, inlineCalcTheme];
