import { indentMore, indentLess } from "@codemirror/commands";
import { indentUnit } from "@codemirror/language";
import { KeyBinding, EditorView, keymap } from "@codemirror/view";

// チェックリスト行の開始部分を判定 (行頭空白とマーカー)
const taskListLineStartRegex = /^(\s*)(?:[-*])\s*\[[ x]\]\s*/;
const EMPTY_CHECKLIST_LINE_REGEX = /^(\s*[-*]\s+\[[ xX]\])\s*$/;

const INDENT_SPACE = "  ";

// 行頭の空白を取得する正規表現
const leadingWhitespaceRegex = /^(\s*)/;

// Calculate just number of spaces
const getIndentLength = (lineText: string): number => {
  const match = lineText.match(leadingWhitespaceRegex);
  return match ? match[1].length : 0;
};

export const taskKeyBindings: readonly KeyBinding[] = [
  {
    key: "Tab",
    run: (view: EditorView): boolean => {
      const { state, dispatch } = view;
      if (state.readOnly || state.selection.ranges.length > 1) return false;
      if (!state.selection.main.empty) {
        return indentMore(view);
      }

      const { head } = state.selection.main;
      const currentLine = state.doc.lineAt(head);
      const currentLineText = currentLine.text;

      if (!taskListLineStartRegex.test(currentLineText)) {
        return indentMore(view);
      }

      const currentIndentLength = getIndentLength(currentLineText);
      const indentUnitStr = state.facet(indentUnit);
      const indentUnitLength = indentUnitStr.length;

      // インデント単位が無効な場合は何もしない（またはエラーログ）
      if (indentUnitLength <= 0) {
        console.warn("Invalid indent unit length:", indentUnitLength);
        return false; // デフォルト動作に任せるか、trueでブロックするか
      }

      // 現在の行が最初の行でなければ、直前の行を確認
      if (currentLine.number > 1) {
        const prevLine = state.doc.line(currentLine.number - 1);
        const prevLineText = prevLine.text;

        // 直前の行もチェックリストアイテムか確認
        if (taskListLineStartRegex.test(prevLineText)) {
          const prevIndentLength = getIndentLength(prevLineText);

          // ★★★ 修正点: 直前の行が同じインデントレベルの場合のみインデントを実行 ★★★
          if (currentIndentLength === prevIndentLength) {
            console.log(`Indenting sibling: Current ${currentIndentLength}, Prev ${prevIndentLength}`);
            dispatch({
              changes: { from: currentLine.from, insert: indentUnitStr },
              userEvent: "input.indent.task", // より具体的なイベント名
            });
            return true; // インデント処理を実行したので true を返す
          }

          // (オプション) もし現在の行が既に直前の行より深い場合、Tabでのインデントはブロック
          if (currentIndentLength > prevIndentLength) {
            console.log(`Already nested: Current ${currentIndentLength}, Prev ${prevIndentLength}`);
            return true; // これ以上Tabでインデントさせない
          }

          // (オプション) もし現在の行が直前の行より浅い場合 (通常は考えにくいが)、デフォルト動作に任せるかブロック
          // console.log(`Less indented than previous: Current ${currentIndentLength}, Prev ${prevIndentLength}`);
          // return false; or return true;
        }
      }

      // ここに到達する場合:
      // 1. 現在の行が最初の行 (currentLine.number === 1)
      // 2. 直前の行がチェックリストアイテムではない
      // 3. 直前の行がチェックリストアイテムだが、インデントレベルが異なる (currentIndentLength !== prevIndentLength)

      // ルートレベル (インデント0) のアイテムなら、デフォルトの indentMore を試みる
      if (currentIndentLength === 0) {
        console.log("Root level item, fallback to indentMore");
        return indentMore(view);
      } else {
        // 既にインデントされており、適切な兄弟が直前にない場合は、Tabキーでのインデントをブロック
        console.log("Not root, no suitable sibling above, blocking Tab indent.");
        return true;
      }

      // 通常は上記で処理されるはずだが、念のためのフォールバック
      // return false; // or indentMore(view);
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
  {
    key: "Delete",
    mac: "Backspace",
    run: (view: EditorView): boolean => {
      console.log("Custom Delete handler invoked");
      const { state } = view;
      const { selection } = state;

      // 選択範囲がある場合やカーソルが複数ある場合はデフォルト動作
      if (!selection.main.empty || selection.ranges.length > 1) {
        return false;
      }

      const pos = selection.main.head;
      const line = state.doc.lineAt(pos);

      // カーソルが行末にない場合はデフォルト動作
      // (行の途中でDeleteを押した場合は、通常通り文字を削除させたい)
      if (pos !== line.to) {
        return false;
      }

      // 行の内容全体が空のチェックリストパターンにマッチするか確認
      const match = line.text.match(EMPTY_CHECKLIST_LINE_REGEX);

      if (match) {
        // マッチした場合: 行全体が `- [ ]` (または - [x] など) と空白のみ
        console.log("Delete pressed at the end of an empty task item line.");

        // 行を削除するトランザクションを作成
        let from = line.from;
        let to = line.to;

        // 行の後ろに改行がある場合、それも削除範囲に含める
        // (次の行が意図せずインデントされるのを防ぐため)
        // ただし、ドキュメントの最後の行の場合は改行は削除しない
        if (line.to < state.doc.length) {
          to += 1; // 改行文字分
        } else {
          // 最後の行で、かつ最初の行でもない場合、
          // 前の行の末尾の改行を削除しないように調整が必要な場合がある
          // ここでは単純に、最後の行なら改行は消さない、としておく
          if (line.from > 0) {
            // fromを調整して前の改行を消さないようにする？ いや、行全体を消すのが直感的か。
            // 一旦、最後の行は改行を消さない、で進める
          }
        }
        // 最初の行の場合、改行を削除すると次の行がくっついてしまうので削除しない
        if (line.from === 0 && line.to < state.doc.length) {
          to = line.to;
        }

        // 最終的な削除範囲
        const changes = { from: from, to: to };
        // カーソルは削除開始位置に置く
        const selectionAfter = { anchor: from };

        view.dispatch({
          changes: changes,
          selection: selectionAfter,
          userEvent: "delete.task", // ユーザーイベント名を指定
        });

        return true; // デフォルトの Delete 動作を抑制
      }

      // パターンにマッチしない場合は、デフォルトの Delete 動作を実行
      return false;
    },
  },
];

export const taskKeyMap = keymap.of(taskKeyBindings);
