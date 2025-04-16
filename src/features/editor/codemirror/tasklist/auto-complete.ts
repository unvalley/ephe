import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

// Auto-complete task items: converts '-[' or '- [' to '- [ ] '
export const taskAutoComplete: Extension = EditorView.inputHandler.of((view, from, to, text) => {
  // Handle only the insertion of '['
  if (text !== "[") return false;

  // If from !== to, it means a selection is being replaced, so don't autocomplete.
  // Also, ensure the insertion happens at a single point.
  if (from !== to) return false;

  const doc = view.state.doc;
  // Cannot check prefix if at the very beginning of the document
  if (from === 0) return false;

  const line = doc.lineAt(from);
  // Get the text from the start of the line up to the cursor position (before '[' is inserted)
  const linePrefix = doc.sliceString(line.from, from);

  // Check for the patterns right before the cursor
  const hasDashSpace = linePrefix.endsWith("- ");
  // Ensure it's just '-' and not '- ' to avoid matching '- -['
  const hasDash = linePrefix.endsWith("-") && !hasDashSpace;

  if (hasDash || hasDashSpace) {
    const insertFrom = hasDash
      ? from - 1 // Start replacing from the '-'
      : from - 2; // Start replacing from the '- '

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

  // If the pattern doesn't match, let the default input handling proceed
  return false;
});
