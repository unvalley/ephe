import "../globals.css";
import { EditorApp } from "../features/editor/editor-app";
import { usePaperMode } from "../utils/hooks/use-paper-mode";

export const EditorPage = () => {
  const { paperModeClass } = usePaperMode();

  return (
    <div className={`h-full w-full antialiased ${paperModeClass}`}>
      <EditorApp />
    </div>
  );
};
