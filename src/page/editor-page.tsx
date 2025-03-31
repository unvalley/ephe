import "./globals.css";
import { EditorApp } from "../components/editor-app";

export const EditorPage = () => {
  return (
    <div className="antialiased h-full w-full bg-graph-paper">
      <EditorApp />
    </div>
  );
};
