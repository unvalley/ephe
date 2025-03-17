import {editor} from 'monaco-editor';
import {activateFormatting} from "./formatting";
import {setWordDefinitionFor, TextEditor} from "./vscode-monaco";
import {activateListEditing} from "./listEditing";
import {activateCompletion} from "./completion";
import {activateTableFormatter} from "./tableFormatter";

import {activateMarkdownMath} from "./markdown.contribution";

export class MonacoMarkdownExtension {
    activate(editor: editor.IStandaloneCodeEditor) {
        const textEditor = new TextEditor(editor)

        activateFormatting(textEditor)
        activateListEditing(textEditor)
        activateCompletion(textEditor)
        activateTableFormatter(textEditor)

        // Allow `*` in word pattern for quick styling
        setWordDefinitionFor(textEditor.languageId,
            /(-?\d*\.\d\w*)|([^\!\@\#\%\^\&\(\)\-\=\+\[\{\]\}\\\|\;\:\'\"\,\.\<\>\/\?\s\，\。\《\》\？\；\：\‘\“\’\”\（\）\【\】\、]+)/g
        );
    }
}

activateMarkdownMath()
