import type { EditorView } from "@codemirror/view";

export type BaseEditorRef = {
  view: EditorView | null;
  getCurrentContent: () => string;
  setContent: (content: string) => void;
};

export type SingleEditorRef = BaseEditorRef;

export type MultiEditorRef = BaseEditorRef & {
  navigateToDocument: (index: number) => void;
};
