import { editor } from "monaco-editor";
import type { IRange, languages } from "monaco-editor";
import { activateFormatting } from "./formatting";
import { setWordDefinitionFor, TextEditor } from "./vscode-monaco";
import { activateListEditing } from "./listEditing";
import { activateCompletion } from "./completion";
import { activateTableFormatter } from "./tableFormatter";

import { activateMarkdownMath } from "./markdown.contribution";

// Define a type for the Monaco global object
interface MonacoGlobal {
  languages: typeof languages;
}

export class MonacoMarkdownExtension {
  private isLinkProviderRegistered = false;

  activate(editor: editor.IStandaloneCodeEditor) {
    const textEditor = new TextEditor(editor);

    activateFormatting(textEditor);
    activateListEditing(textEditor);
    activateCompletion(textEditor);
    activateTableFormatter(textEditor);
    this.registerLinkProvider(editor);

    // Allow `*` in word pattern for quick styling
    setWordDefinitionFor(
      textEditor.languageId,
      /(-?\d*\.\d\w*)|([^\!\@\#\%\^\&\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s\，\。\《\》\？\；\：\'\"\'\"\（\）\【\】\、]+)/g,
    );
  }

  /**
   * Register a link provider for Markdown links
   * @param editor The Monaco editor instance
   */
  private registerLinkProvider(editor: editor.IStandaloneCodeEditor) {
    if (this.isLinkProviderRegistered) return;
    this.isLinkProviderRegistered = true;

    // ミニマムな正規表現定義 - 極力シンプルにする
    const simpleLinkDetector = /https?:\/\/\S+|\b[a-z0-9][a-z0-9-]*\.[a-z]{2,}(?:\/\S*)?\b|\[[^\]]+\]\([^)]+\)/gi;

    // リンク判定のための補助正規表現
    const protocolRegex = /^https?:\/\//;
    const domainRegex = /^[a-z0-9][a-z0-9-]*\.[a-z]{2,}/i;

    // Get the Monaco instance from the editor
    let monacoInstance: MonacoGlobal | undefined;

    if (typeof window !== "undefined") {
      const windowWithMonaco = window as unknown as { monaco?: MonacoGlobal };
      if (windowWithMonaco.monaco) {
        monacoInstance = windowWithMonaco.monaco;
      }
    }

    if (!monacoInstance) {
      console.error("Monaco instance not found");
      return;
    }

    // リンク種別判定関数
    const getLinkInfo = (text: string): { url: string; isMarkdown: boolean } => {
      // Markdownリンク[text](url)を検出
      if (text.includes("](") && text.startsWith("[") && text.endsWith(")")) {
        const closeBracketPos = text.lastIndexOf("](");
        if (closeBracketPos > 0) {
          const url = text.substring(closeBracketPos + 2, text.length - 1);
          return { url, isMarkdown: true };
        }
      }

      // プロトコル付きURL
      if (protocolRegex.test(text)) {
        return { url: text, isMarkdown: false };
      }

      // ドメインのみのURL
      if (domainRegex.test(text)) {
        return { url: `https://${text}`, isMarkdown: false };
      }

      // フォールバック - プロトコルがないURLとして扱う
      return { url: `https://${text}`, isMarkdown: false };
    };

    // リンクプロバイダー登録
    monacoInstance.languages.registerLinkProvider("markdown", {
      provideLinks: (model: editor.ITextModel) => {
        const links: Array<{ range: IRange; url: string }> = [];

        // 文書全体のテキストを取得
        const text = model.getValue();
        const lines = text.split("\n");

        // 効率的にリンクを検出（行ごとではなく一括で処理）
        for (let i = 0; i < lines.length; i++) {
          const lineContent = lines[i];

          // リンクっぽい文字列が含まれていない行はスキップ（ただし、単純なドメインはチェック）
          if (
            !lineContent.includes("://") &&
            !lineContent.includes(".com") &&
            !lineContent.includes(".org") &&
            !lineContent.includes(".net") &&
            !lineContent.includes(".io") &&
            !lineContent.includes(".dev") &&
            !lineContent.includes(".jp") &&
            !lineContent.includes(".") &&
            !lineContent.includes("[") &&
            !lineContent.includes("](")
          ) {
            continue;
          }

          // 単一のパスでリンクを検出
          const matches = lineContent.match(simpleLinkDetector);
          if (!matches) continue;

          // 同じマッチが複数回出現する可能性を考慮して位置ベースで検出
          let remainingContent = lineContent;
          let currentOffset = 0;

          for (const match of matches) {
            const matchIndex = remainingContent.indexOf(match);
            if (matchIndex === -1) continue;

            const absoluteIndex = currentOffset + matchIndex;
            const startColumn = absoluteIndex + 1;
            const endColumn = startColumn + match.length;

            // リンク種別に応じてURLを取得
            const { url, isMarkdown } = getLinkInfo(match);

            // Markdownリンクの場合、URL部分だけを範囲としてマーク
            if (isMarkdown) {
              const closePos = match.lastIndexOf("](");
              const urlStartPos = closePos + 2;

              links.push({
                range: {
                  startLineNumber: i + 1,
                  startColumn: startColumn + urlStartPos,
                  endLineNumber: i + 1,
                  endColumn: endColumn - 1, // 閉じ括弧を除く
                },
                url,
              });
            } else {
              links.push({
                range: {
                  startLineNumber: i + 1,
                  startColumn,
                  endLineNumber: i + 1,
                  endColumn,
                },
                url,
              });
            }

            // 処理済みの部分をスキップして次のマッチを探す
            remainingContent = remainingContent.substring(matchIndex + match.length);
            currentOffset += matchIndex + match.length;
          }
        }

        return { links };
      },
    });
  }
}

activateMarkdownMath();
