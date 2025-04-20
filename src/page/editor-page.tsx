import "../globals.css";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { Footer, FooterButton } from "../utils/components/footer";
import { useEffect, useCallback, useState } from "react";
import { useTabDetection } from "../features/editor/use-tab-detection";
import { AlreadyOpenDialog } from "../utils/components/already-open-dialog";
import { CommandMenu } from "../features/command/command-k";
import { CodeMirrorEditor } from "../features/editor/codemirror/codemirror-editor";
import { SystemMenu } from "../features/system/system-menu";
import { HoursDisplay } from "../features/time-display/hours-display";
import { Link } from "react-router-dom";
import { EPHE_VERSION } from "../utils/constants";
import { HistoryModal } from "../features/history/history-modal";
import { HistoryIcon } from "../utils/components/icons";

const TaskSnapshotButton = ({ onClick }: { onClick: () => void }) => (
  <FooterButton onClick={onClick}>
    <div aria-label="Open tasks and snapshots" className="flex items-center">
      <HistoryIcon />
    </div>
  </FooterButton>
);

export const CodeMirrorEditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { shouldShowAlert, dismissAlert } = useTabDetection();
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const [isTaskSnapshotModalOpen, setIsTaskSnapshotModalOpen] = useState(false);

  // Use useCallback to memoize the function reference
  const toggleCommandMenu = useCallback(() => {
    setIsCommandMenuOpen((prev) => !prev);
  }, []);

  const openTaskSnapshotModal = useCallback(() => {
    setIsTaskSnapshotModalOpen(true);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "k" && (event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        toggleCommandMenu();
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [toggleCommandMenu]);

  return (
    <div className={`flex h-screen flex-col overflow-hidden antialiased ${paperModeClass}`}>
      <div className="relative flex flex-1 overflow-hidden">
        <div className="z-0 flex-1">
          <CodeMirrorEditor />
        </div>
      </div>

      <div className="w-full">
        <Footer
          leftContent={<SystemMenu />}
          rightContent={
            <>
              <TaskSnapshotButton onClick={openTaskSnapshotModal} />
              <HoursDisplay />
              <FooterButton>
                <Link to="/landing">Ephe v{EPHE_VERSION}</Link>
              </FooterButton>
            </>
          }
        />
      </div>

      {isCommandMenuOpen && <CommandMenu open={isCommandMenuOpen} onClose={toggleCommandMenu} />}
      {shouldShowAlert && <AlreadyOpenDialog shouldShowAlert={shouldShowAlert} onContinue={dismissAlert} />}
      <HistoryModal isOpen={isTaskSnapshotModalOpen} onClose={() => setIsTaskSnapshotModalOpen(false)} />
    </div>
  );
};
