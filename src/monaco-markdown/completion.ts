import * as TypeConverters from "./vscode-converters";
import {
  type CancellationToken,
  type editor,
  languages,
  type Position as _Position,
} from "monaco-editor";

import { TextDocument, type TextEditor } from "./vscode-monaco";

import { Range, SnippetString, Position } from "./extHostTypes";

import { slugify } from "./util";
import { buildToc } from "./toc";

import * as latex from "./latex";

let completionActivated = false;

export function activateCompletion(editor: TextEditor) {
  if (!completionActivated) {
    //TODO: remove provider when context is disposed
    const provider = new MdCompletionItemProvider();
    languages.registerCompletionItemProvider(editor.languageId, provider);

    completionActivated = true;
  }
}

function completionList(
  items: languages.CompletionItem[],
): languages.CompletionList {
  return { suggestions: items.map((v, _) => Object.assign({}, v)) };
}

function newCompletionItem(
  text: string,
  kind: languages.CompletionItemKind,
): languages.CompletionItem {
  return {
    label: text,
    kind: kind,
    additionalTextEdits: undefined,
    command: undefined,
    commitCharacters: undefined,
    detail: undefined,
    documentation: undefined,
    filterText: undefined,
    insertTextRules: undefined,
    preselect: false,
    range: {
      startLineNumber: 0,
      startColumn: 0,
      endLineNumber: 0,
      endColumn: 0,
    },
    sortText: undefined,
    insertText: "",
  };
}

class MdCompletionItemProvider implements languages.CompletionItemProvider {
  triggerCharacters = ["(", "\\", "/", "[", "#"];

  // Suffixes explained:
  // \cmd         -> 0
  // \cmd{$1}     -> 1
  // \cmd{$1}{$2} -> 2
  //
  // Use linebreak to mimic the structure of the KaTeX [Support Table](https://katex.org/docs/supported.html)

  mathCompletions: languages.CompletionItem[];

  constructor() {
    // \cmd
    const c1 = latex._c1.map((cmd) => {
      const item = newCompletionItem(
        `\\${cmd}`,
        languages.CompletionItemKind.Function,
      );
      item.insertText = cmd;
      return item;
    });
    // \cmd{$1}
    const c2 = latex._c2.map((cmd) => {
      const item = newCompletionItem(
        `\\${cmd}`,
        languages.CompletionItemKind.Function,
      );
      item.insertText = new SnippetString(`${cmd}\{$1\}`).value;
      item.insertTextRules =
        languages.CompletionItemInsertTextRule.InsertAsSnippet;

      return item;
    });
    // \cmd{$1}{$2}
    const c3 = latex._c3.map((cmd) => {
      const item = newCompletionItem(
        `\\${cmd}`,
        languages.CompletionItemKind.Function,
      );
      item.insertText = new SnippetString(`${cmd}\{$1\}\{$2\}`).value;
      item.insertTextRules =
        languages.CompletionItemInsertTextRule.InsertAsSnippet;

      return item;
    });
    const envSnippet = newCompletionItem(
      "\\begin",
      languages.CompletionItemKind.Snippet,
    );
    envSnippet.insertText = new SnippetString(
      "begin{${1|aligned,alignedat,array,bmatrix,Bmatrix,cases,darray,dcases,gathered,matrix,pmatrix,vmatrix,Vmatrix|}}\n\t$2\n\\end{$1}",
    ).value;
    envSnippet.insertTextRules =
      languages.CompletionItemInsertTextRule.InsertAsSnippet;

    this.mathCompletions = [...c1, ...c2, ...c3, envSnippet];
    // Sort
    this.mathCompletions.forEach((item) => {
      item.sortText = (
        typeof item.label === "string" ? item.label : item.label.label
      ).replace(/[a-zA-Z]/g, (c) => {
        if (/[a-z]/.test(c)) {
          return `0${c}`;
        } else {
          return `1${c.toLowerCase()}`;
        }
      });
    });
  }

  provideCompletionItems(
    model: editor.ITextModel,
    _position: _Position,
    _context: languages.CompletionContext,
    _token: CancellationToken,
  ): languages.ProviderResult<languages.CompletionList> {
    const document = new TextDocument(model);
    const position = TypeConverters.Position.to(_position);

    const lineTextBefore = document
      .lineAt(position.line)
      .text.substring(0, position.character);
    const lineTextAfter = document
      .lineAt(position.line)
      .text.substring(position.character);

    let matches;
    if ((matches = lineTextBefore.match(/\\[^$]*$/)) !== null) {
      /* ┌────────────────┐
               │ Math functions │
               └────────────────┘ */
      if (
        /(^|[^\$])\$(|[^ \$].*)\\\w*$/.test(lineTextBefore) &&
        lineTextAfter.includes("$")
      ) {
        // Complete math functions (inline math)
        return completionList(this.mathCompletions);
      } else {
        const textBefore = document.getText(
          new Range(new Position(0, 0), position),
        );
        const textAfter = document
          .getText()
          .substr(document.offsetAt(position));

        if (
          (matches = textBefore.match(/\$\$/g)) !== null &&
          matches.length % 2 !== 0 &&
          textAfter.includes("$$")
        ) {
          // Complete math functions ($$ ... $$)
          return completionList(this.mathCompletions);
        } else {
          return completionList([]);
        }
      }
    }
    if (/\[[^\]]*?\]\[[^\]]*$/.test(lineTextBefore)) {
      /* ┌───────────────────────┐
               │ Reference link labels │
               └───────────────────────┘ */
      const startIndex = lineTextBefore.lastIndexOf("[");
      const range = new Range(
        position.with({ character: startIndex + 1 }),
        position,
      );
      return new Promise((res, _) => {
        const lines = document.getText().split(/\r?\n/);
        const usageCounts = lines.reduce((useCounts, currentLine) => {
          let match: RegExpExecArray;
          const pattern = /\[[^\]]+\]\[([^\]]*?)\]/g;
          // @ts-ignore
          // biome-ignore lint/suspicious/noAssignInExpressions: <explanation>
          while ((match = pattern.exec(currentLine)) !== null) {
            const usedRef = match[1];
            if (!useCounts.has(usedRef)) {
              useCounts.set(usedRef, 0);
            }

            const count = useCounts.get(usedRef) || 0;
            useCounts.set(usedRef, count + 1);
          }
          return useCounts;
        }, new Map<string, number>());
        const refLabels = lines.reduce((prev, curr) => {
          let match;
          if ((match = /^\[([^\]]*?)\]: (\S*)( .*)?/.exec(curr)) !== null) {
            const ref = match[1];
            const item = newCompletionItem(
              ref,
              languages.CompletionItemKind.Reference,
            );
            const usages = usageCounts.get(ref) || 0;
            item.insertText = ref;
            item.documentation = { value: match[2] };
            item.detail = usages === 1 ? "1 usage" : `${usages} usages`;
            // Prefer unused items
            item.sortText = usages === 0 ? `0-${ref}` : `1-${ref}`;
            item.range = TypeConverters.Range.from(range);
            prev.push(item);
          }
          return prev;
        }, [] as languages.CompletionItem[]);

        res(completionList(refLabels));
      });
    }

    if (/\[[^\]]*\]\(#[^\)]*$/.test(lineTextBefore)) {
      /* ┌───────────────────────────┐
               │ Anchor tags from headings │
               └───────────────────────────┘ */
      const startIndex = lineTextBefore.lastIndexOf("(");
      let endPosition = position;

      let addClosingParen = false;
      if (/^([^\) ]+\s*|^\s*)\)/.test(lineTextAfter)) {
        // try to detect if user wants to replace a link (i.e. matching closing paren and )
        // Either: ... <CURSOR> something <whitespace> )
        //     or: ... <CURSOR> <whitespace> )
        //     or: ... <CURSOR> )     (endPosition assignment is a no-op for this case)

        // in every case, we want to remove all characters after the cursor and before that first closing paren
        endPosition = position.with({
          character: +endPosition.character + lineTextAfter.indexOf(")"),
        });
      } else {
        // If no closing paren is found, replace all trailing non-white-space chars and add a closing paren
        // distance to first non-whitespace or EOL
        let toReplace = 0;
        while (
          toReplace < lineTextAfter.length &&
          " \t\n\r\v".indexOf(lineTextAfter.charAt(toReplace)) != -1
        ) {
          toReplace++;
        }
        endPosition = position.with({
          character: +endPosition.character + toReplace,
        });

        addClosingParen = true;
      }

      const range = new Range(
        position.with({ character: startIndex + 1 }),
        endPosition,
      );

      return new Promise((res, _) => {
        const toc = buildToc(document);

        const headingCompletions: languages.CompletionItem[] = toc.reduce(
          (prev: languages.CompletionItem[], curr: any) => {
            const item = newCompletionItem(
              `#${slugify(curr.text)}`,
              languages.CompletionItemKind.Reference,
            );

            const label =
              typeof item.label === "string" ? item.label : item.label.label;
            if (addClosingParen) {
              item.insertText = `${label})`;
            } else {
              item.insertText = label;
            }

            item.documentation = curr.text;
            item.range = TypeConverters.Range.from(range);
            prev.push(item);
            return prev;
          },
          [],
        );

        res(completionList(headingCompletions));
      });
    }

    return completionList([]);
  }
}
