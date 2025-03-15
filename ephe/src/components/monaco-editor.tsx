"use client";

import { useEffect, useRef, useState } from "react";
import { useLocalStorage } from "../hooks/use-local-storage";
import { useDebouncedCallback } from "../hooks/use-debounce";
import type * as monaco from "monaco-editor";
import { Editor } from "@monaco-editor/react";
import type { EditorProps } from "@monaco-editor/react";
import type React from "react";

const EDITOR_CONTENT_KEY = "editor-content";

const WRITING_QUOTES = [
    "The scariest moment is always just before you start. - Stephen King",
    "Fill your paper with the breathings of your heart. - William Wordsworth",
    "The pen is mightier than the sword. - Thomas Jefferson",
    "The best way to predict the future is to invent it. - Alan Kay",
    "The only way to do great work is to love what you do. - Steve Jobs",
    "A word after a word after a word is power. - Margaret Atwood",
    "Get things done. - David Allen",
    "Later equals never. - LeBlanc's Law",
    "Divide and conquer. - Julius Caesar",
];

const getRandomQuote = (): string => {
    return WRITING_QUOTES[Math.floor(Math.random() * WRITING_QUOTES.length)];
};

type MonacoEditorProps = {
    editorRef?: React.RefObject<{ focus: () => void } | undefined>;
};

export const MonacoEditor = ({ editorRef }: MonacoEditorProps): React.ReactElement => {
    const [content, setContent] = useLocalStorage<string>(EDITOR_CONTENT_KEY, "");
    const monacoRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const [placeholder, setPlaceholder] = useState<string>(getRandomQuote());

    const debouncedSetContent = useDebouncedCallback(
        (newContent: string) => {
            setContent(newContent);
        },
        400
    );

    // Handle editor mounting
    const handleEditorDidMount = (
        editor: monaco.editor.IStandaloneCodeEditor,
        monaco: typeof import("monaco-editor")
    ) => {
        monacoRef.current = editor;

        // Set up placeholder when editor is empty
        const updatePlaceholder = () => {
            const contentValue = editor.getValue();
            const placeholderElement = document.querySelector('.monaco-placeholder');

            if (placeholderElement) {
                if (!contentValue.trim()) {
                    placeholderElement.classList.remove('hidden');
                } else {
                    placeholderElement.classList.add('hidden');
                }
            }
        };

        // Add keyboard event handler for task list continuation
        editor.onKeyDown((e) => {
            if (e.keyCode === monaco.KeyCode.Enter) {
                const model = editor.getModel();
                if (!model) return;

                const position = editor.getPosition();
                if (!position) return;

                const lineContent = model.getLineContent(position.lineNumber);
                // より柔軟なマッチングパターンを使用
                const taskListMatch = lineContent.match(/^(\s*)- \[\s*([xX ])\s*\]/);

                if (taskListMatch) {
                    // If the current line is a task list item
                    const indentation = taskListMatch[1] || '';
                    const checkboxEndPos = lineContent.indexOf(']') + 1;

                    // If the line only contains the task list marker and nothing else, 
                    // remove the current line's task list marker
                    if (lineContent.trim().match(/^- \[\s*([xX ])\s*\]\s*$/)) {
                        e.preventDefault();
                        editor.executeEdits('', [
                            {
                                range: {
                                    startLineNumber: position.lineNumber,
                                    startColumn: 1,
                                    endLineNumber: position.lineNumber,
                                    endColumn: lineContent.length + 1
                                },
                                text: ''
                            }
                        ]);
                        return;
                    }

                    // カーソルがチェックボックスの後ろにある場合
                    if (position.column > checkboxEndPos) {
                        // カーソルが行末にある場合は新しいタスクリストを追加
                        if (position.column > lineContent.length) {
                            e.preventDefault();
                            editor.executeEdits('', [
                                {
                                    range: {
                                        startLineNumber: position.lineNumber,
                                        startColumn: position.column,
                                        endLineNumber: position.lineNumber,
                                        endColumn: position.column
                                    },
                                    text: `\n${indentation}- [ ] `
                                }
                            ]);
                        } else {
                            // カーソルが行の途中にある場合は単に行を分割
                            e.preventDefault();
                            const textBeforeCursor = lineContent.substring(0, position.column - 1);
                            const textAfterCursor = lineContent.substring(position.column - 1);

                            editor.executeEdits('', [
                                {
                                    range: {
                                        startLineNumber: position.lineNumber,
                                        startColumn: 1,
                                        endLineNumber: position.lineNumber,
                                        endColumn: lineContent.length + 1
                                    },
                                    text: `${textBeforeCursor}\n${textAfterCursor}`
                                }
                            ]);
                        }
                    } else {
                        // カーソルがチェックボックスの前または中にある場合は通常の改行
                        // デフォルトの動作を許可
                    }
                }
            }
        });

        // Add click handler for task list checkboxes
        editor.onMouseDown((e) => {
            if (e.target.type !== monaco.editor.MouseTargetType.CONTENT_TEXT) {
                return;
            }

            const model = editor.getModel();
            if (!model) return;

            const position = e.target.position;
            if (!position) return;

            const lineContent = model.getLineContent(position.lineNumber);

            // より柔軟なマッチングパターンを使用
            const checkboxMatch = lineContent.match(/^(\s*)- \[\s*([xX ])\s*\] (.*)/);
            if (checkboxMatch) {
                const indentation = checkboxMatch[1] || '';
                // 大文字のXも許容
                const isChecked = checkboxMatch[2].toLowerCase() === 'x';
                const taskText = checkboxMatch[3];

                // Calculate checkbox position in the line
                const checkboxStart = indentation.length + 3; // "- [" length
                const checkboxEnd = checkboxStart + 1; // single character inside brackets

                // チェックボックス周辺のクリック判定を少し広げる
                const clickAreaStart = Math.max(1, checkboxStart - 1);
                const clickAreaEnd = checkboxEnd + 1;

                // Check if click is within the checkbox area
                if (position.column >= clickAreaStart && position.column <= clickAreaEnd) {
                    // Toggle checkbox state
                    const newState = isChecked ? ' ' : 'x';

                    // Apply the edit to toggle checkbox
                    editor.executeEdits('', [
                        {
                            range: {
                                startLineNumber: position.lineNumber,
                                startColumn: 1,
                                endLineNumber: position.lineNumber,
                                endColumn: lineContent.length + 1
                            },
                            text: `${indentation}- [${newState}] ${taskText}`
                        }
                    ]);

                    updateDecorations();

                    // Return false to prevent default handling instead of using preventDefault
                    return false;
                }
            }
        });

        // Add decorations for checked tasks
        const updateDecorations = () => {
            const model = editor.getModel();
            if (!model) return;

            const decorations: monaco.editor.IModelDeltaDecoration[] = [];

            for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
                const lineContent = model.getLineContent(lineNumber);
                // より柔軟なマッチングパターンを使用（空白の数を考慮）
                const checkedTaskMatch = lineContent.match(/^(\s*)- \[\s*[xX]\s*\] (.*)/);

                if (checkedTaskMatch) {
                    const indentation = checkedTaskMatch[1] || '';

                    // 行全体に打ち消し線を適用（チェックボックス部分も含む）
                    decorations.push({
                        range: new monaco.Range(
                            lineNumber,
                            1, // 行の先頭から
                            lineNumber,
                            lineContent.length + 1 // 行の末尾まで
                        ),
                        options: {
                            inlineClassName: 'text-decoration-line-through text-gray-500'
                        }
                    });
                }
            }

            editor.deltaDecorations([], decorations);
        };

        // Update placeholder and decorations on content change
        editor.onDidChangeModelContent(() => {
            updatePlaceholder();
            updateDecorations();
            debouncedSetContent(editor.getValue());
        });

        // Initial setup
        updatePlaceholder();
        updateDecorations();

        // Focus editor on mount
        editor.focus();
    };

    // Expose focus method to parent component through ref
    useEffect(() => {
        if (editorRef && monacoRef.current) {
            editorRef.current = {
                focus: () => monacoRef.current?.focus(),
            };
        }
    }, [editorRef]);

    // Configure editor options
    const editorOptions: EditorProps["options"] = {
        minimap: { enabled: false },
        lineNumbers: "off",
        wordWrap: "on",
        wrappingIndent: "same",
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 0,
        glyphMargin: false,
        folding: false,
        renderLineHighlight: "none",
        scrollBeyondLastLine: false,
        renderWhitespace: "none",
        fontFamily: "monospace",
        fontSize: 14,
        contextmenu: false,
        scrollbar: {
            vertical: "auto",
            horizontal: "auto",
            verticalScrollbarSize: 0,
            horizontalScrollbarSize: 0,
            verticalSliderSize: 0,
            horizontalSliderSize: 0,
            alwaysConsumeMouseWheel: false
        },
        overviewRulerBorder: false,
        overviewRulerLanes: 0,
        hideCursorInOverviewRuler: true,
        renderValidationDecorations: "off",
        quickSuggestions: true,
        suggestOnTriggerCharacters: false,
        acceptSuggestionOnEnter: "off",
        tabCompletion: "off",
        wordBasedSuggestions: "off",
        parameterHints: { enabled: false },
    };

    return (
        // Container wrapper - controls the width constraints and horizontal centering
        <div className="w-full max-w-2xl mx-auto relative h-full">
            {/* Placeholder element that shows when editor is empty */}
            <div className="monaco-placeholder absolute top-0 left-0 p-4 text-gray-400 pointer-events-none">
                {placeholder}
            </div>

            {/* Monaco Editor wrapper */}
            <Editor
                height="100%"
                width="100%"
                defaultLanguage="markdown"
                defaultValue={content}
                options={editorOptions}
                onMount={handleEditorDidMount}
                className="overflow-hidden"
                loading=""
            />

            {/* Add CSS for strikethrough */}
            <style jsx global>{`
                .text-decoration-line-through {
                    text-decoration: line-through;
                }
            `}</style>
        </div>
    );
};

// Need to use default export since this is a CSR component loaded with dynamic import
export default MonacoEditor; 