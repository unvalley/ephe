import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export const taskAutoComplete: Extension = EditorView.inputHandler.of((view, from, to, text) => {
  const isValidInput = text === " " && from === to && from >= 2;
  if (!isValidInput) return false;

  const doc = view.state.doc;
  const line = doc.lineAt(from);
  const linePrefix = doc.sliceString(line.from, from);
  const match = linePrefix.match(/-\s?\[$/);
  if (!match) return false;

  const insertFrom = from - match[0].length;
  if (insertFrom < line.from) return false;

  const replacement = "- [ ] ";
  // don't add waste `]`
  const replaceTo = from < line.to && doc.sliceString(from, from + 1) === "]" ? from + 1 : from;

  view.dispatch({
    changes: {
      from: insertFrom,
      to: replaceTo,
      insert: replacement,
    },
    selection: { anchor: insertFrom + replacement.length },
  });

  return true;
});
