import "./globals.css";
import { ThemeProvider } from "../hooks/use-theme";
import { EditorApp } from "./editor-app";

export const EditorContainer = () => {
  return (
    <div className="h-full w-full">
      <div className="antialiased h-full w-full">
        <ThemeProvider>
          <EditorApp />
        </ThemeProvider>
      </div>
    </div>
  );
};
