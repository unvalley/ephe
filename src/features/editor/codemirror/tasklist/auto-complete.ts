import type { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

// Auto-complete task items: converts both '- [ ' and '-[ ' to '- [ ] '.
// Initially, `-[` was used to trigger the auto-complete, but this was conflicting with the `- []()` link syntax in lists.
export const taskAutoComplete: Extension = EditorView.inputHandler.of((view, from, to, text) => {
  // Handle only the insertion of ' ' (space)
  if (text !== " ") return false;

  // If from !== to, it means a selection is being replaced, so don't autocomplete.
  // Also, ensure the insertion happens at a single point.
  if (from !== to) return false;

  const doc = view.state.doc;
  // Cannot check prefix if at the very beginning of the document
  if (from < 2) return false; // Need at least 2 characters for "-["

  const line = doc.lineAt(from);
  // Get the text from the start of the line up to the cursor position (before space is inserted)
  const linePrefix = doc.sliceString(line.from, from);

  // Check for the pattern "- [" (3 characters) right before the cursor
  if (linePrefix.endsWith("- [")) {
    const insertFrom = from - 3; // Start replacing from the "- ["

    // Basic safety check: ensure insertFrom is not before the line start
    if (insertFrom < line.from) return false;

    // Dispatch the transaction to replace the trigger pattern with the task item
    view.dispatch({
      changes: {
        from: insertFrom,
        to: from,
        insert: "- [ ] ",
      },
      // Place the cursor after the inserted task item "- [ ] "
      selection: { anchor: insertFrom + 6 },
    });
    // Indicate that the input event was handled
    return true;
  }

  // Check for the pattern "-[" (2 characters) right before the cursor
  if (linePrefix.endsWith("-[")) {
    const insertFrom = from - 2; // Start replacing from the "-["

    // Basic safety check: ensure insertFrom is not before the line start
    if (insertFrom < line.from) return false;

    // Dispatch the transaction to replace the trigger pattern with the task item
    view.dispatch({
      changes: {
        from: insertFrom,
        to: from,
        insert: "- [ ] ",
      },
      // Place the cursor after the inserted task item "- [ ] "
      selection: { anchor: insertFrom + 6 },
    });
    // Indicate that the input event was handled
    return true;
  }

  // If neither pattern matches, let the default input handling proceed
  return false;
});
