import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

export const taskAutoComplete: Extension = EditorView.inputHandler.of((view, from, to, text) => {
  const isWhitespaceInput = from === to && text.length > 0 && /^[ \t]+$/.test(text);
  if (!isWhitespaceInput) return false;

  const doc = view.state.doc;
  const line = doc.lineAt(from);
  const before = doc.sliceString(line.from, from);
  const after = doc.sliceString(from, line.to);

  const bulletMatch = before.match(/[-*]\s*\[$/);
  if (!bulletMatch) return false;

  const bulletStart = before.length - bulletMatch[0].length;
  const indent = before.slice(0, bulletStart);
  if (!/^[ \t]*$/.test(indent)) return false;

  // Avoid re-triggering on existing task list items like "- [ ]" or "- [x]"
  if (/^[ \t]*(?:[xX]\]| \])/.test(after)) return false;

  const insertFrom = line.from;
  const bullet = bulletMatch[0][0];
  const replacement = `${indent}${bullet} [ ] `;
  // don't remove waste `]`
  const replaceTo = after.startsWith("]") && from + 1 <= line.to ? from + 1 : from;

  view.dispatch({
    changes: {
      from: insertFrom,
      to: replaceTo,
      insert: replacement,
    },
    userEvent: "input.taskAutoComplete",
    selection: { anchor: insertFrom + replacement.length },
  });

  return true;
});
