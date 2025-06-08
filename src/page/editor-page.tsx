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
import { useRef, useEffect } from "react";
import { useAtom } from "jotai";
import { atomWithStorage } from "jotai/utils";
import { LOCAL_STORAGE_KEYS } from "../utils/constants";
import { DprintMarkdownFormatter } from "../features/editor/markdown/formatter/dprint-markdown-formatter";
import type { MarkdownFormatter } from "../features/editor/markdown/formatter/markdown-formatter";

const editorAtom = atomWithStorage<string>(LOCAL_STORAGE_KEYS.EDITOR_CONTENT, "");

export const EditorPage = () => {
  const { paperModeClass } = usePaperMode();
  const { isCommandMenuOpen, closeCommandMenu } = useCommandK();
  const editorRef = useRef<CodeMirrorEditorRef>(null);
  const formatterRef = useRef<MarkdownFormatter | null>(null);
  const [editorContent] = useAtom(editorAtom);

  // Initialize formatter
  useEffect(() => {
    let alive = true;
    (async () => {
      const fmt = await DprintMarkdownFormatter.getInstance();
      if (alive) {
        formatterRef.current = fmt;
      }
    })();
    return () => {
      alive = false;
      formatterRef.current = null;
    };
  }, []);

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

  return (
    <div className={`flex h-screen flex-col overflow-hidden antialiased ${paperModeClass}`}>
      <div className="relative flex flex-1 overflow-hidden">
        <div className="z-0 flex-1">
          <CodeMirrorEditor ref={editorRef} />
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
        aria-modal="true" 
        open={isCommandMenuOpen} 
        onClose={handleCommandMenuClose}
        editorContent={editorContent}
        editorView={editorRef.current?.view}
        markdownFormatterRef={formatterRef}
      />
    </div>
  );
};
