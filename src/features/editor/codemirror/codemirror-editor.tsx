"use client";

type Props = {
  editorRef: React.RefObject<HTMLDivElement | null>;
};

export const CodeMirrorEditor = ({ editorRef }: Props) => {
  if (!editorRef) {
    return null;
  }
  return <div data-testid="code-mirror-editor" ref={editorRef} className="mx-auto h-full w-full" />;
};
