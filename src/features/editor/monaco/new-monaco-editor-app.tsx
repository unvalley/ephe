import { useRef, useEffect, useState } from "react";
import * as monaco from "monaco-editor";
import { editorOptions, EPHE_DARK_THEME, EPHE_LIGHT_THEME } from "./editor-utils";
import { PlaceholderWidget } from "./placeholder-widget";
import { getRandomQuote } from ".";
import { useTheme } from "../../../utils/hooks/use-theme";
import { MonacoMarkdownExtension } from "./monaco-markdown";

export const NewMonacoEditor = () => {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const placeholderRef = useRef<PlaceholderWidget | null>(null);
  const [placeholder, _] = useState<string>(getRandomQuote());
  const { isDarkMode } = useTheme();

  const handlePlaceholder = (updatedText: string) => {
    if (placeholder === "" || !editorRef.current) return;
    if (placeholderRef.current == null) {
      placeholderRef.current = new PlaceholderWidget(editorRef.current, placeholder);
    }
    if (updatedText.length > 0) {
      editorRef.current.removeContentWidget(placeholderRef.current);
    } else {
      editorRef.current.addContentWidget(placeholderRef.current);
    }
  };

  useEffect(() => {
    if (editorContainerRef.current) {
      // theme
      monaco.editor.defineTheme(EPHE_LIGHT_THEME.name, EPHE_LIGHT_THEME.theme);
      monaco.editor.defineTheme(EPHE_DARK_THEME.name, EPHE_DARK_THEME.theme);
      
      // TODO: set theme
      editorRef.current = monaco.editor.create(editorContainerRef.current, {
        ...editorOptions,
        automaticLayout: true, // コンテナのリサイズに合わせてエディタもリサイズ
      });

      const mdExt = new MonacoMarkdownExtension();
      mdExt.activate(editorRef.current);
    }

    return () => {
      if (editorRef.current) {
        console.log("Disposing Monaco Editor instance.");
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
  }, []);

  return (
  <>
  <div ref={editorContainerRef} className="h-full" />;
  </>
  )
};
