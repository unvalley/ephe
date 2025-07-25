import "../globals.css";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { Footer, FooterButton } from "../utils/components/footer";
import { CommandMenu } from "../features/menu/command-menu";
import { MultiDocumentEditor, type MultiDocumentEditorRef } from "../features/multi-document/multi-document-editor";
import { DocumentDock } from "../features/multi-document/document-dock";
import { SystemMenu } from "../features/menu/system-menu";
import { HoursDisplay } from "../features/time-display/hours-display";
import { Link } from "react-router-dom";
import { EPHE_VERSION } from "../utils/constants";
import { useCommandK } from "../utils/hooks/use-command-k";
import { useRef, useState } from "react";
import { useAtom } from "jotai";
import { HistoryModal } from "../features/history/history-modal";
import { editorContentAtom } from "../utils/atoms/editor";

export const EditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const [historyModalOpen, setHistoryModalOpen] = useState(false);
  const [historyModalTabIndex, setHistoryModalTabIndex] = useState(0);
  // Track any modal being open
  const isAnyModalOpen = historyModalOpen;
  const { isCommandMenuOpen, closeCommandMenu } = useCommandK(isAnyModalOpen);
  const editorRef = useRef<MultiDocumentEditorRef>(null);
  const [editorContent] = useAtom(editorContentAtom);

  const handleCommandMenuClose = () => {
    closeCommandMenu();
    // Return focus to editor after closing
    // Use requestAnimationFrame to ensure the menu is fully closed before focusing
    requestAnimationFrame(() => {
      if (editorRef.current?.currentView) {
        editorRef.current.currentView.focus();
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
          <MultiDocumentEditor ref={editorRef} />
        </div>
      </div>

      <Footer
        autoHide={true}
        leftContent={<SystemMenu onOpenHistoryModal={openHistoryModal} />}
        centerContent={
          <DocumentDock 
            onNavigate={(index) => editorRef.current?.navigateToDocument(index)}
          />
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
        editorContent={editorContent}
        editorView={editorRef.current?.currentView ?? null}
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
