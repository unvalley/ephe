import { createContext, useContext, useState, useCallback, ReactNode } from "react";
import type { RefObject } from "react";
import type { editor } from "monaco-editor";

type TocContextType = {
  isTocVisible: boolean;
  toggleToc: () => void;
};

const TocContext = createContext<TocContextType>({
  isTocVisible: false,
  toggleToc: () => {},
});

interface TocProviderProps {
  children: ReactNode;
}

export const TocProvider = ({ children }: TocProviderProps) => {
  const [isTocVisible, setIsTocVisible] = useState(false);

  const toggleToc = useCallback(() => {
    setIsTocVisible((prev) => !prev);
  }, []);

  return <TocContext.Provider value={{ isTocVisible, toggleToc }}>{children}</TocContext.Provider>;
};

type UseTocProps = {
  editorRef?: RefObject<editor.IStandaloneCodeEditor | null>;
};

export const useToc = (props?: UseTocProps) => {
  const { isTocVisible, toggleToc } = useContext(TocContext);

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

  return {
    isTocVisible,
    toggleToc,
    focusOnSection,
  };
};
