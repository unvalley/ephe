import "../globals.css";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { Footer, FooterButton } from "../utils/components/footer";
import { CommandMenu } from "../features/menu/command-menu";
import { CodeMirrorEditor, type CodeMirrorEditorRef } from "../features/editor/codemirror/codemirror-editor";
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
  const editorRef = useRef<CodeMirrorEditorRef>(null);
  const [editorContent] = useAtom(editorContentAtom);

  const handleCommandMenuClose = () => {
    closeCommandMenu();
    // Return focus to editor after closing
    // Use requestAnimationFrame to ensure the menu is fully closed before focusing
    requestAnimationFrame(() => {
      if (editorRef.current?.view) {
        editorRef.current.view.focus();
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
          <CodeMirrorEditor ref={editorRef} />
        </div>
      </div>

      <Footer
        autoHide={true}
        leftContent={<SystemMenu onOpenHistoryModal={openHistoryModal} />}
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
        editorView={editorRef.current?.view ?? null}
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
