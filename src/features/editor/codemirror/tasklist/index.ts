import { Extension } from "@codemirror/state";
import { EditorView } from "@codemirror/view";

// Auto-complete checklist items: converts '-[' or '- [' to '- [ ] '
export const checklistAutoComplete: Extension = EditorView.inputHandler.of((view, from, to, text) => {
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

    // Dispatch the transaction to replace the trigger pattern with the checklist item
    view.dispatch({
      changes: {
        from: insertFrom,
        to: from,
        insert: "- [ ] ",
      },
      // Place the cursor after the inserted checklist item "- [ ] "
      selection: { anchor: insertFrom + 6 },
    });
    // Indicate that the input event was handled
    return true;
  }

  // If the pattern doesn't match, let the default input handling proceed
  return false;
});

// Task list pattern regex for identifying task list lines
const taskListPattern = /^(\s*)[-*] \[\s*([xX ])\s*\]/;

// Toggle task status on click
const toggleTaskStatus = (view: EditorView, pos: number): boolean => {
  const { state } = view;
  const { doc } = state;
  const line = doc.lineAt(pos);
  const lineText = line.text;

  const match = lineText.match(taskListPattern);
  if (!match) return false;

  // Find exact checkbox position by searching for the bracket pattern
  const checkStart = lineText.indexOf("- [");
  if (checkStart === -1) return false;

  const checkboxPos = line.from + checkStart + 3; // Position right after "- ["

  // Toggle the checkbox state
  const currentChar = doc.sliceString(checkboxPos, checkboxPos + 1);
  const newState = currentChar === " " ? "x" : " ";

  view.dispatch({
    changes: {
      from: checkboxPos,
      to: checkboxPos + 1,
      insert: newState,
    },
  });

  return true;
};

// Handler for mouse clicks on checkboxes
const handleTaskClick: Extension = EditorView.domEventHandlers({
  click: (event, view) => {
    // Get position from event
    const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
    if (pos === null) return false;

    // Check if we're in a line with a task
    const { state } = view;
    const { doc } = state;
    const line = doc.lineAt(pos);
    const lineText = line.text;

    if (!taskListPattern.test(lineText)) return false;

    // Check if click is on the checkbox
    const match = lineText.match(taskListPattern);
    if (!match) return false;

    const indentLength = match[1].length;
    const checkboxStart = line.from + indentLength;
    const checkboxEnd = checkboxStart + 4; // "- [ " length

    if (pos >= checkboxStart && pos <= checkboxEnd) {
      return toggleTaskStatus(view, pos);
    }

    return false;
  },
});

// Export all extensions together
export const taskListExtensions: Extension = [checklistAutoComplete, handleTaskClick];
