import "./globals.css";
import { EditorApp } from "../features/editor/editor-app";
import { usePaperMode } from "../hooks/use-paper-mode";

export const EditorPage = () => {
  const { paperModeClass } = usePaperMode();

  return (
    <div className={`antialiased h-full w-full ${paperModeClass}`}>
      <EditorApp />
    </div>
  );
};
