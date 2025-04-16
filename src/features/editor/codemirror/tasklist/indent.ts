import { indentMore, indentLess } from "@codemirror/commands";
// import { indentUnit } from "@codemirror/language";
import { KeyBinding, EditorView } from "@codemirror/view";

// チェックリスト行の開始部分を判定 (行頭空白とマーカー)
const checklistLineStartRegex = /^(\s*)(?:[-*])\s*\[[ x]\]\s*/;
const indentUnit = "  ";

export const checklistIndentKeymap: readonly KeyBinding[] = [
  {
    key: "Tab",
    run: (view: EditorView): boolean => {
      const { state } = view;
      if (state.readOnly || state.selection.ranges.length > 1) return false;

      const { head, empty } = state.selection.main;
      if (!empty) {
        // 範囲選択時は標準のインデントコマンドを試す
        return indentMore(view);
      }

      const line = state.doc.lineAt(head);
      // 行がチェックリスト項目で、かつカーソルが行頭からチェックボックスの直後までにある場合
      // (より単純に、チェックリスト行であればどこでもインデントを許可しても良いかもしれない)
      const match = line.text.match(checklistLineStartRegex);
      if (match && head <= line.from + match[0].length) {
        // 行頭にインデント単位を挿入
        view.dispatch({
          changes: { from: line.from, insert: indentUnit },
          userEvent: "input.indent",
          // 必要であればカーソル位置も調整
          // selection: { anchor: head + indentUnit.length }
        });
        return true; // Tabキーのデフォルト動作を抑制
      }

      // 上記条件外なら、標準のインデント動作を試みる (失敗すれば false)
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
      if (empty && line.text.startsWith(indentUnit)) {
        // 行頭のインデント単位を削除
        view.dispatch({
          changes: { from: line.from, to: line.from + indentUnit.length, insert: "" },
          userEvent: "delete.dedent",
          // selection: { anchor: Math.max(line.from, head - indentUnit.length) }
        });
        return true; // デフォルト動作を抑制
      }

      // 上記条件外なら、標準のインデント解除動作を試みる
      return indentLess(view);
    },
  },
];
