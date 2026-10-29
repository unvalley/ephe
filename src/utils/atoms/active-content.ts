import { atom } from "jotai";
import { editorModeAtom } from "../hooks/use-editor-mode";
import { editorContentAtom } from "./editor";
import { activeDocumentIndexAtom, documentsAtom } from "./multi-document";

// Content of the document currently being edited, in either editor mode
export const activeContentAtom = atom((get) => {
  if (get(editorModeAtom) === "multi") {
    return get(documentsAtom)[get(activeDocumentIndexAtom)]?.content ?? "";
  }
  return get(editorContentAtom);
});
