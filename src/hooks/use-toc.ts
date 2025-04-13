import { useCallback } from "react";
import type { RefObject } from "react";
import type { editor } from "monaco-editor";
import { LOCAL_STORAGE_KEYS } from "../utils/constants";
import { atomWithStorage } from "jotai/utils";
import { useAtom } from "jotai";

type UseTocProps = {
  editorRef: RefObject<editor.IStandaloneCodeEditor | null>;
};

const tocAtom = atomWithStorage<boolean>(LOCAL_STORAGE_KEYS.TOC_MODE, false);

export const useToc = (props?: UseTocProps) => {
  const [isVisibleToc, setIsVisibleToc] = useAtom(tocAtom);

  const focusOnSection = useCallback(
    (line: number) => {
      if (!props?.editorRef?.current) return;
      // Position to the start of the clicked heading line
      props.editorRef.current.revealLineInCenter(line + 1);
      props.editorRef.current.setPosition({ lineNumber: line + 1, column: 1 });
      props.editorRef.current.focus();
    },
    [props?.editorRef],
  );

  const toggleToc = useCallback(() => {
    setIsVisibleToc((prev) => !prev);
  }, [setIsVisibleToc]);

  return {
    isVisibleToc,
    toggleToc,
    focusOnSection,
  };
};
