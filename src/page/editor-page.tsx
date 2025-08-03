import "../globals.css";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { Footer, FooterButton } from "../utils/components/footer";
import { CommandMenu } from "../features/menu/command-menu";
import { MultiDocumentEditor } from "../features/editor/multi/multi-editor";
import { CodeMirrorEditor } from "../features/editor/codemirror/codemirror-editor";
import type { MultiEditorRef, SingleEditorRef } from "../features/editor/editor-ref";
import { DocumentDock } from "../features/editor/multi/dock-menu";
import { SystemMenu } from "../features/menu/system-menu";
import { HoursDisplay } from "../features/time-display/hours-display";
import { Link } from "react-router-dom";
import { EPHE_VERSION } from "../utils/constants";
import { useCommandK } from "../utils/hooks/use-command-k";
import { useEditorMode } from "../utils/hooks/use-editor-mode";
import { useRef, useState, useEffect } from "react";
import { useAtom } from "jotai";
import { HistoryModal } from "../features/history/history-modal";
import { editorContentAtom } from "../utils/atoms/editor";
import { useMobileDetector } from "../utils/hooks/use-mobile-detector";

export const EditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { editorMode } = useEditorMode();
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalTabIndex, setHistoryModalTabIndex] = useState(0);
  // Track any modal being open
  const isAnyModalOpen = historyModalOpen;
  const { isCommandMenuOpen, closeCommandMenu } = useCommandK(isAnyModalOpen);
  const multiEditorRef = useRef<MultiEditorRef>(null);
  const singleEditorRef = useRef<SingleEditorRef>(null);
  const [editorContent] = useAtom(editorContentAtom);
  const { isMobile } = useMobileDetector();

  // Unified snapshot restore event handler
  useEffect(() => {
    const handleContentRestored = (event: CustomEvent<{ content: string }>) => {
      const customEvent = event;
      const restoredContent = customEvent.detail.content;
      // Route to appropriate editor based on mode
      if (editorMode === "multi" && multiEditorRef.current) {
        multiEditorRef.current.setContent(restoredContent);
      } else if (editorMode === "single" && singleEditorRef.current) {
        singleEditorRef.current.setContent(restoredContent);
      }
    };
    window.addEventListener("ephe:content-restored", handleContentRestored as EventListener);
    return () => {
      window.removeEventListener("ephe:content-restored", handleContentRestored as EventListener);
    };
  }, [editorMode]);

  const handleCommandMenuClose = () => {
    closeCommandMenu();
    // Return focus to editor after closing
    // Use requestAnimationFrame to ensure the menu is fully closed before focusing
    requestAnimationFrame(() => {
      if (editorMode === "multi" && multiEditorRef.current?.view) {
        multiEditorRef.current.view.focus();
      } else if (editorMode === "single" && singleEditorRef.current?.view) {
        singleEditorRef.current.view.focus();
      }
    });
  };

  const openHistoryModal = (tabIndex: number) => {
    setHistoryModalTabIndex(tabIndex);
    setHistoryModalOpen(true);
  };

  return (
    <div className={`flex h-screen flex-col overflow-hidden antialiased ${paperModeClass}`}>
      <div className="relative flex flex-1 overflow-hidden">
        <div className="z-0 flex-1">
          {editorMode === "multi" ? (
            <MultiDocumentEditor ref={multiEditorRef} />
          ) : (
            <CodeMirrorEditor ref={singleEditorRef} />
          )}
        </div>
      </div>

      <Footer
        autoHide={true}
        leftContent={<SystemMenu onOpenHistoryModal={openHistoryModal} />}
        centerContent={
          isMobile || editorMode === "single" ? null : (
            <DocumentDock onNavigate={(index) => multiEditorRef.current?.navigateToDocument(index)} />
          )
        }
        rightContent={
          <>
            <HoursDisplay />
            <FooterButton>
              <Link to="/landing">Ephe v{EPHE_VERSION}</Link>
            </FooterButton>
          </>
        }
      />
      <CommandMenu
        aria-modal="true"
        open={isCommandMenuOpen}
        onClose={handleCommandMenuClose}
        editorContent={
          editorMode === "multi"
            ? (multiEditorRef.current?.getCurrentContent() ?? "")
            : (singleEditorRef.current?.getCurrentContent() ?? editorContent)
        }
        editorView={
          editorMode === "multi" ? (multiEditorRef.current?.view ?? null) : (singleEditorRef.current?.view ?? null)
        }
        onOpenHistoryModal={openHistoryModal}
      />

      <HistoryModal
        isOpen={historyModalOpen}
        onClose={() => setHistoryModalOpen(false)}
        initialTabIndex={historyModalTabIndex}
      />
    </div>
  );
};
