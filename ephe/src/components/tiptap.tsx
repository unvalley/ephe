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
                class: 'h-full w-full focus:outline-none cursor-text prose max-w-none'
            }
        },
        autofocus: true
    })

    return (
        <div
            onClick={() => editor?.commands.focus()}
            className="w-full max-w-3xl mx-auto"
        >
            <EditorContent
                editor={editor}
                className="overflow-auto max-h-[70vh]"
            />
        </div>
    )
}

export default TiptapEditor