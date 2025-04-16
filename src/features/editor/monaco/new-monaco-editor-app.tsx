import { useRef, useEffect, useState } from "react";
import * as monaco from "monaco-editor";
import { editorOptions, EPHE_DARK_THEME, EPHE_LIGHT_THEME } from "./editor-utils";
import { PlaceholderWidget } from "./placeholder-widget";
import { getRandomQuote } from "../quotes";
import { useTheme } from "../../../utils/hooks/use-theme";
import { MonacoMarkdownExtension } from "./monaco-markdown";

export const NewMonacoEditor = () => {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);

  const placeholderRef = useRef<PlaceholderWidget | null>(null);
  const [placeholder] = useState<string>(getRandomQuote());
  const { isDarkMode } = useTheme();
  const [isEditorMounted, setIsEditorMounted] = useState(false);

  const handlePlaceholder = (updatedText: string) => {
    if (placeholder === "" || !editorRef.current) return;

    // Create placeholder widget if it doesn't exist
    if (placeholderRef.current === null) {
      placeholderRef.current = new PlaceholderWidget(editorRef.current, placeholder);
    }

    // Show placeholder only if editor is empty
    if (updatedText.length > 0) {
      editorRef.current.removeContentWidget(placeholderRef.current);
    } else {
      editorRef.current.addContentWidget(placeholderRef.current);
    }
  };

  // エディタの初期化を一度だけ行う
  useEffect(() => {
    // 既にエディタが作成されている場合は何もしない
    if (editorRef.current) return;

    if (editorContainerRef.current) {
      // Set up themes
      monaco.editor.defineTheme(EPHE_LIGHT_THEME.name, EPHE_LIGHT_THEME.theme);
      monaco.editor.defineTheme(EPHE_DARK_THEME.name, EPHE_DARK_THEME.theme);

      // Set active theme
      const themeName = isDarkMode ? EPHE_DARK_THEME.name : EPHE_LIGHT_THEME.name;
      monaco.editor.setTheme(themeName);

      // Create editor (once)
      editorRef.current = monaco.editor.create(editorContainerRef.current, {
        ...editorOptions,
        automaticLayout: true,
      });

      // Initialize markdown extension
      const mdExt = new MonacoMarkdownExtension();
      mdExt.activate(editorRef.current);

      // Set up content change handler for placeholder management
      editorRef.current.onDidChangeModelContent(() => {
        if (editorRef.current) {
          handlePlaceholder(editorRef.current.getValue());
        }
      });

      // Show placeholder immediately on mount if editor is empty
      handlePlaceholder(editorRef.current.getValue());
      setIsEditorMounted(true);
    }

    // Cleanup on component unmount only
    return () => {
      if (editorRef.current) {
        console.log("Disposing Monaco Editor instance.");
        if (placeholderRef.current) {
          try {
            editorRef.current.removeContentWidget(placeholderRef.current);
          } catch (e) {
            // Widget might already be removed
          }
        }
        editorRef.current.dispose();
        editorRef.current = null;
      }
    };
    // 空の依存配列でエディタは一度だけ初期化される
  }, []);

  // Update theme when it changes (without recreating the editor)
  useEffect(() => {
    if (isEditorMounted && editorRef.current) {
      const themeName = isDarkMode ? EPHE_DARK_THEME.name : EPHE_LIGHT_THEME.name;
      monaco.editor.setTheme(themeName);
    }
  }, [isDarkMode, isEditorMounted]);

  return <div ref={editorContainerRef} className="h-full" />;
};
