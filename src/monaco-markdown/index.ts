import type { editor } from "monaco-editor";
import { IRange, languages } from "monaco-editor";
import { activateFormatting, isSingleLink } from "./formatting";
import { setWordDefinitionFor, TextEditor } from "./vscode-monaco";
import { activateListEditing } from "./listEditing";
import { activateCompletion } from "./completion";
import { activateTableFormatter } from "./tableFormatter";

import { activateMarkdownMath } from "./markdown.contribution";

// Define a type for the Monaco global object
interface MonacoGlobal {
  languages: typeof languages;
}

const protocolRegex = /^https?:\/\//;

export class MonacoMarkdownExtension {
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
   */
  private registerLinkProvider(editor: editor.IStandaloneCodeEditor) {
    // TODO: remove
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

    const getLinkInfo = (text: string): { url: string } => {
      if (protocolRegex.test(text)) {
        return { url: text };
      }
      return { url: `https://${text}` };
    };

    const languageId = editor.getModel()?.getLanguageId() ?? "markdown";

    monacoInstance.languages.registerLinkProvider(languageId, {
      provideLinks: (model: editor.ITextModel) => {
        const links: Array<{ range: IRange; url: string }> = [];
        const text = model.getValue();
        const lines = text.split("\n");

        const hasLinkTraces =
          text.includes("://") ||
          text.includes("www.") ||
          text.includes(".com") ||
          text.includes(".org") ||
          text.includes(".net") ||
          text.includes(".io") ||
          text.includes(".dev") ||
          text.includes(".app") ||
          text.includes(".jp");

        if (!hasLinkTraces) {
          return { links };
        }

        // TODO:
        for (let i = 0; i < lines.length; i++) {
          const lineContent = lines[i];

          const words = lineContent.split(/\s+/);
          let currentPos = 0;

          for (const word of words) {
            // 空白をスキップして単語の開始位置を特定
            currentPos = lineContent.indexOf(word, currentPos);
            if (currentPos === -1) continue;

            // スキップすべき明らかに非URLなものを除外
            if (word.length < 4 || word.startsWith("[") || word.includes("](")) {
              currentPos += word.length;
              continue;
            }

            // isSingleLinkを使用してURLかどうかをチェック
            if (isSingleLink(word)) {
              const startColumn = currentPos + 1;
              const endColumn = startColumn + word.length;

              // プロトコルの有無で適切なURLを構築
              const { url } = getLinkInfo(word);

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

            currentPos += word.length;
          }
        }

        return { links };
      },
    });
  }
}

activateMarkdownMath();
