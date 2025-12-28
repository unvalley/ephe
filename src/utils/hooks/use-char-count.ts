import { useAtomValue } from "jotai";
import { atom } from "jotai";
import { editorModeAtom } from "./use-editor-mode";
import { activeDocumentIndexAtom, documentsAtom } from "../atoms/multi-document";
import { editorContentAtom } from "../atoms/editor";

const charCountAtom = atom((get) => {
  const mode = get(editorModeAtom);

  if (mode === "multi") {
    const docs = get(documentsAtom);
    const idx = get(activeDocumentIndexAtom);
    return (docs[idx]?.content ?? "").length;
  }
  return get(editorContentAtom).length;
});

export const useCharCount = () => {
  const charCount = useAtomValue(charCountAtom);
  return { charCount };
};
