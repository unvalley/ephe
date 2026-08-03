import "../globals.css";
import { LazyMotion, domAnimation } from "motion/react";
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
import { useCallback, useRef, useState, useEffect, useLayoutEffect } from "react";
import { createPortal } from "react-dom";
import { useAtom } from "jotai";
import { HistoryModal } from "../features/history/history-modal";
import { editorContentAtom } from "../utils/atoms/editor";
import { useMobileDetector } from "../utils/hooks/use-mobile-detector";
import { useDocumentPictureInPicture } from "../features/picture-in-picture/use-document-picture-in-picture";

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
  const editorSlotRef = useRef<HTMLDivElement>(null);
  const [editorSurface] = useState(() => {
    const surface = document.createElement("div");
    surface.className = "z-0 h-full min-h-0 w-full flex-1";
    return surface;
  });
  const [editorContent] = useAtom(editorContentAtom);
  const { isMobile } = useMobileDetector();

  useLayoutEffect(() => {
    const editorSlot = editorSlotRef.current;
    if (editorSlot && editorSurface.parentElement !== editorSlot) {
      editorSlot.prepend(editorSurface);
    }
  }, [editorSurface]);

  const getEditorView = useCallback(
    () => (editorMode === "multi" ? multiEditorRef.current?.view : singleEditorRef.current?.view) ?? null,
    [editorMode],
  );

  const { closePictureInPicture, isPictureInPicture, isPictureInPictureSupported, openPictureInPicture } =
    useDocumentPictureInPicture({
      editorSlotRef,
      editorSurface,
      getEditorView,
      paperModeClass,
    });

  const restoreEditorFocus = useCallback(() => {
    getEditorView()?.focus();
  }, [getEditorView]);

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
      restoreEditorFocus();
    });
  };

  const openHistoryModal = (tabIndex: number) => {
    setHistoryModalTabIndex(tabIndex);
    setHistoryModalOpen(true);
  };

  return (
    <LazyMotion features={domAnimation} strict>
      <div className={`flex h-screen flex-col overflow-hidden antialiased ${paperModeClass}`}>
        <div ref={editorSlotRef} className="relative flex flex-1 overflow-hidden">
          {createPortal(
            editorMode === "multi" ? (
              <MultiDocumentEditor ref={multiEditorRef} transitionsEnabled={!isPictureInPicture} />
            ) : (
              <CodeMirrorEditor ref={singleEditorRef} />
            ),
            editorSurface,
          )}
        </div>

        <Footer
          autoHide={true}
          leftContent={
            <div className="flex items-center gap-1">
              <SystemMenu onOpenHistoryModal={openHistoryModal} onRestoreEditorFocus={restoreEditorFocus} />
              {isPictureInPictureSupported ? (
                <FooterButton
                  aria-pressed={isPictureInPicture}
                  onClick={isPictureInPicture ? closePictureInPicture : openPictureInPicture}
                >
                  {isPictureInPicture ? "Floating" : "Float"}
                </FooterButton>
              ) : null}
            </div>
          }
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
    </LazyMotion>
  );
};
