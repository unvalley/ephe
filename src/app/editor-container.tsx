import "./globals.css";
import { EditorApp } from "./editor-app";

export const EditorContainer = () => {
  return (
    <div className="antialiased h-full w-full">
      <EditorApp />
    </div>
  );
};
