"use client";

import dynamic from "next/dynamic";

// tiptap editor is a client only component
const TiptapEditor = dynamic(() => import("../components/tiptap"), {
    ssr: false,
    loading: () => <div className="h-screen w-screen flex items-center justify-center">Loading editor...</div>
});

export default function Page() {
    return (
        <div className="h-screen w-screen flex justify-center pt-16">
            <TiptapEditor />
        </div>
    );
}
