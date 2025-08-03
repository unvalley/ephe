import type { EditorView } from "@codemirror/view";

export interface BaseEditorRef {
  view: EditorView | null;
  getCurrentContent: () => string;
  setContent: (content: string) => void;
}

export interface SingleEditorRef extends BaseEditorRef {}

export interface MultiEditorRef extends BaseEditorRef {
  navigateToDocument: (index: number) => void;
}