import { defaultKeymap, historyKeymap, history } from "@codemirror/commands";
import { markdown, markdownLanguage } from "@codemirror/lang-markdown";
import { languages } from "@codemirror/language-data";
import { Compartment, EditorState, Prec } from "@codemirror/state";
import { EditorView, keymap, placeholder } from "@codemirror/view";
import { useAtom, useAtomValue } from "jotai";
import { useRef, useEffect, useLayoutEffect, useState } from "react";
import { showToast } from "../../../utils/components/toast";
import { useEditorWidth } from "../../../utils/hooks/use-editor-width";
import { useTheme } from "../../../utils/hooks/use-theme";
import { formatEditorView, useMarkdownFormatter } from "../markdown/formatter/format-editor";
import { getRandomQuote } from "../quotes";
import { taskStorage } from "../tasks/task-storage";
import { createDefaultTaskHandler, createChecklistPlugin } from "./tasklist";
import { registerTaskHandler } from "./tasklist/task-close";
import { saveSnapshotWithToast } from "../../snapshots/snapshot-storage";
import { useEditorTheme } from "./use-editor-theme";
import { useTaskAutoFlush } from "../../../utils/hooks/use-task-auto-flush";
import { useMobileDetector } from "../../../utils/hooks/use-mobile-detector";
import { urlClickPlugin, urlHoverTooltip } from "./url-click";
import { useDebouncedCallback } from "use-debounce";
import { editorContentAtom } from "../../../utils/atoms/editor";
import { currentFontValueAtom } from "../../../utils/hooks/use-font";
import { cursorColorAtom, resolveCursorColor } from "../../../utils/hooks/use-cursor-color";
import { customCursorLayer } from "./cursor-layer";
import { useFocusMode } from "../../../utils/hooks/use-focus-mode";
import { focusModeExtension } from "./focus-mode";
import { usePaperMode } from "../../../utils/hooks/use-paper-mode";

const useTaskHandler = () => {
  const { taskAutoFlushMode } = useTaskAutoFlush();
  const handlerRef = useRef(createDefaultTaskHandler(taskStorage, taskAutoFlushMode));
  useEffect(() => {
    handlerRef.current = createDefaultTaskHandler(taskStorage, taskAutoFlushMode);
    registerTaskHandler(handlerRef.current);
    return () => registerTaskHandler(undefined);
  }, [taskAutoFlushMode]);
  return handlerRef;
};

export const useMarkdownEditor = (
  initialContent?: string,
  documentId?: string,
  onChange?: (content: string) => void,
) => {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const viewRef = useRef<EditorView | null>(null);
  // Use initial content if provided, otherwise fall back to editorContentAtom for backwards compatibility
  const [globalContent, setGlobalContent] = useAtom(editorContentAtom);
  const [localContent, setLocalContent] = useState(initialContent ?? globalContent);
  const content = documentId ? localContent : globalContent;
  const setContent = documentId ? setLocalContent : setGlobalContent;

  // Update local content when initialContent changes (when switching documents)
  useEffect(() => {
    if (documentId && initialContent !== undefined) {
      setLocalContent(initialContent);
    }
  }, [initialContent, documentId]);

  const formatterRef = useMarkdownFormatter();
  const taskHandlerRef = useTaskHandler();

  const { isDarkMode } = useTheme();
  const { isWideMode } = useEditorWidth();
  const currentFontValue = useAtomValue(currentFontValueAtom);
  const cursorColor = resolveCursorColor(useAtomValue(cursorColorAtom));
  const { paperMode } = usePaperMode();

  const { editorTheme, editorHighlightStyle } = useEditorTheme(
    isDarkMode,
    isWideMode,
    currentFontValue,
    cursorColor,
    paperMode,
  );
  const { isMobile } = useMobileDetector();

  const { isFocusMode } = useFocusMode();

  const themeCompartment = useRef(new Compartment()).current;
  const highlightCompartment = useRef(new Compartment()).current;
  const focusModeCompartment = useRef(new Compartment()).current;

  // Tracks the last value the editor itself pushed into `content`. When the
  // sync effect below sees `content` equal this ref, it knows the value is its
  // own debounced echo (possibly already stale because the user kept typing)
  // and must not roll the editor back.
  const lastWroteFromEditorRef = useRef<string | null>(null);

  const debouncedSetContent = useDebouncedCallback((newContent: string) => {
    lastWroteFromEditorRef.current = newContent;
    // Only update if content actually changed to prevent unnecessary updates
    setContent((prevContent) => (prevContent !== newContent ? newContent : prevContent));
    // Call onChange callback if provided (for multi-editor)
    onChange?.(newContent);
  }, 300);

  useEffect(() => {
    return () => {
      debouncedSetContent.cancel();
    };
  }, [debouncedSetContent]);

  const onFormat = async () => {
    const view = viewRef.current;
    if (!view) return false;
    if (!formatterRef.current) {
      showToast("Formatter not initialized yet", "error");
      return false;
    }
    try {
      const formattedText = await formatEditorView(view, formatterRef.current);
      if (formattedText !== null) {
        // Persist formatted content to state/storage and notify listeners
        lastWroteFromEditorRef.current = formattedText;
        setContent((prevContent) => (prevContent !== formattedText ? formattedText : prevContent));
        onChange?.(formattedText);
      }
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : "unknown";
      showToast(`Error formatting document: ${message}`, "error");
      return false;
    }
  };

  const onSaveSnapshot = async () => {
    const view = viewRef.current;
    if (!view) return false;
    return saveSnapshotWithToast(view.state.doc.toString());
  };

  useLayoutEffect(() => {
    if (!editorRef.current || viewRef.current) return;

    const state = EditorState.create({
      doc: content,
      extensions: [
        keymap.of(defaultKeymap),
        history({ minDepth: 50, newGroupDelay: 250 }),
        keymap.of(historyKeymap),

        // Task key bindings with high priority BEFORE markdown extension
        Prec.high(createChecklistPlugin(taskHandlerRef.current)),

        markdown({
          base: markdownLanguage,
          codeLanguages: languages,
          addKeymap: true,
        }),

        EditorView.lineWrapping,
        customCursorLayer,
        EditorView.updateListener.of((update) => {
          if (update.docChanged) {
            // Skip updates from programmatic changes (formatting, restore, etc.)
            // Only update for user input
            const isUserInput = update.transactions.some((tr) => tr.isUserEvent("input") || tr.isUserEvent("delete"));
            if (isUserInput) {
              const updatedContent = update.state.doc.toString();
              debouncedSetContent(updatedContent);
            }
          }
        }),

        themeCompartment.of(editorTheme),
        highlightCompartment.of(editorHighlightStyle),
        focusModeCompartment.of(isFocusMode ? focusModeExtension : []),
        // Only show placeholder on non-mobile devices
        ...(isMobile ? [] : [placeholder(getRandomQuote())]),

        keymap.of([
          {
            key: "Mod-s",
            run: () => {
              void onFormat();
              return true;
            },
            preventDefault: true,
          },
          {
            key: "Mod-Shift-s",
            run: () => {
              void onSaveSnapshot();
              return true;
            },
            preventDefault: true,
          },
        ]),
        urlClickPlugin,
        urlHoverTooltip,
      ],
    });
    viewRef.current = new EditorView({ state, parent: editorRef.current });
    viewRef.current.focus();

    return () => {
      viewRef.current?.destroy();
      viewRef.current = null;
    };
  }, [documentId]); // Re-initialize when documentId changes

  // Update theme when dark mode changes
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: [themeCompartment.reconfigure(editorTheme), highlightCompartment.reconfigure(editorHighlightStyle)],
    });
  }, [highlightCompartment.reconfigure, themeCompartment.reconfigure, editorTheme, editorHighlightStyle]);

  // Toggle focus mode (paragraph dimming)
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;
    view.dispatch({
      effects: focusModeCompartment.reconfigure(isFocusMode ? focusModeExtension : []),
    });
  }, [focusModeCompartment.reconfigure, isFocusMode]);

  // Listen for external content updates
  // - text edit emits storage event
  // - subscribe updates the editor content
  useEffect(() => {
    const view = viewRef.current;
    if (!view) return;

    // Get the current document content
    const currentDocContent = view.state.doc.toString();

    // Skip if content is exactly the same as current editor content
    // This prevents cyclic updates when our own changes come back through the state
    if (content === currentDocContent) {
      return;
    }

    // Skip if `content` is just our own debounced write echoing back. The
    // editor may already hold newer characters typed during the React render
    // cycle; rolling back to the older atom value would drop them and cause
    // visible flicker / cursor jumps during long typing sessions.
    if (content === lastWroteFromEditorRef.current) {
      return;
    }

    // Update the editor with the new content while preserving cursor position
    const currentSelection = view.state.selection.main;
    const currentAnchor = currentSelection.anchor;
    const currentHead = currentSelection.head;

    view.dispatch({
      changes: { from: 0, to: view.state.doc.length, insert: content },
      selection: {
        anchor: Math.min(currentAnchor, content.length),
        head: Math.min(currentHead, content.length),
      },
    });
    // The editor now shows external content, so nothing it wrote or was about
    // to write is still in flight. A pending save would put the replaced text
    // back into storage, and a later external change equal to the last own
    // write would be mistaken for the echo above and never reach the editor.
    debouncedSetContent.cancel();
    lastWroteFromEditorRef.current = null;
  }, [content]);

  return {
    editor: editorRef,
    view: viewRef,
    onFormat: viewRef.current ? () => onFormat() : undefined,
    onSaveSnapshot: viewRef.current ? () => onSaveSnapshot() : undefined,
  };
};
