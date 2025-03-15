'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Placeholder from '@tiptap/extension-placeholder'
import { JSX, useState } from 'react'

const TiptapEditor = (): JSX.Element => {
    const [content, setContent] = useState<string>('')

    const editor = useEditor({
        extensions: [
            StarterKit,
            Placeholder.configure({
                placeholder: 'Type something...',
                emptyEditorClass: 'is-editor-empty',
            }),
        ],
        content: content,
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML())
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

    return (
        // Container wrapper - controls the width constraints and horizontal centering
        <div
            onClick={() => editor?.commands.focus()}
            className="w-full max-w-3xl mx-auto"
        >
            {/* EditorContent wrapper - controls the editor's appearance and behavior */}
            <EditorContent
                editor={editor}
                className="prose max-w-none overflow-auto max-h-[70vh]"
            />
        </div>
    )
}

export default TiptapEditor