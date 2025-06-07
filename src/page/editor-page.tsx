import "../globals.css";
import { useState } from "react";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { Footer, FooterButton } from "../utils/components/footer";
import { CommandMenu } from "../features/menu/command-menu";
import { SystemMenu } from "../features/menu/system-menu";
import { CodeMirrorEditor } from "../features/editor/codemirror/codemirror-editor";
import { HoursDisplay } from "../features/time-display/hours-display";
import { Link } from "react-router-dom";
import { EPHE_VERSION } from "../utils/constants";
import { useCommandK } from "../utils/hooks/use-command-k";
import { HistoryModal } from "../features/history/history-modal";

export const EditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { isCommandMenuOpen, toggleCommandMenu } = useCommandK();
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
  const [historyModalInitialTab, setHistoryModalInitialTab] = useState(0);

  const openSettingsTab = () => {
    setHistoryModalInitialTab(2); // Settings is the third tab (index 2)
    setIsHistoryModalOpen(true);
  };

  return (
    <div className={`flex h-screen flex-col overflow-hidden antialiased ${paperModeClass}`}>
      <div className="relative flex flex-1 overflow-hidden">
        <div className="z-0 flex-1">
          <CodeMirrorEditor />
        </div>
      </div>

      <Footer
        autoHide={true}
        leftContent={<SystemMenu />}
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
        open={isCommandMenuOpen} 
        onClose={toggleCommandMenu}
        openSettings={openSettingsTab}
      />
      <HistoryModal
        isOpen={isHistoryModalOpen}
        onClose={() => setIsHistoryModalOpen(false)}
        initialTabIndex={historyModalInitialTab}
      />
    </div>
  );
};
