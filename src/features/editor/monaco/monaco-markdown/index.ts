import type { editor, languages } from "monaco-editor";
import * as monacoModule from "monaco-editor"; // Import monaco module directly
import { activateFormatting } from "./formatting";
import { setWordDefinitionFor, TextEditor } from "./vscode-monaco";
import { activateListEditing } from "./list-editing";
import { activateCompletion } from "./completion";

import { activateMarkdownMath } from "./markdown.contribution";

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
    // Use the directly imported monaco instance instead of looking for it in the global scope
    const monacoInstance = monacoModule;
    
    if (!monacoInstance) {
      console.error("Monaco instance not found");
      return;
    }

    const languageId = editor.getModel()?.getLanguageId() ?? "markdown";

    // Register link provider
    monacoInstance.languages.registerLinkProvider(languageId, {
      provideLinks: (model) => {
        const links: languages.ILink[] = [];
        const modelLines = model.getLinesContent();

        modelLines.forEach((line, lineNumber) => {
          // Find URLs in the line
          const urlMatches = line.matchAll(/https?:\/\/\S+/g);
          for (const match of urlMatches) {
            if (match.index !== undefined) {
              const url = match[0].replace(/[.,;:?!)]$/, ""); // Clean trailing punctuation
              links.push({
                range: {
                  startLineNumber: lineNumber + 1,
                  startColumn: match.index + 1,
                  endLineNumber: lineNumber + 1,
                  endColumn: match.index + url.length + 1,
                },
                url: url,
              });
            }
          }

          // Find domain names in the line
          const domainMatches = line.matchAll(
            /\b(?:[a-z0-9][-a-z0-9]*\.)+(?:com|org|net|edu|gov|mil|io|dev|co|jp|us|app|so|ai|design|info|shop|de|ru|br|uk|is|it|fr|de)(?:\b|\/)/gi,
          );
          for (const match of domainMatches) {
            if (match.index !== undefined) {
              // Skip if this is already part of a URL link we added
              let isInUrl = false;
              for (const link of links) {
                const linkLine = link.range.startLineNumber - 1;
                if (
                  linkLine === lineNumber &&
                  match.index >= link.range.startColumn - 1 &&
                  match.index + match[0].length <= link.range.endColumn - 1
                ) {
                  isInUrl = true;
                  break;
                }
              }

              if (!isInUrl) {
                const domain = match[0].replace(/[.,;:?!)]$/, ""); // Clean trailing punctuation
                links.push({
                  range: {
                    startLineNumber: lineNumber + 1,
                    startColumn: match.index + 1,
                    endLineNumber: lineNumber + 1,
                    endColumn: match.index + domain.length + 1,
                  },
                  url: `https://${domain}`,
                });
              }
            }
          }
        });

        return { links };
      },
      resolveLink: (link: languages.ILink) => {
        // You can modify the link here if needed
        return link;
      },
    });
  }
}

activateMarkdownMath();
