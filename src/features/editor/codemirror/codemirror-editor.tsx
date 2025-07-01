"use client";

import { useMarkdownEditor } from "./use-markdown-editor";
import { useImperativeHandle } from "react";
import type { EditorView } from "@codemirror/view";

export type CodeMirrorEditorRef = {
  view: EditorView | null;
};

export const CodeMirrorEditor = ({ ref }: { ref: React.Ref<CodeMirrorEditorRef> }) => {
  const { editor, view: viewRef } = useMarkdownEditor();

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
