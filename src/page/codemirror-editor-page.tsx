import "../globals.css";
import { CodeMirrorEditor } from "../features/editor/codemirror-editor";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { Footer } from "../utils/components/footer";
import { useState } from "react";

const usePreviewMode = () => {
  const [previewMode, setPreviewMode] = useState(false);
  const togglePreviewMode = () => setPreviewMode(!previewMode);
  return { previewMode, togglePreviewMode };
};

export const CodeMirrorEditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { previewMode, togglePreviewMode } = usePreviewMode();

  return (
    <div className={`h-screen flex flex-col antialiased ${paperModeClass} overflow-hidden`}>
      <div className="flex-1 flex flex-col overflow-hidden">
        <CodeMirrorEditor />
      </div>
      
      <div className="w-full">
        <Footer previewMode={previewMode} togglePreview={togglePreviewMode} />
      </div>
    </div>
  );
}; 