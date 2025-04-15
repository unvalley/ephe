import "../globals.css";
import { CodeMirrorEditor } from "../features/editor/codemirror-editor";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { Footer } from "../utils/components/footer";
import { useState } from "react";
import { useTabDetection } from "../features/editor/use-tab-detection";
import { AlreadyOpenDialog } from "../utils/components/already-open-dialog";

const usePreviewMode = () => {
  const [previewMode, setPreviewMode] = useState(false);
  const togglePreviewMode = () => setPreviewMode(!previewMode);
  return { previewMode, togglePreviewMode };
};

export const CodeMirrorEditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { previewMode, togglePreviewMode } = usePreviewMode();
  const { shouldShowAlert, dismissAlert } = useTabDetection();

  return (
    <div className={`flex h-screen flex-col antialiased ${paperModeClass} overflow-hidden`}>
      <div className="flex flex-1 flex-col overflow-hidden">
        <CodeMirrorEditor />
      </div>

      <div className="w-full">
        <Footer previewMode={previewMode} togglePreview={togglePreviewMode} />
      </div>

      <AlreadyOpenDialog shouldShowAlert={shouldShowAlert} onContinue={dismissAlert} />
    </div>
  );
};
