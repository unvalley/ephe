import { indentMore, indentLess } from "@codemirror/commands";
import { KeyBinding, EditorView } from "@codemirror/view";

// チェックリスト行の開始部分を判定 (行頭空白とマーカー)
const checklistLineStartRegex = /^(\s*)(?:[-*])\s*\[[ x]\]\s*/;

const INDENT_SPACE = "  ";

export const checklistIndentKeymap: readonly KeyBinding[] = [
  {
    key: "Tab",
    run: (view: EditorView): boolean => {
      const { state } = view;
      if (state.readOnly || state.selection.ranges.length > 1) return false;
      const { head, empty } = state.selection.main;

      if (!empty) {
        return indentMore(view);
      }

      const line = state.doc.lineAt(head);
      // 行がチェックリスト項目で、かつカーソルが行頭からチェックボックスの直後までにある場合
      // (より単純に、チェックリスト行であればどこでもインデントを許可しても良いかもしれない)
      const match = line.text.match(checklistLineStartRegex);
      if (match && head <= line.from + match[0].length) {
        // 行頭にインデント単位を挿入
        view.dispatch({
          changes: { from: line.from, insert: INDENT_SPACE },
          userEvent: "input.indent",
        });
        return true;
      }
      return indentMore(view);
    },
  },
  {
    key: "Shift-Tab",
    run: (view: EditorView): boolean => {
      const { state } = view;
      if (state.readOnly) return false;
      const { head, empty } = state.selection.main;
      // 範囲選択、または単一カーソルで行頭にインデント単位がある場合
      const line = state.doc.lineAt(head);
      if (empty && line.text.startsWith(INDENT_SPACE)) {
        view.dispatch({
          changes: { from: line.from, to: line.from + INDENT_SPACE.length, insert: "" },
          userEvent: "delete.dedent",
        });
        return true;
      }
      return indentLess(view);
    },
  },
];
