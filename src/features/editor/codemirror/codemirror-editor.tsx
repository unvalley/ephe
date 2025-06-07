"use client";

import { useMarkdownEditor } from "./use-markdown-editor";
import { useImperativeHandle } from "react";
import type { EditorView } from "@codemirror/view";

export type CodeMirrorEditorRef = {
  view: EditorView | undefined;
};

export const CodeMirrorEditor = ({ ref }: { ref?: React.Ref<CodeMirrorEditorRef> }) => {
  const { editor, view } = useMarkdownEditor();

  useImperativeHandle(
    ref,
    () => ({
      view,
    }),
    [view],
  );

  return <div data-testid="code-mirror-editor" ref={editor} className="mx-auto h-full w-full" />;
};
