import "../globals.css";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { Footer, FooterButton } from "../utils/components/footer";
import { CommandMenu } from "../features/menu/command-menu";
import { CodeMirrorEditor } from "../features/editor/codemirror/codemirror-editor";
import { SystemMenu } from "../features/menu/system-menu";
import { HoursDisplay } from "../features/time-display/hours-display";
import { Link } from "react-router-dom";
import { EPHE_VERSION } from "../utils/constants";
import { useCommandK } from "../utils/hooks/use-command-k";

export const EditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { isCommandMenuOpen, toggleCommandMenu } = useCommandK();

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

      {isCommandMenuOpen && <CommandMenu open={isCommandMenuOpen} onClose={toggleCommandMenu} />}
    </div>
  );
};
