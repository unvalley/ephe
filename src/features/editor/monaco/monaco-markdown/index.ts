import type { editor } from "monaco-editor";
import { IRange, languages } from "monaco-editor";
import { activateFormatting, isLink } from "./formatting";
import { setWordDefinitionFor, TextEditor } from "./vscode-monaco";
import { activateListEditing } from "./list-editing";
import { activateCompletion } from "./completion";

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
        const text = model.getValue();
        const lines = text.split("\n");

        const findLinksInLine = (lineContent: string, lineNumber: number): Array<{ range: IRange; url: string }> => {
          return lineContent
            .split(/\s+/)
            .reduce((acc: Array<{ range: IRange; url: string }>, word: string, index: number, array: string[]) => {
              const currentPos = lineContent.indexOf(
                word,
                index > 0 ? lineContent.indexOf(array[index - 1]) + array[index - 1].length : 0,
              );
              if (currentPos === -1) return acc;

              if (word.length < 4 || word.startsWith("[") || word.includes("](")) {
                return acc;
              }

              if (isLink(word)) {
                const startColumn = currentPos + 1;
                const endColumn = startColumn + word.length;
                const { url } = getLinkInfo(word);

                acc.push({
                  range: {
                    startLineNumber: lineNumber + 1,
                    startColumn,
                    endLineNumber: lineNumber + 1,
                    endColumn,
                  },
                  url,
                });
              }

              return acc;
            }, []);
        };

        const links = lines.reduce<Array<{ range: IRange; url: string }>>(
          (acc, line, index) => [...acc, ...findLinksInLine(line, index)],
          [],
        );

        return { links };
      },
    });
  }
}

activateMarkdownMath();
