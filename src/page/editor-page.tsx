import "../globals.css";
import { usePaperMode } from "../utils/hooks/use-paper-mode";
import { Footer } from "../utils/components/footer";
import { useEffect, useState } from "react";
import { useTabDetection } from "../features/editor/use-tab-detection";
import { AlreadyOpenDialog } from "../utils/components/already-open-dialog";
import { CommandMenu } from "../features/command/command-k";
import { CodeMirrorEditor } from "../features/editor/codemirror/codemirror-editor";

export const CodeMirrorEditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { shouldShowAlert, dismissAlert } = useTabDetection();
  const { isCommandMenuOpen, toggleCommandMenu } = useCommandMenu();

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
    <div className={`flex h-screen flex-col antialiased ${paperModeClass} overflow-hidden`}>
      <div className="flex flex-1 flex-col overflow-hidden">
        <CodeMirrorEditor />
      </div>

      <div className="w-full">
        <Footer />
      </div>

      {isCommandMenuOpen && <CommandMenu open={isCommandMenuOpen} onClose={toggleCommandMenu} />}
      {shouldShowAlert && <AlreadyOpenDialog shouldShowAlert={shouldShowAlert} onContinue={dismissAlert} />}

      {/* <TableOfContents 
      content={"## test"} 
      onItemClick={() => {}} 
      isVisible={true} 
      /> */}
    </div>
  );
};

const useCommandMenu = () => {
  const [isCommandMenuOpen, setIsCommandMenuOpen] = useState(false);
  const toggleCommandMenu = () => setIsCommandMenuOpen((prev) => !prev);
  return { isCommandMenuOpen, toggleCommandMenu };
};
