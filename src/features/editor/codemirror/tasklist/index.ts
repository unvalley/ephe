import { Extension } from "@codemirror/state";
import { checkboxDecoration, checkboxHoverField, checkboxMouseInteraction } from "./close-task";
import { checkboxKeyMap  } from "./keymap";
import { checkboxAutoComplete } from "./auto-complete";

export const checklistPlugin: Extension = [
  checkboxDecoration,
  checkboxHoverField,
  checkboxMouseInteraction,
  checkboxAutoComplete,
  checkboxKeyMap
];

// Task list pattern regex for identifying task list lines
// const taskListPattern = /^(\s*)[-*] \[\s*([xX ])\s*\]/;

// // Toggle task status on click
// const toggleTaskStatus = (view: EditorView, pos: number): boolean => {
//   const { state } = view;
//   const { doc } = state;
//   const line = doc.lineAt(pos);
//   const lineText = line.text;

//   const match = lineText.match(taskListPattern);
//   if (!match) return false;

//   // Find exact checkbox position by searching for the bracket pattern
//   const checkStart = lineText.indexOf("- [");
//   if (checkStart === -1) return false;

//   const checkboxPos = line.from + checkStart + 3; // Position right after "- ["

//   // Toggle the checkbox state
//   const currentChar = doc.sliceString(checkboxPos, checkboxPos + 1);
//   const newState = currentChar === " " ? "x" : " ";

//   view.dispatch({
//     changes: {
//       from: checkboxPos,
//       to: checkboxPos + 1,
//       insert: newState,
//     },
//   });

//   return true;
// };

// Handler for mouse clicks on checkboxes
// export const handleTaskClick: Extension = EditorView.domEventHandlers({
//   click: (event, view) => {
//     // Get position from event
//     const pos = view.posAtCoords({ x: event.clientX, y: event.clientY });
//     if (pos === null) return false;

//     // Check if we're in a line with a task
//     const { state } = view;
//     const { doc } = state;
//     const line = doc.lineAt(pos);
//     const lineText = line.text;

//     if (!taskListPattern.test(lineText)) return false;

//     // Check if click is on the checkbox
//     const match = lineText.match(taskListPattern);
//     if (!match) return false;

//     const indentLength = match[1].length;
//     const checkboxStart = line.from + indentLength;
//     const checkboxEnd = checkboxStart + 4; // "- [ " length

//     if (pos >= checkboxStart && pos <= checkboxEnd) {
//       return toggleTaskStatus(view, pos);
//     }

//     return false;
//   },
// });
