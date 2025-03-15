'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { JSX, useEffect } from 'react'
import { useLocalStorage } from '../hooks/useLocalStorage'

const EDITOR_CONTENT_KEY = 'editor-content'

type TiptapEditorProps = {
    editorRef?: React.RefObject<{ focus: () => void } | undefined>;
}

export const TiptapEditor = ({ editorRef }: TiptapEditorProps): JSX.Element => {
    const [content, setContent] = useLocalStorage<string>(EDITOR_CONTENT_KEY, '')

    const editor = useEditor({
        extensions: [
            StarterKit.configure({
                heading: false,
            }),
            Placeholder.configure({
                placeholder: '',
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            const newContent = editor.getHTML()
            setContent(newContent)
        },
        editorProps: {
            attributes: {
                // CSS for the editable element itself (contentEditable div)
                // Only include focus and cursor styles here
                class: 'focus:outline-none cursor-text'
            }
        },
        autofocus: true
    })

    // Expose focus method to parent component through ref
    useEffect(() => {
        if (editorRef && editor) {
            editorRef.current = {
                focus: () => editor.commands.focus()
            };
        }
    }, [editor, editorRef]);

    return (
        // Container wrapper - controls the width constraints and horizontal centering
        <div className="w-full max-w-3xl mx-auto">
            {/* EditorContent wrapper - controls the editor's appearance and behavior */}
            <EditorContent
                editor={editor}
                className="prose max-w-none overflow-auto max-h-[70vh]"
            />
        </div>
    )
}

// Need to use default export since this is a CSR component loaded with dynamic import
export default TiptapEditor