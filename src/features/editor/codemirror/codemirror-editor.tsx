"use client";

import { useMarkdownEditor } from "./use-markdown-editor";

export const CodeMirrorEditor = () => {
  const { editor } = useMarkdownEditor();

  return <div data-testid="code-mirror-editor" ref={editor} className="mx-auto h-full w-full" />;
};
