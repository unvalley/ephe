import { useAtom } from "jotai";
import { activeDocumentIndexAtom, documentsAtom } from "../../../utils/atoms/multi-document";
import { CodeMirrorEditor } from "../codemirror/codemirror-editor";
import { useRef, useEffect, useImperativeHandle, useCallback } from "react";
import { DocumentNavigation } from "./document-navigation";
import { MultiDocumentProvider } from "./multi-context";
import type { SingleEditorRef, MultiEditorRef } from "../editor-ref";
import { AnimatePresence, m } from "motion/react";

type MultiDocumentEditorProps = {
  ref?: React.Ref<MultiEditorRef>;
  transitionsEnabled?: boolean;
};

export const MultiDocumentEditor = ({ ref, transitionsEnabled = true }: MultiDocumentEditorProps) => {
  const [activeIndex, setActiveIndex] = useAtom(activeDocumentIndexAtom);
  const [documents, setDocuments] = useAtom(documentsAtom);
  const editorRef = useRef<SingleEditorRef | null>(null);

  // Save document content immediately when user types
  const saveDocument = useCallback(
    (content: string) => {
      setDocuments((prev) => {
        const updated = [...prev];
        updated[activeIndex] = {
          ...updated[activeIndex],
          content,
          lastModified: Date.now(),
        };
        return updated;
      });
    },
    [activeIndex, setDocuments],
  );

  const navigateToDocument = useCallback(
    (newIndex: number) => {
      if (newIndex < 0 || newIndex >= documents.length || newIndex === activeIndex) return;

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
    },
    [activeIndex, documents.length, setDocuments],
  );

  useImperativeHandle(
    ref,
    () => ({
      get view() {
        return editorRef.current?.view || null;
      },
      getCurrentContent: () => {
        return editorRef.current?.getCurrentContent() ?? documents[activeIndex]?.content ?? "";
      },
      setContent: (content: string) => {
        // Update document in state
        setDocuments((prev) => {
          const updated = [...prev];
          updated[activeIndex] = {
            ...updated[activeIndex],
            content,
            lastModified: Date.now(),
          };
          return updated;
        });

        // Update editor view
        editorRef.current?.setContent(content);
      },
      navigateToDocument,
    }),
    [navigateToDocument, documents, activeIndex, setDocuments],
  );

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
      <AnimatePresence mode={transitionsEnabled ? "wait" : "sync"}>
        <m.div
          key={documents[activeIndex].id}
          className="h-full w-full"
          initial={transitionsEnabled ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          exit={transitionsEnabled ? { opacity: 0 } : undefined}
          transition={{ duration: transitionsEnabled ? 0.3 : 0, ease: "easeInOut" }}
        >
          <CodeMirrorEditor
            ref={editorRef}
            initialContent={documents[activeIndex].content}
            documentId={documents[activeIndex].id}
            onChange={saveDocument}
          />
        </m.div>
      </AnimatePresence>

      <MultiDocumentProvider navigateToDocument={navigateToDocument}>
        <DocumentNavigation />
      </MultiDocumentProvider>
    </div>
  );
};
