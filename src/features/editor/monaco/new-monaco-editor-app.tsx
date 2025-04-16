import { useRef, useEffect, useState, useCallback, useLayoutEffect } from "react";
import * as monaco from "monaco-editor";
import { editorOptions, EPHE_DARK_THEME, EPHE_LIGHT_THEME } from "./editor-utils";
import { PlaceholderWidget } from "./placeholder-widget";
import { getRandomQuote } from "../quotes";
import { useTheme } from "../../../utils/hooks/use-theme";
import { MonacoMarkdownExtension } from "./monaco-markdown";
import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../../../utils/constants";
import { useAtom } from "jotai";
import { saveSnapshot } from "../../snapshots/snapshot-storage";
import { showToast } from "../../../utils/components/toast";
import { DprintMarkdownFormatter } from "../markdown/formatter/dprint-markdown-formatter";

type MonacoEditorProps = {
  commandMenuOpen: boolean;
  setCommandMenuOpen: (open: boolean) => void;
};

const editorAtom = atomWithStorage<string>(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, "");

export const NewMonacoEditor = (_props: MonacoEditorProps) => {
  const editorContainerRef = useRef<HTMLDivElement | null>(null);
  const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
  const [editorContent, setEditorContent] = useAtom(editorAtom);
  const formatterRef = useRef<DprintMarkdownFormatter | null>(null);

  const placeholderRef = useRef<PlaceholderWidget | null>(null);
  const [placeholder] = useState<string>(getRandomQuote());
  const { isDarkMode } = useTheme();
  const [isEditorMounted, setIsEditorMounted] = useState(false);

  // Initialize markdown formatter
  useEffect(() => {
    const initMarkdownFormatter = async () => {
      try {
        const formatter = await DprintMarkdownFormatter.getInstance();
        formatterRef.current = formatter;
      } catch (error) {
        console.error("Failed to initialize markdown formatter:", error);
      }
    };
    initMarkdownFormatter();

    return () => {
      formatterRef.current = null;
    };
  }, []);

  const handlePlaceholder = useCallback((updatedText: string) => {
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
  }, [placeholder]);

  // Save editor content and optionally format it
  const saveEditorContent = useCallback(async () => {
    if (!editorRef.current) return;
    
    let content = editorRef.current.getValue();
    
    // Format content if formatter is available
    if (formatterRef.current) {
      try {
        // Save current cursor position and selection before formatting
        const selection = editorRef.current.getSelection();
        const scrollTop = editorRef.current.getScrollTop();
        
        const formatted = await formatterRef.current.formatMarkdown(content);
        if (formatted !== content) {
          editorRef.current.setValue(formatted);
          content = formatted;
          
          // Restore cursor position and selection after formatting
          if (selection) {
            editorRef.current.setSelection(selection);
            editorRef.current.setScrollTop(scrollTop);
          }
        }
      } catch (error) {
        showToast("Failed to format content", "error");
      }
    }
    
    // Save content to state and create snapshot
    setEditorContent(content);
    saveSnapshot({
      content,
      charCount: content.length,
      title: "Manual Save",
      description: "",
    });
    
    showToast("Content saved", "success");
  }, [setEditorContent]);

  // エディタの初期化を一度だけ行う
  useLayoutEffect(() => {
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
      editorRef.current.setValue(editorContent);

      // Initialize markdown extension
      const mdExt = new MonacoMarkdownExtension();
      mdExt.activate(editorRef.current);

      // Set up content change handler for placeholder management
      editorRef.current.onDidChangeModelContent(() => {
        if (editorRef.current) {
          handlePlaceholder(editorRef.current.getValue());
        }
      });
      
      // Add command for Cmd+S / Ctrl+S to save content
      editorRef.current.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, async () => {
        await saveEditorContent();
      });

      // Show placeholder immediately on mount if editor is empty
      handlePlaceholder(editorRef.current.getValue());
      setIsEditorMounted(true);

      editorRef.current.focus()
    }

    // Cleanup on component unmount only
    return () => {
      if (editorRef.current) {
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
  }, [
    // Show placeholder immediately on mount if editor is empty
    handlePlaceholder,
    saveEditorContent
  ]);

  // Add global keyboard shortcut for saving
  useEffect(() => {
    const handleKeyboardShortcuts = (e: KeyboardEvent) => {
      // Cmd/Ctrl + S to save content
      if ((e.metaKey || e.ctrlKey) && !e.shiftKey && e.key === "s") {
        e.preventDefault();
        saveEditorContent();
      }
    };

    window.addEventListener("keydown", handleKeyboardShortcuts);
    return () => {
      window.removeEventListener("keydown", handleKeyboardShortcuts);
    };
  }, [saveEditorContent]);

  // Update theme when it changes (without recreating the editor)
  useEffect(() => {
    if (isEditorMounted && editorRef.current) {
      const themeName = isDarkMode ? EPHE_DARK_THEME.name : EPHE_LIGHT_THEME.name;
      // TODO: set theme
    }
  }, [isDarkMode, isEditorMounted]);

  return <div ref={editorContainerRef} className="h-full max-w-3xl" />;
};
