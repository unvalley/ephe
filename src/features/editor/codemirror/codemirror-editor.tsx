"use client";

import { useMarkdownEditor } from "./use-markdown-editor";
import { useImperativeHandle, forwardRef } from "react";
import type { EditorView } from "@codemirror/view";

export type CodeMirrorEditorRef = {
  view: EditorView | null;
};

type CodeMirrorEditorProps = {
  initialContent?: string;
  documentId?: string;
  onChange?: (content: string) => void;
};

export const CodeMirrorEditor = forwardRef<CodeMirrorEditorRef, CodeMirrorEditorProps>(
  ({ initialContent, documentId, onChange }, ref) => {
    const { editor, view: viewRef } = useMarkdownEditor(initialContent, documentId, onChange);

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
  },
);
