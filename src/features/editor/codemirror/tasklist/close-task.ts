import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from "@codemirror/view";
import { StateEffect, StateField, RangeSetBuilder } from "@codemirror/state";

// チェックリストアイテムの正規表現 - より正確なパターンを定義
const checklistRegex = /^(\s*[-*]\s+)\[([\ xX])\]/;

// チェックボックスの情報を保持する型
type CheckboxInfo = {
  from: number; // チェックボックス全体の開始位置 ('[')
  to: number; // チェックボックス全体の終了位置 (']'の次)
  contentPos: number; // チェックボックス内容の位置 ('['の次)
  checked: boolean; // チェック状態
};

// ホバー中のチェックボックスを追跡するための Effect
const hoverCheckbox = StateEffect.define<CheckboxInfo | null>();

// すべてのチェックボックスに適用するポインタスタイルのデコレーション
const checkboxBaseStyle = Decoration.mark({
  class: "cursor-pointer",
  inclusive: false,
});

// ホバー時にだけ適用する追加のハイライトデコレーション
const checkboxHoverStyle = Decoration.mark({
  class: "cm-checklist-hover",
  inclusive: false,
});

// チェックボックスをすべて検出してデコレーションを作成するプラグイン
export const checkboxDecoration = ViewPlugin.fromClass(
  class {
    checkboxes: CheckboxInfo[] = [];
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.checkboxes = this.findAllCheckboxes(view);
      this.decorations = this.createBaseDecorations(this.checkboxes);
    }

    // ドキュメント内のすべてのチェックボックスを検出する
    findAllCheckboxes(view: EditorView): CheckboxInfo[] {
      const result: CheckboxInfo[] = [];
      const { state } = view;
      const { doc } = state;

      // 各行に対してチェックボックスを検索
      for (let i = 1; i <= doc.lines; i++) {
        const line = doc.line(i);
        const match = line.text.match(checklistRegex);

        if (match) {
          // チェックボックスのパターン全体を検索して正確な位置を特定
          const matchIndex = match.index || 0;
          const prefixLength = match[1].length;

          // '[' の位置を計算
          const checkboxStartPos = matchIndex + prefixLength;
          const from = line.from + checkboxStartPos;
          const contentPos = from + 1; // '[' の次、つまり内容の位置
          const to = from + 3; // '[' + 内容 + ']' = 3文字分

          const checkChar = match[2];
          result.push({
            from,
            to,
            contentPos,
            checked: checkChar === "x" || checkChar === "X",
          });
        }
      }
      return result;
    }

    // すべてのチェックボックスにベースとなるカーソルポインタ装飾を作成
    createBaseDecorations(checkboxes: CheckboxInfo[]): DecorationSet {
      const builder = new RangeSetBuilder<Decoration>();
      for (const { from, to } of checkboxes) {
        builder.add(from, to, checkboxBaseStyle);
      }
      return builder.finish();
    }

    // ドキュメントが変更されたときにチェックボックスを再検出
    update(update: ViewUpdate) {
      if (update.docChanged) {
        this.checkboxes = this.findAllCheckboxes(update.view);
        this.decorations = this.createBaseDecorations(this.checkboxes);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  },
);

// ホバー状態を管理するための StateField
export const checkboxHoverField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // ドキュメント変更でデコレーションを更新
    decorations = decorations.map(tr.changes);

    // ホバー状態の変更を処理
    for (const e of tr.effects) {
      if (e.is(hoverCheckbox)) {
        const hoverInfo = e.value;
        if (hoverInfo) {
          // 新しいホバー効果を作成
          const builder = new RangeSetBuilder<Decoration>();
          builder.add(hoverInfo.from, hoverInfo.to, checkboxHoverStyle);
          return builder.finish();
        } else {
          // ホバー効果をクリア
          return Decoration.none;
        }
      }
    }

    return decorations;
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const checkboxMouseInteraction = ViewPlugin.fromClass(
  class {
    constructor(readonly view: EditorView) {
      this.handleMouseMove = this.handleMouseMove.bind(this);
      this.handleMouseLeave = this.handleMouseLeave.bind(this);
      this.handleMouseDown = this.handleMouseDown.bind(this);

      this.view.dom.addEventListener("mousemove", this.handleMouseMove);
      this.view.dom.addEventListener("mouseleave", this.handleMouseLeave);
      this.view.dom.addEventListener("mousedown", this.handleMouseDown);
    }

    destroy() {
      this.view.dom.removeEventListener("mousemove", this.handleMouseMove);
      this.view.dom.removeEventListener("mouseleave", this.handleMouseLeave);
      this.view.dom.removeEventListener("mousedown", this.handleMouseDown);
    }

    getCheckboxAt(pos: number): CheckboxInfo | null {
      try {
        const line = this.view.state.doc.lineAt(pos);
        const match = line.text.match(checklistRegex);
        if (!match) return null;

        const matchIndex = match.index || 0;
        const prefixLength = match[1].length;
        const checkboxStartPos = matchIndex + prefixLength;
        const from = line.from + checkboxStartPos;
        const contentPos = from + 1;
        const to = from + 3; // ']' の次の位置

        if (pos >= from && pos < to) {
          const checkChar = match[2];
          return {
            from,
            to,
            contentPos,
            checked: checkChar === "x" || checkChar === "X",
          };
        }
      } catch (e) {
      }
      return null;
    }

    handleMouseMove(event: MouseEvent) {
      // マウス位置をドキュメント上の位置に変換
      const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return;
      const checkbox = this.getCheckboxAt(pos);

      this.view.dispatch({
        effects: hoverCheckbox.of(checkbox),
      });
    }

    handleMouseLeave() {
      this.view.dispatch({
        effects: hoverCheckbox.of(null),
      });
    }

    handleMouseDown(event: MouseEvent) {
      // only left click
      if (event.button !== 0) return;

      const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY });
      if (pos === null) return;

      const checkbox = this.getCheckboxAt(pos);
      if (!checkbox) return;

      event.preventDefault();
      const newChar = checkbox.checked ? " " : "x";

      try {
        this.view.dispatch({
          changes: {
            from: checkbox.contentPos,
            to: checkbox.contentPos + 1, // 中身の1文字だけを対象
            insert: newChar,
          },
          userEvent: "input.toggleChecklist", // トランザクションの識別に役立つ
        });
      } catch (e) {
        console.warn("Failed to toggle checkbox:", e);
      }
    }
  },
);
