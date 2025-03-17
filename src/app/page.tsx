"use client";

import Avatar from "boring-avatars";
import dynamic from "next/dynamic";
import { useRef, memo, useState } from "react";
import { useTheme } from "../hooks/use-theme";
import Link from "next/link";

const EPHE_VERSION = "0.0.1";

// Monaco editor is a client only component
const MonacoEditor = dynamic(
  () => import("../components/monaco-editor").then((mod) => mod.MonacoEditor),
  {
    ssr: false,
    loading: () => (
      <div
        className="h-screen w-screen flex items-center justify-center pb-72"
        aria-label="loading"
      >
        <div className="animate-ping h-4 w-4 bg-gray-100 rounded-full dark:bg-gray-700" />
      </div>
    ),
  },
);

export default function Page() {
  const editorRef = useRef<{ focus: () => void } | undefined>(undefined);
  const [charCount, setCharCount] = useState<number>(0);

  // Focus the editor when clicking anywhere in the page container
  const handlePageClick = () => {
    if (editorRef.current) {
      editorRef.current.focus();
    }
  };

  return (
    // biome-ignore lint/a11y/useKeyWithClickEvents: <explanation>
    <div
      className="h-screen w-screen flex flex-col justify-center"
      onClick={handlePageClick}
    >
      <div className="flex-1 flex justify-center pt-16 pb-8 overflow-hidden">
        <MonacoEditor editorRef={editorRef} onWordCountChange={setCharCount} />
      </div>
      <MemoizedEditorFooter charCount={charCount} />
    </div>
  );
}

type EditorFooterProps = {
  charCount: number;
};

const EditorFooter = ({ charCount }: EditorFooterProps) => {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <footer className="fixed inset-x-0 bottom-0 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm space-mono">
      <div className="mx-auto px-2 py-0.5 text-sm text-gray-600 dark:text-gray-400 flex justify-between">
        <nav className="flex gap-4">
          <Link
            href="/landing"
            className="hover:text-gray-900 dark:hover:text-gray-100"
          >
            Home
          </Link>
          <a
            href="https://github.com/unvalley/ephe"
            target="_blank"
            rel="noopener noreferrer"
            className="hover:text-gray-900 dark:hover:text-gray-100"
          >
            GitHub
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
          <span className="text-gray-500">{charCount} chars</span>
          <Avatar
            size={14}
            name="Georgia O"
            colors={["#6c788e", "#a6aec1", "#cfd5e1", "#ededf2", "#fcfdff"]}
            variant="marble"
          />
          <span>Ephe v{EPHE_VERSION}</span>
        </div>
      </div>
    </footer>
  );
};

// Memoize the footer to prevent unnecessary re-renders
const MemoizedEditorFooter = memo(EditorFooter);
