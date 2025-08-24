"use client";

import { useMarkdownEditor } from "./use-markdown-editor";
import { useImperativeHandle } from "react";
import type { SingleEditorRef } from "../editor-ref";

type CodeMirrorEditorProps = {
  initialContent?: string;
  documentId?: string;
  onChange?: (content: string) => void;
  ref?: React.Ref<SingleEditorRef>;
};

export const CodeMirrorEditor = ({ initialContent, documentId, onChange, ref }: CodeMirrorEditorProps) => {
  const { editor, view: viewRef } = useMarkdownEditor(initialContent, documentId, onChange);

  useImperativeHandle(
    ref,
    () => ({
      get view() {
        return viewRef.current;
      },
      getCurrentContent: () => {
        return viewRef.current?.state.doc.toString() ?? "";
      },
      setContent: (content: string) => {
        const view = viewRef.current;
        if (view) {
          view.dispatch({
            changes: {
              from: 0,
              to: view.state.doc.length,
              insert: content,
            },
          });
        }
      },
    }),
    [],
  );

  return <div data-testid="code-mirror-editor" ref={editor} className="mx-auto h-full w-full" />;
};
