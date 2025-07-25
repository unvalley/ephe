"use client";

import { useMarkdownEditor } from "./use-markdown-editor";
import { useImperativeHandle, forwardRef } from "react";
import type { EditorView } from "@codemirror/view";

export type CodeMirrorEditorRef = {
  view: EditorView | null;
};

export const CodeMirrorEditor = forwardRef<CodeMirrorEditorRef, { initialContent?: string; documentId?: string }>(({ initialContent, documentId }, ref) => {
  const { editor, view: viewRef } = useMarkdownEditor(initialContent, documentId);

  useImperativeHandle(
    ref,
    () => ({
      get view() {
        return viewRef.current;
      },
    }),
    [],
  );

  return <div data-testid="code-mirror-editor" ref={editor} className="mx-auto h-full w-full" />;
});
