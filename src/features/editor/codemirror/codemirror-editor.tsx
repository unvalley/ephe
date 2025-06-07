"use client";

import { useMarkdownEditor } from "./use-markdown-editor";
import { forwardRef, useImperativeHandle } from "react";
import type { EditorView } from "@codemirror/view";

export interface CodeMirrorEditorRef {
  view: EditorView | undefined;
}

export const CodeMirrorEditor = forwardRef<CodeMirrorEditorRef>((_, ref) => {
  const { editor, view } = useMarkdownEditor();

  useImperativeHandle(ref, () => ({
    view,
  }), [view]);

  return <div data-testid="code-mirror-editor" ref={editor} className="mx-auto h-full w-full" />;
});

CodeMirrorEditor.displayName = "CodeMirrorEditor";
