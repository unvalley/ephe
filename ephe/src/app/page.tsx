"use client";

import Avatar from "boring-avatars";
import dynamic from "next/dynamic";
import { useRef, memo } from "react";
import { useTheme } from "../hooks/use-theme";

const EPHE_VERSION = "0.0.1";

// Monaco editor is a client only component
const MonacoEditor = dynamic(
    () => import("../components/monaco-editor").then((mod) => mod.MonacoEditor),
    {
        ssr: false,
        loading: () => (
            <div className="h-screen w-screen flex items-center justify-center pb-72" aria-label="loading">
                <div className="animate-ping h-4 w-4 bg-gray-100 rounded-full dark:bg-gray-700" />
            </div>
        ),
    },
);

export default function Page() {
    const editorRef = useRef<{ focus: () => void } | undefined>(undefined);

    // Focus the editor when clicking anywhere in the page container
    const handlePageClick = () => {
        if (editorRef.current) {
            editorRef.current.focus();
        }
    };

    return (
        // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
        <div
            className="h-screen w-screen flex flex-col justify-center dark:bg-gray-900 dark:text-gray-100"
            onClick={handlePageClick}
        >
            <div className="flex-1 flex justify-center pt-16 pb-8 overflow-hidden">
                <MonacoEditor editorRef={editorRef} />
            </div>
            <MemoizedEditorFooter />
        </div>
    );
}

const EditorFooter = () => {
    const { theme, toggleTheme } = useTheme();
    const isDark = theme === "dark";

    return (
        <footer className="fixed inset-x-0 bottom-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm fira-code">
            <div className="mx-auto px-2 py-0.5 text-sm text-gray-600 dark:text-gray-400 flex justify-between">
                <nav className="flex gap-4">
                    <a href="https://github.com/unvalley/ephe" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-gray-100">
                        Home
                    </a>
                    <a href="https://github.com/unvalley/ephe#README" target="_blank" rel="noopener noreferrer" className="hover:text-gray-900 dark:hover:text-gray-100">
                        About
                    </a>
                    <button
                        type="button"
                        onClick={(e) => {
                            e.stopPropagation();
                            toggleTheme();
                        }}
                        className="hover:text-gray-900 dark:hover:text-gray-100"
                        aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
                    >
                        {isDark ? "Light" : "Dark"}
                    </button>
                </nav>
                <div className="flex items-center gap-2">
                    <Avatar size={14} name="ephe" />
                    <span>Ephe v{EPHE_VERSION}</span>
                </div>
            </div>
        </footer>
    );
};

// Memoize the footer to prevent unnecessary re-renders
const MemoizedEditorFooter = memo(EditorFooter);
