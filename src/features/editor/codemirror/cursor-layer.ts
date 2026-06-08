import type { Extension } from "@codemirror/state";
import { layer, RectangleMarker } from "@codemirror/view";

export const customCursorLayer = (): Extension =>
  layer({
    above: true,
    markers(view) {
      const { main, ranges } = view.state.selection;
      const markers: RectangleMarker[] = [];

      for (const range of ranges) {
        if (!range.empty) continue;
        const className = range === main ? "cm-cursor cm-cursor-primary" : "cm-cursor cm-cursor-secondary";
        markers.push(...RectangleMarker.forRange(view, className, range));
      }

      return markers;
    },
    update(update) {
      return update.docChanged || update.selectionSet || update.viewportChanged;
    },
    class: "cm-cursorLayer",
  });
