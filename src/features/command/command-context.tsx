import { createContext, useContext, useState, useEffect, useCallback, ReactNode, useRef } from "react";
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
  const navigate = useNavigate();

  const openCommandMenu = useCallback(() => {
    setIsCommandMenuOpen(true);
  }, []);

  const closeCommandMenu = useCallback(() => {
    setIsCommandMenuOpen(false);
  }, []);

  const toggleCommandMenu = useCallback(() => {
    setIsCommandMenuOpen((prev) => !prev);
  }, []);

  const updateEditorInfo = useCallback((info: Partial<EditorInfo>) => {
    setEditorInfo(prev => ({ ...prev, ...info }));
  }, []);

  // Add global keyboard shortcut for Cmd+K
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

  return (
    <CommandContext.Provider
      value={{
        isCommandMenuOpen,
        openCommandMenu,
        closeCommandMenu,
        toggleCommandMenu,
        updateEditorInfo,
        editorInfo,
      }}
    >
      {children}
      <GlobalCommandMenu isOpen={isCommandMenuOpen} onClose={closeCommandMenu} editorInfo={editorInfo} />
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

// Enhanced global command menu that uses editor info when available
const GlobalCommandMenu = ({ 
  isOpen, 
  onClose,
  editorInfo
}: { 
  isOpen: boolean; 
  onClose: () => void;
  editorInfo: EditorInfo; 
}) => {
  const navigate = useNavigate();
  const { toggleTheme } = useTheme();

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