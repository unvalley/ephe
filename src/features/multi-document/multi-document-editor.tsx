import { useAtom } from "jotai";
import { activeDocumentIndexAtom, documentsAtom } from "../../utils/atoms/editor";
import { CodeMirrorEditor, type CodeMirrorEditorRef } from "../editor/codemirror/codemirror-editor";
import { useRef, useEffect, useState, useImperativeHandle, forwardRef, useCallback } from "react";
import { DocumentNavigation } from "./document-navigation";
import { MultiDocumentProvider } from "./multi-document-context";
import type { EditorView } from "@codemirror/view";

export type MultiDocumentEditorRef = {
  currentView: EditorView | null;
  navigateToDocument: (index: number) => void;
};

export const MultiDocumentEditor = forwardRef<MultiDocumentEditorRef>((_, ref) => {
  const [activeIndex, setActiveIndex] = useAtom(activeDocumentIndexAtom);
  const [documents, setDocuments] = useAtom(documentsAtom);
  const [transitioning, setTransitioning] = useState(false);
  const editorRef = useRef<CodeMirrorEditorRef | null>(null);

  const navigateToDocument = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || newIndex >= documents.length || newIndex === activeIndex) return;

      setTransitioning(true);

      // Save current document content before switching
      const currentEditor = editorRef.current;
      if (currentEditor?.view) {
        const currentContent = currentEditor.view.state.doc.toString();
        setDocuments((prev) => {
          const updated = [...prev];
          updated[activeIndex] = {
            ...updated[activeIndex],
            content: currentContent,
            lastModified: Date.now(),
          };
          return updated;
        });
      }

      setActiveIndex(newIndex);

      // Smooth transition
      setTimeout(() => {
        setTransitioning(false);
      }, 300);
    },
    [activeIndex, documents.length, setDocuments],
  );

  useImperativeHandle(
    ref,
    () => ({
      get currentView() {
        return editorRef.current?.view || null;
      },
      navigateToDocument,
    }),
    [navigateToDocument],
  );

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Cmd/Ctrl + Alt + Left/Right for document navigation
      if ((e.metaKey || e.ctrlKey) && e.altKey) {
        if (e.key === "ArrowLeft" && activeIndex > 0) {
          e.preventDefault();
          navigateToDocument(activeIndex - 1);
        } else if (e.key === "ArrowRight" && activeIndex < documents.length - 1) {
          e.preventDefault();
          navigateToDocument(activeIndex + 1);
        }
      }
      // Cmd/Ctrl + 1-5 for direct document access
      if ((e.metaKey || e.ctrlKey) && e.key >= "1" && e.key <= "5") {
        const docIndex = parseInt(e.key) - 1;
        if (docIndex < documents.length) {
          e.preventDefault();
          navigateToDocument(docIndex);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, documents.length]);

  // Auto-save current document periodically
  useEffect(() => {
    const saveInterval = setInterval(() => {
      const currentEditor = editorRef.current;
      if (currentEditor?.view) {
        const currentContent = currentEditor.view.state.doc.toString();
        setDocuments((prev) => {
          const updated = [...prev];
          if (updated[activeIndex].content !== currentContent) {
            updated[activeIndex] = {
              ...updated[activeIndex],
              content: currentContent,
              lastModified: Date.now(),
            };
            return updated;
          }
          return prev;
        });
      }
    }, 5000); // Save every 5 seconds

    return () => clearInterval(saveInterval);
  }, [activeIndex, setDocuments]);

  // Reset scroll position immediately when document changes
  useEffect(() => {
    const view = editorRef.current?.view;
    if (view) {
      // Force immediate scroll to top
      view.scrollDOM.scrollTop = 0;
      view.scrollDOM.scrollLeft = 0;
      
      // Set cursor to beginning and focus
      view.dispatch({
        selection: { anchor: 0, head: 0 },
      });
      view.focus();
    }
  }, [activeIndex]);

  return (
    <div className="relative h-full w-full overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute inset-0 bg-gradient-to-br from-blue-50/30 via-purple-50/20 to-pink-50/30 dark:from-blue-900/10 dark:via-purple-900/5 dark:to-pink-900/10" />

      <div
        className={`h-full w-full transition-opacity duration-300 ease-out ${
          transitioning ? "opacity-0" : "opacity-100"
        }`}
      >
        <CodeMirrorEditor
          ref={editorRef}
          key={documents[activeIndex].id}
          initialContent={documents[activeIndex].content}
          documentId={documents[activeIndex].id}
        />
      </div>

      <MultiDocumentProvider navigateToDocument={navigateToDocument}>
        <DocumentNavigation />
      </MultiDocumentProvider>
    </div>
  );
});
