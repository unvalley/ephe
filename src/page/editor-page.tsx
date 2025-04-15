import "../globals.css";
import { EditorApp } from "../features/editor/monaco/monaco-editor-app";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { useTabDetection } from "../features/editor/use-tab-detection";
import { AlreadyOpenDialog } from "../utils/components/already-open-dialog";
import { Footer } from "../utils/components/footer";
import { useState } from "react";

const usePreviewMode = () => {
  const [previewMode, setPreviewMode] = useState(false);
  const togglePreviewMode = () => setPreviewMode(!previewMode);
  return { previewMode, togglePreviewMode };
};

export const EditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { shouldShowAlert, dismissAlert } = useTabDetection();
  const { previewMode, togglePreviewMode } = usePreviewMode();

  return (
    <div className={`flex h-screen flex-col antialiased ${paperModeClass} overflow-hidden`}>
      <div className="flex flex-1 flex-col overflow-hidden">
        <EditorApp />
      </div>

      <div className="w-full">
        <Footer previewMode={previewMode} togglePreview={togglePreviewMode} />
      </div>

      <AlreadyOpenDialog shouldShowAlert={shouldShowAlert} onContinue={dismissAlert} />
    </div>
  );
};
