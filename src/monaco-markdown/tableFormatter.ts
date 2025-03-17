

// https://github.github.com/gfm/#tables-extension-

import {type CancellationToken, type editor, languages, type Thenable, Range as _Range} from "monaco-editor";
import {TextDocument, type TextEditor} from "./vscode-monaco";

import {EndOfLine, Range} from './extHostTypes'

import * as TypeConverters from './vscode-converters'

export function activateTableFormatter(editor: TextEditor) {
    languages.registerDocumentFormattingEditProvider(editor.languageId, new MarkdownDocumentFormatter());
}

export function deactivate() {
}

class MarkdownDocumentFormatter implements languages.DocumentFormattingEditProvider {
    public provideDocumentFormattingEdits(model: editor.ITextModel, options: languages.FormattingOptions, _: CancellationToken): languages.TextEdit[] | Thenable<languages.TextEdit[]> {
        const edits: languages.TextEdit[] = [];
        const document = new TextDocument(model)
        const tables = this.detectTables(document.getText());
        if (tables !== null) {
            tables.forEach(table => {
                edits.push({range: TypeConverters.Range.from(this.getRange(document, table)), text: this.formatTable(table, document, options)});
            });
            return edits;
        } else {
            return [];
        }
    }

    private detectTables(text: string) {
        const lineBreak = '\\r?\\n';
        const contentLine = '\\|?.*\\|.*\\|?';
        const hyphenLine = '[ \\t]*\\|?( *:?-+:? *\\|)+( *:?-+:? *\\|?)[ \\t]*';
        const tableRegex = new RegExp(contentLine + lineBreak + hyphenLine + '(?:' + lineBreak + contentLine + ')*', 'g');
        return text.match(tableRegex);
    }

    private getRange(document: TextDocument, text: string): Range {
        const documentText = document.getText();
        const start = document.positionAt(documentText.indexOf(text));
        const end = document.positionAt(documentText.indexOf(text) + text.length);
        return new Range(start, end);
    }

    /**
     * Return the indentation of a table as a string of spaces by reading it from the first line.
     * In case of `markdown.extension.table.normalizeIndentation` is `enabled` it is rounded to the closest multiple of
     * the configured `tabSize`.
     */
    private getTableIndentation(text: string, options: languages.FormattingOptions) {
        // let doNormalize = workspace.getConfiguration('markdown.extension.tableFormatter').get<boolean>('normalizeIndentation');
        const doNormalize = true;
        const indentRegex = new RegExp(/^(\s*)\S/u);
        const match = text.match(indentRegex);
        const spacesInFirstLine = match[1].length;
        const tabStops = Math.round(spacesInFirstLine / options.tabSize);
        const spaces = doNormalize ? " ".repeat(options.tabSize * tabStops) : " ".repeat(spacesInFirstLine);
        return spaces;
    }

    private formatTable(text: string, doc: TextDocument, options: languages.FormattingOptions) {
        const indentation = this.getTableIndentation(text, options);

        const rows: string[] = [];
        const rowsNoIndentPattern = new RegExp(/^\s*(\S.*)$/gum);
        let match = null;
        while ((match = rowsNoIndentPattern.exec(text)) !== null) {
            rows.push(match[1].trim());
        }

        // Desired width of each column
        const colWidth: number[] = [];
        // Alignment of each column        
        const colAlign: string[] = []
        // Regex to extract cell content.
        // Known issue: `\\|` is not correctly parsed as a valid delimiter
        const fieldRegExp = new RegExp(/(?:((?:\\\||`.*?`|[^\|])*)\|)/gu);
        const cjkRegex = /[\u3000-\u9fff\uff01-\uff60]/g;

        const lines = rows.map((row, num) => {
            // Normalize
            if (row.startsWith('|')) {
                row = row.slice(1);
            }
            if (!row.endsWith('|')) {
                row = row + '|';
            }

            let field = null;
            const values = [];
            let i = 0;
            while ((field = fieldRegExp.exec(row)) !== null) {
                const cell = field[1].trim();
                values.push(cell);

                // Ignore length of dash-line to enable width reduction
                if (num != 1) {
                    // Treat CJK characters as 2 English ones because of Unicode stuff
                    const length = cjkRegex.test(cell) ? cell.length + cell.match(cjkRegex).length : cell.length;
                    colWidth[i] = colWidth[i] > length ? colWidth[i] : length;
                }

                i++;
            }
            return values;
        });

        // Normalize the num of hyphen, use Math.max to determine minimum length based on dash-line format
        lines[1] = lines[1].map((cell, i) => {
            if (/:-+:/.test(cell)) {
                //:---:
                colWidth[i] = Math.max(colWidth[i], 5);
                colAlign[i] = 'c';
                return ':' + '-'.repeat(colWidth[i] - 2) + ':';
            } else if (/:-+/.test(cell)) {
                //:---
                colWidth[i] = Math.max(colWidth[i], 4);
                colAlign[i] = 'l';
                return ':' + '-'.repeat(colWidth[i] - 1);
            } else if (/-+:/.test(cell)) {
                //---:
                colWidth[i] = Math.max(colWidth[i], 4);
                colAlign[i] = 'r';
                return '-'.repeat(colWidth[i] - 1) + ':';
            } else if (/-+/.test(cell)) {
                //---
                colWidth[i] = Math.max(colWidth[i], 3);
                colAlign[i] = 'l';
                return '-'.repeat(colWidth[i]);
            } else {
                colAlign[i] = 'l';
            }
        });

        return lines.map(row => {
            const cells = row.map((cell, i) => {
                let cellLength = colWidth[i];
                if (cjkRegex.test(cell)) {
                    cellLength -= cell.match(cjkRegex).length;
                }
                //return (cell + ' '.repeat(cellLength)).slice(0, cellLength);
                return this.alignText(cell, colAlign[i], cellLength);
            });
            return indentation + '| ' + cells.join(' | ') + ' |';
        }).join(doc.eol === EndOfLine.LF ? '\n' : '\r\n');
    }

    private alignText(text: string, align: string, length: number) {
        if (align === 'c' && length > text.length) {
            return (' '.repeat(Math.floor((length - text.length) / 2)) + text + ' '.repeat(length)).slice(0, length);
        } else if (align === 'r') {
            return (' '.repeat(length) + text).slice(-length);
        } else {
            return (text + ' '.repeat(length)).slice(0, length);
        }
    }
}
