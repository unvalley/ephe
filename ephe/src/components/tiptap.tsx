'use client'

import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { useState } from 'react'

const TiptapEditor = () => {
    const [content, setContent] = useState('<p>Hello World! This is a basic Tiptap editor.</p>')

    const editor = useEditor({
        extensions: [StarterKit],
        content: content,
        onUpdate: ({ editor }) => {
            setContent(editor.getHTML())
        },
    })

    return (
        <div className="tiptap-editor">
            <EditorContent editor={editor} className="min-h-[200px] p-4 border rounded-md focus:outline-none" />

            {/* Optional toolbar */}
            <div className="flex gap-2 mt-2">
                <button
                    onClick={() => editor?.chain().focus().toggleBold().run()}
                    className={`p-2 border rounded ${editor?.isActive('bold') ? 'bg-gray-200' : ''}`}
                >
                    Bold
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleItalic().run()}
                    className={`p-2 border rounded ${editor?.isActive('italic') ? 'bg-gray-200' : ''}`}
                >
                    Italic
                </button>
                <button
                    onClick={() => editor?.chain().focus().toggleBulletList().run()}
                    className={`p-2 border rounded ${editor?.isActive('bulletList') ? 'bg-gray-200' : ''}`}
                >
                    Bullet List
                </button>
            </div>
        </div>
    )
}

export default TiptapEditor

