import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef, memo } from "react";
import { CommandMenu } from "./command-k";
import { useNavigate } from "react-router-dom";
import { useTheme } from "../../hooks/use-theme";
import type * as monaco from "monaco-editor";
import type { MarkdownFormatter } from "../editor/markdown/formatter/markdown-formatter";
import type { PaperMode } from "../../hooks/use-paper-mode";
import type { EditorWidth } from "../../hooks/use-editor-width";

// Define the editor props type
type EditorInfo = {
  editorContent: string;
  editorRef?: React.RefObject<monaco.editor.IStandaloneCodeEditor | null>;
  markdownFormatterRef?: React.RefObject<MarkdownFormatter | null>;
  paperMode?: PaperMode;
  cyclePaperMode?: () => PaperMode;
  editorWidth?: EditorWidth;
  toggleEditorWidth?: () => EditorWidth;
  previewMode?: boolean;
  togglePreviewMode?: () => void;
};

// Default editor info
const defaultEditorInfo: EditorInfo = {
  editorContent: "",
  previewMode: false,
};

type CommandContextType = {
  isCommandMenuOpen: boolean;
  openCommandMenu: () => void;
  closeCommandMenu: () => void;
  toggleCommandMenu: () => void;
  updateEditorInfo: (info: Partial<EditorInfo>) => void;
  editorInfo: EditorInfo;
};

const CommandContext = createContext<CommandContextType>({
  isCommandMenuOpen: false,
  openCommandMenu: () => {},
  closeCommandMenu: () => {},
  toggleCommandMenu: () => {},
  updateEditorInfo: () => {},
  editorInfo: defaultEditorInfo,
});

type CommandProviderProps = {
  children: ReactNode;
};

export const CommandProvider = ({ children }: CommandProviderProps) => {
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [editorInfo, setEditorInfo] = useState<EditorInfo>(defaultEditorInfo);

  const openCommandMenu = useCallback(() => {
    setIsCommandMenuOpen(true);
  }, []);

  const closeCommandMenu = useCallback(() => {
    setIsCommandMenuOpen(false);
  }, []);

  const toggleCommandMenu = useCallback(() => {
    setIsCommandMenuOpen((prev) => !prev);
  }, []);

  const getLatestEditorContent = useCallback(() => {
    if (editorInfo.editorRef?.current) {
      const currentContent = editorInfo.editorRef.current.getValue();
      setEditorInfo(prev => ({
        ...prev,
        editorContent: currentContent
      }));
    }
  }, [editorInfo.editorRef]);

  const updateEditorInfo = useCallback((info: Partial<EditorInfo>) => {
    if (isCommandMenuOpen) {
      setEditorInfo(prev => ({ ...prev, ...info }));
    } else {
      const minimalInfo: Partial<EditorInfo> = {};
      
      if (info.editorRef) minimalInfo.editorRef = info.editorRef;
      if (info.markdownFormatterRef) minimalInfo.markdownFormatterRef = info.markdownFormatterRef;
      if (info.cyclePaperMode) minimalInfo.cyclePaperMode = info.cyclePaperMode;
      if (info.toggleEditorWidth) minimalInfo.toggleEditorWidth = info.toggleEditorWidth;
      if (info.togglePreviewMode) minimalInfo.togglePreviewMode = info.togglePreviewMode;
      if (info.paperMode) minimalInfo.paperMode = info.paperMode;
      if (info.editorWidth) minimalInfo.editorWidth = info.editorWidth;
      if (info.previewMode !== undefined) minimalInfo.previewMode = info.previewMode;
      
      setEditorInfo(prev => ({ ...prev, ...minimalInfo }));
    }
  }, [isCommandMenuOpen]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && (e.key === "k" || e.key === "K")) {
        e.preventDefault();
        toggleCommandMenu();
      }
    };

    window.addEventListener("keydown", handleGlobalKeyDown);
    return () => window.removeEventListener("keydown", handleGlobalKeyDown);
  }, [toggleCommandMenu]);

  useEffect(() => {
    if (isCommandMenuOpen) {
      getLatestEditorContent();
    } else {
      setEditorInfo(prev => ({
        ...prev,
        editorContent: "",
      }));
    }
  }, [isCommandMenuOpen, getLatestEditorContent]);

  const contextValue = {
    isCommandMenuOpen,
    openCommandMenu,
    closeCommandMenu,
    toggleCommandMenu,
    updateEditorInfo,
    editorInfo,
  };

  return (
    <CommandContext.Provider value={contextValue}>
      {children}
      {isCommandMenuOpen && (
        <MemoizedGlobalCommandMenu 
          isOpen={isCommandMenuOpen} 
          onClose={closeCommandMenu} 
          editorInfo={editorInfo} 
        />
      )}
    </CommandContext.Provider>
  );
};

export const useCommandMenu = (): CommandContextType => {
  const context = useContext(CommandContext);
  if (context === undefined) {
    throw new Error("useCommandMenu must be used within a CommandProvider");
  }
  return context;
};

const GlobalCommandMenu = ({ 
  isOpen, 
  onClose,
  editorInfo
}: { 
  isOpen: boolean; 
  onClose: () => void;
  editorInfo: EditorInfo; 
}) => {
  if (!isOpen) return null;

  return (
    <CommandMenu
      open={isOpen}
      onClose={onClose}
      onOpen={() => {}}
      editorContent={editorInfo.editorContent}
      editorRef={editorInfo.editorRef}
      markdownFormatterRef={editorInfo.markdownFormatterRef}
      paperMode={editorInfo.paperMode}
      cyclePaperMode={editorInfo.cyclePaperMode}
      editorWidth={editorInfo.editorWidth}
      toggleEditorWidth={editorInfo.toggleEditorWidth}
      previewMode={editorInfo.previewMode}
      togglePreviewMode={editorInfo.togglePreviewMode}
    />
  );
};

const MemoizedGlobalCommandMenu = memo(GlobalCommandMenu); 