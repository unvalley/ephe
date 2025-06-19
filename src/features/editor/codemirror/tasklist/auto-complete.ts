import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export const taskAutoComplete: Extension = EditorView.inputHandler.of((view, from, to, text) => {
  const isValidInput = text === " " && from === to && from >= 2;
  if (!isValidInput) return false;

  const doc = view.state.doc;
  const line = doc.lineAt(from);
  const linePrefix = doc.sliceString(line.from, from);

  const patterns = [
    { suffix: "- [", offset: 3 },
    { suffix: "-[", offset: 2 },
  ];

  const matchedPattern = patterns.find(({ suffix }) => linePrefix.endsWith(suffix));
  if (!matchedPattern) return false;

  const insertFrom = from - matchedPattern.offset;
  if (insertFrom < line.from) return false;

  const replacement = "- [ ] ";

  view.dispatch({
    changes: {
      from: insertFrom,
      to: from,
      insert: replacement,
    },
    selection: { anchor: insertFrom + replacement.length },
  });

  return true;
});
