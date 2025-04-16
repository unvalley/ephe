import { EditorView, ViewPlugin, ViewUpdate, Decoration, DecorationSet } from "@codemirror/view";
import { StateEffect, StateField } from "@codemirror/state"; // Precを使う場合
import { type Extension } from "@codemirror/state"; // Extension型のため

// チェックリストアイテムの基本的な正規表現
// 行頭の空白、リストマーカー `-` または `*`、チェックボックス `[ ]` または `[x]` を捉える
const checklistRegex = /^(\s*[-*])\s*\[([ x])]/;

// チェックボックス部分の情報を保持するインターフェース
type CheckboxPosition = {
  lineFrom: number; // 行の開始位置
  checkboxFrom: number; // '[' のドキュメント上の位置
  checkboxTo: number; // ']' の次のドキュメント上の位置
  checked: boolean; // 現在のチェック状態
};

// ホバー効果を適用するためのデコレーション
const hoverDecoration = Decoration.mark({ class: "" });

export function checklistInteraction(): Extension {
  return ViewPlugin.fromClass(
    class ChecklistInteractionPlugin {
      decorations = Decoration.none;
      currentHoverPos: CheckboxPosition | null = null; // 現在ホバー中のチェックボックス情報

      constructor(readonly view: EditorView) {
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseLeave = this.handleMouseLeave.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);

        // イベントリスナーを登録
        this.view.dom.addEventListener("mousemove", this.handleMouseMove);
        this.view.dom.addEventListener("mouseleave", this.handleMouseLeave);
        this.view.dom.addEventListener("mousedown", this.handleMouseDown);
      }

      update(update: ViewUpdate) {
        // ドキュメントやビューポートの変更があればデコレーションを再計算
        // （ホバー状態もリセットされるべきか検討）
        if (update.docChanged || update.viewportChanged) {
          // ドキュメントが変わったらホバー状態もリセット
          this.currentHoverPos = null;
          this.updateDecorations(null); // ホバーデコレーション解除
        } else if (update.geometryChanged) {
          // スクロールなどでビューポートが変わった場合も再計算が必要な場合がある
          // ここでは単純化のため docChanged のみでリセット
        }
      }

      destroy() {
        // プラグイン破棄時にリスナーを解除
        this.view.dom.removeEventListener("mousemove", this.handleMouseMove);
        this.view.dom.removeEventListener("mouseleave", this.handleMouseLeave);
        this.view.dom.removeEventListener("mousedown", this.handleMouseDown);
      }

      // マウス座標からチェックボックスの位置情報を取得
      getCheckboxPosition(pos: number | null): CheckboxPosition | null {
        if (pos === null) return null;

        try {
          const line = this.view.state.doc.lineAt(pos);
          const match = line.text.match(checklistRegex);
          if (!match) return null;

          // チェックボックス '[' の行内での開始インデックスを計算
          const checkboxStartIndexInLine = line.text.indexOf("[");
          if (checkboxStartIndexInLine === -1) return null; // '[' が見つからない場合

          const checkboxFrom = line.from + checkboxStartIndexInLine; // '[' のドキュメント位置
          const checkboxTo = checkboxFrom + 3; // ']' の次のドキュメント位置

          // マウスカーソル位置 `pos` がチェックボックスの範囲 `[ ]` または `[x]` 内か判定
          if (pos >= checkboxFrom && pos < checkboxTo) {
            return {
              lineFrom: line.from,
              checkboxFrom: checkboxFrom,
              checkboxTo: checkboxTo,
              checked: match[2] === "x",
            };
          }
        } catch (e) {
          // lineAtでエラーになる場合などを無視
        }
        return null;
      }

      // ホバーデコレーションを更新する
      updateDecorations(target: CheckboxPosition | null) {
        if (target) {
          // 新しいターゲットにホバーデコレーションを適用
          this.decorations = Decoration.set([hoverDecoration.range(target.checkboxFrom, target.checkboxTo)]);
        } else {
          // ホバー中でなければデコレーションをクリア
          this.decorations = Decoration.none;
        }
        // デコレーションの変更をビューに通知（再描画をトリガー）
        // updateメソッド外からdispatchが必要
        if (this.view.state.field(checklistInteractionField, false) !== this.decorations) {
          this.view.dispatch({
            effects: setChecklistDecorations.of(this.decorations),
          });
        }
      }

      // MouseMove イベントハンドラ
      handleMouseMove(event: MouseEvent) {
        const pos = this.view.posAtCoords({ x: event.clientX, y: event.clientY }, false); // falseで要素外を許容しない
        const target = this.getCheckboxPosition(pos);

        // ホバー状態が変わったか確認
        const changed = this.currentHoverPos?.checkboxFrom !== target?.checkboxFrom;

        if (changed) {
          this.currentHoverPos = target; // 現在のホバー位置を更新
          this.updateDecorations(target); // デコレーションを更新
        }
      }

      // MouseLeave イベントハンドラ (エディタ領域から離れた時)
      handleMouseLeave(event: MouseEvent) {
        if (this.currentHoverPos) {
          this.currentHoverPos = null;
          this.updateDecorations(null); // ホバー解除
        }
      }

      // MouseDown イベントハンドラ
      handleMouseDown(event: MouseEvent) {
        // 左クリック以外は無視
        if (event.button !== 0) return;

        // 現在ホバー中のチェックボックスがあればそれを処理対象とする
        const target = this.currentHoverPos;

        if (target) {
          event.preventDefault(); // デフォルトのクリック動作（テキスト選択など）を抑制

          // チェック状態をトグルする
          const newChar = target.checked ? " " : "x";
          // チェックボックスの中身の位置 ( '[' の次 )
          const changeFrom = target.checkboxFrom + 1;
          const changeTo = changeFrom + 1; // 1文字だけ置換

          this.view.dispatch({
            changes: { from: changeFrom, to: changeTo, insert: newChar },
            userEvent: "input.toggleChecklist", // 変更の種類を示すユーザーイベント
          });

          // クリック後もホバーが継続する場合があるので、状態を更新しておく
          // （dispatchによりupdateが呼ばれ、そこでリセットされる可能性もある）
          // this.currentHoverPos = { ...target, checked: !target.checked };
          // this.updateDecorations(this.currentHoverPos);
        }
      }
    },
    {
      // このViewPluginが提供するデコレーションを指定
      decorations: (v) => v.decorations,
    },
  );
}

// デコレーションを保持・更新するための StateField と Effect
const setChecklistDecorations = StateEffect.define<DecorationSet>();

const checklistInteractionField = StateField.define<DecorationSet>({
  create() {
    return Decoration.none;
  },
  update(decorations, tr) {
    // 他のトランザクションによる変更があればデコレーションを調整する必要があるかもしれないが、
    // ここでは Effect による更新のみ受け付ける
    for (let e of tr.effects) {
      if (e.is(setChecklistDecorations)) return e.value;
    }
    // ドキュメント変更でデコレーションがずれるのを map で対応
    return decorations.map(tr.changes);
  },
  provide: (f) => EditorView.decorations.from(f),
});

export const checklistPlugin: Extension = [checklistInteraction(), checklistInteractionField];
