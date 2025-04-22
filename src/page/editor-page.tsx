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

const useCommandK = () => {
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);

  const toggleCommandMenu = useCallback(() => {
    setIsCommandMenuOpen((prev) => !prev);
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

  return { isCommandMenuOpen, toggleCommandMenu };
};

export const EditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { shouldShowAlert, dismissAlert } = useTabDetection();
  const { isCommandMenuOpen, toggleCommandMenu } = useCommandK();

  return (
    <div className={`flex h-screen flex-col overflow-hidden antialiased ${paperModeClass}`}>
      <div className="relative flex flex-1 overflow-hidden">
        <div className="z-0 flex-1">
          <CodeMirrorEditor />
        </div>
      </div>

      <Footer
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

      {isCommandMenuOpen && <CommandMenu open={isCommandMenuOpen} onClose={toggleCommandMenu} />}
      {shouldShowAlert && <AlreadyOpenDialog shouldShowAlert={shouldShowAlert} onContinue={dismissAlert} />}
    </div>
  );
};
