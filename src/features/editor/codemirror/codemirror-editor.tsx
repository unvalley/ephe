"use client";

import { useMarkdownEditor } from "./use-markdown-editor";
import { useImperativeHandle } from "react";
import type { EditorView } from "@codemirror/view";

export type CodeMirrorEditorRef = {
  view: EditorView | null;
};

type CodeMirrorEditorProps = {
  initialContent?: string;
  documentId?: string;
  onChange?: (content: string) => void;
  ref?: React.Ref<CodeMirrorEditorRef>;
};

export const CodeMirrorEditor = ({ initialContent, documentId, onChange, ref }: CodeMirrorEditorProps) => {
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
};
