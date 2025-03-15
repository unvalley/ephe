"use client";

import Avatar from "boring-avatars";
import dynamic from "next/dynamic";
import { useRef } from "react";

const EPHE_VERSION = "0.0.1";

// tiptap editor is a client only component
const TiptapEditor = dynamic(() => import("../components/tiptap").then(mod => mod.TiptapEditor), {
    ssr: false,
    loading: () => <div className="h-screen w-screen flex items-center justify-center">Loading editor...</div>
});

export default function Page() {
    const editorRef = useRef<{ focus: () => void } | undefined>(undefined);

    // Focus the editor when clicking anywhere in the page container
    const handlePageClick = () => {
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    return (
        <div
            className="h-screen w-screen flex justify-center pt-16"
            onClick={handlePageClick}
        >
            <TiptapEditor editorRef={editorRef} />
            <EditorFooter />
        </div>
    );
}

const EditorFooter = () => {
    return (
        <footer className="fixed inset-x-0 bottom-0 bg-white/80 backdrop-blur-sm">
            <div className="mx-auto px-2 py-0.5 text-sm text-gray-600 flex justify-between">
                <nav className="flex gap-4">
                    <a href="#" className="hover:text-gray-900">Home</a>
                    <a href="#" className="hover:text-gray-900">About</a>
                </nav>
                <div className="flex items-center gap-2">
                    <Avatar size={14} name="ephe" />
                    <span>Ephe v{EPHE_VERSION}</span>
                </div>
            </div>
        </footer>
    );
}