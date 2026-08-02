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
import { useCallback, useRef, useState, useEffect } from "react";
import { useAtom } from "jotai";
import { HistoryModal } from "../features/history/history-modal";
import { editorContentAtom } from "../utils/atoms/editor";
import { useMobileDetector } from "../utils/hooks/use-mobile-detector";
import { useDocumentPictureInPicture } from "../features/picture-in-picture/use-document-picture-in-picture";
import { PictureInPictureButton } from "../features/picture-in-picture/picture-in-picture-button";
import { PictureInPictureIcon } from "@phosphor-icons/react";

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
  const editorSurfaceRef = useRef<HTMLDivElement>(null);
  const [editorContent] = useAtom(editorContentAtom);
  const { isMobile } = useMobileDetector();

  const getEditorView = useCallback(
    () => (editorMode === "multi" ? multiEditorRef.current?.view : singleEditorRef.current?.view) ?? null,
    [editorMode],
  );

  const { closePictureInPicture, isPictureInPicture, isPictureInPictureSupported, openPictureInPicture } =
    useDocumentPictureInPicture({
      editorSlotRef,
      editorSurfaceRef,
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
          <div ref={editorSurfaceRef} className="z-0 flex-1">
            {editorMode === "multi" ? (
              <MultiDocumentEditor ref={multiEditorRef} />
            ) : (
              <CodeMirrorEditor ref={singleEditorRef} />
            )}
          </div>
          {isPictureInPicture ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-4 text-neutral-500 dark:text-neutral-400">
              <PictureInPictureIcon className="size-8" weight="regular" />
              <p className="text-sm">Editing in Picture-in-Picture</p>
              <button
                type="button"
                className="rounded-md px-3 py-2 text-neutral-700 text-sm transition-colors hover:bg-black/5 focus:outline-none focus-visible:ring-2 focus-visible:ring-neutral-300 dark:text-neutral-200 dark:focus-visible:ring-neutral-600 dark:hover:bg-white/10"
                onClick={closePictureInPicture}
              >
                Return editor
              </button>
            </div>
          ) : null}
        </div>

        <Footer
          autoHide={true}
          leftContent={<SystemMenu onOpenHistoryModal={openHistoryModal} onRestoreEditorFocus={restoreEditorFocus} />}
          centerContent={
            isMobile || editorMode === "single" ? null : (
              <DocumentDock onNavigate={(index) => multiEditorRef.current?.navigateToDocument(index)} />
            )
          }
          rightContent={
            <>
              <HoursDisplay />
              {isPictureInPictureSupported ? (
                <PictureInPictureButton
                  isActive={isPictureInPicture}
                  onClick={isPictureInPicture ? closePictureInPicture : openPictureInPicture}
                />
              ) : null}
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
