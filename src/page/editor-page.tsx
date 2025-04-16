import "../globals.css";
// import { EditorApp } from "../features/editor/monaco/monaco-editor-app";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { useTabDetection } from "../features/editor/use-tab-detection";
import { AlreadyOpenDialog } from "../utils/components/already-open-dialog";
import { Footer } from "../utils/components/footer";
import { useEffect, useState, useCallback } from "react";
import { NewMonacoEditor } from "../features/editor/monaco/new-monaco-editor-app";
import { CommandMenu } from "../features/command/command-k";

const usePreviewMode = () => {
  const [previewMode, setPreviewMode] = useState(false);
  const togglePreviewMode = () => setPreviewMode(!previewMode);
  return { previewMode, togglePreviewMode };
};

export const EditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { shouldShowAlert, dismissAlert } = useTabDetection();
  const { previewMode, togglePreviewMode } = usePreviewMode();
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  const toggleCommandMenu = useCallback(() => {
    setIsCommandMenuOpen((prev) => !prev);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        toggleCommandMenu();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleCommandMenu]);

  return (
    <div className={`flex h-screen flex-col antialiased ${paperModeClass} overflow-hidden`}>
      <div className="flex flex-1 flex-col overflow-hidden">
        <NewMonacoEditor commandMenuOpen={isCommandMenuOpen} setCommandMenuOpen={toggleCommandMenu} />
      </div>

      <div className="w-full">
        <Footer previewMode={previewMode} togglePreview={togglePreviewMode} />
      </div>

      {isCommandMenuOpen && <CommandMenu open={isCommandMenuOpen} onClose={toggleCommandMenu} />}
      <AlreadyOpenDialog shouldShowAlert={shouldShowAlert} onContinue={dismissAlert} />
    </div>
  );
};
