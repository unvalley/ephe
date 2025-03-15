"use client";

import { useEditor, EditorContent } from "@tiptap/react";
import Placeholder from "@tiptap/extension-placeholder";
import { type JSX, useEffect, useCallback } from "react";
import { useLocalStorage } from "../hooks/use-local-storage";
import Document from '@tiptap/extension-document';
import Paragraph from '@tiptap/extension-paragraph';
import Text from '@tiptap/extension-text';
import { MarkdownTaskList } from "./markdown-task-list";
import { useDebouncedCallback } from "../hooks/use-debounce";

const EDITOR_CONTENT_KEY = "editor-content";


type TiptapEditorProps = {
    editorRef?: React.RefObject<{ focus: () => void } | undefined>;
};

export const TiptapEditor = ({ editorRef }: TiptapEditorProps): JSX.Element => {
    const [content, setContent] = useLocalStorage<string>(EDITOR_CONTENT_KEY, "");

    const debouncedSetContent = useDebouncedCallback(
        (newContent: string) => {
            setContent(newContent);
        },
        400
    );

    const editor = useEditor({
        extensions: [
            Document,
            Paragraph,
            Text,
            Placeholder.configure({
                placeholder: quotePlaceholder(),
                emptyEditorClass: "is-editor-empty",
            }),
            MarkdownTaskList,
        ],
        content: content,
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML();
            debouncedSetContent(newContent);
        },
        editorProps: {
            attributes: {
                // CSS for the editable element itself (contentEditable div)
                // Only include focus and cursor styles here
                class: "focus:outline-none cursor-text space-mono",
            },
        },
        autofocus: true,
    });

    // Expose focus method to parent component through ref
    useEffect(() => {
        if (editorRef && editor) {
            editorRef.current = {
                focus: () => editor.commands.focus(),
            };
        }
    }, [editor, editorRef]);

    return (
        // Container wrapper - controls the width constraints and horizontal centering
        <div className="w-full max-w-2xl mx-auto">
            {/* EditorContent wrapper - controls the editor's appearance and behavior */}
            <EditorContent
                editor={editor}
                className="prose max-w-none overflow-auto"
            />
        </div>
    );
};

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

const quotePlaceholder = () => {
    return WRITING_QUOTES[Math.floor(Math.random() * WRITING_QUOTES.length)];
};

// Need to use default export since this is a CSR component loaded with dynamic import
export default TiptapEditor;
