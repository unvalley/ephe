import type { EditorView } from "@codemirror/view";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { showToast } from "../../utils/components/toast";
import { getDocumentPictureInPicture, preparePictureInPictureDocument } from "./document-picture-in-picture";
import { PAPER_SURFACE_CLASS } from "../../utils/hooks/use-paper-mode";

const PICTURE_IN_PICTURE_SIZE = {
  width: 420,
  height: 560,
  disallowReturnToOpener: true,
} as const;

type PictureInPictureSession = {
  window: Window;
  root: HTMLElement;
  dispose: () => void;
};

type UseDocumentPictureInPictureOptions = {
  editorSlotRef: RefObject<HTMLDivElement | null>;
  editorSurface: HTMLDivElement;
  getEditorView: () => EditorView | null;
};

export const useDocumentPictureInPicture = ({
  editorSlotRef,
  editorSurface,
  getEditorView,
}: UseDocumentPictureInPictureOptions) => {
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const sessionRef = useRef<PictureInPictureSession | null>(null);
  const isOpeningRef = useRef(false);
  const getEditorViewRef = useRef(getEditorView);

  useEffect(() => {
    getEditorViewRef.current = getEditorView;
  }, [getEditorView]);

  // The paper's grid or dots ride along with the editor's own theme, so only
  // the light/dark class on the root has to be mirrored by hand.
  const syncAppearance = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;

    session.window.document.documentElement.className = document.documentElement.className;
    session.root.className = `h-screen overflow-hidden antialiased ${PAPER_SURFACE_CLASS}`;
  }, []);

  const attachEditorTo = useCallback(
    (container: HTMLElement, root: Document) => {
      if (editorSurface.parentElement !== container) {
        container.append(editorSurface);
      }
      const editorView = getEditorViewRef.current();
      if (editorView) {
        editorView.setRoot(root);
        editorView.requestMeasure();
      }
    },
    [editorSurface],
  );

  const returnEditorToMainWindow = useCallback(() => {
    sessionRef.current?.dispose();
    sessionRef.current = null;

    const editorSlot = editorSlotRef.current;
    if (editorSlot) {
      attachEditorTo(editorSlot, document);
    }

    setIsPictureInPicture(false);
    window.focus();
    requestAnimationFrame(() => {
      getEditorViewRef.current()?.focus();
    });
  }, [attachEditorTo, editorSlotRef]);

  const closePictureInPicture = useCallback(() => {
    const session = sessionRef.current;
    if (!session || session.window.closed) {
      returnEditorToMainWindow();
      return;
    }
    // Closing fires "pagehide", which returns the editor to the main window.
    session.window.close();
  }, [returnEditorToMainWindow]);

  const openPictureInPicture = useCallback(async () => {
    const documentPictureInPicture = getDocumentPictureInPicture();
    if (!documentPictureInPicture || isOpeningRef.current) return;

    if (documentPictureInPicture.window) {
      documentPictureInPicture.window.focus();
      return;
    }

    isOpeningRef.current = true;
    let pictureInPictureWindow: Window | null = null;
    try {
      pictureInPictureWindow = await documentPictureInPicture.requestWindow(PICTURE_IN_PICTURE_SIZE);
      const pictureInPictureRoot = preparePictureInPictureDocument(document, pictureInPictureWindow.document);

      const targetWindow = pictureInPictureWindow;
      const focusEditor = () => {
        targetWindow.requestAnimationFrame(() => {
          getEditorViewRef.current()?.focus();
        });
      };
      targetWindow.addEventListener("focus", focusEditor);

      const themeObserver = new MutationObserver(syncAppearance);
      themeObserver.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      sessionRef.current = {
        window: targetWindow,
        root: pictureInPictureRoot,
        dispose: () => {
          themeObserver.disconnect();
          targetWindow.removeEventListener("focus", focusEditor);
        },
      };

      attachEditorTo(pictureInPictureRoot, targetWindow.document);
      syncAppearance();
      focusEditor();

      targetWindow.addEventListener(
        "pagehide",
        () => {
          returnEditorToMainWindow();
          // pagehide also fires when the floating window reloads (e.g. an
          // extension's reload command); close it so a reload cannot leave an
          // empty floating window behind.
          if (!targetWindow.closed) {
            targetWindow.close();
          }
        },
        { once: true },
      );
      setIsPictureInPicture(true);
    } catch (error) {
      if (pictureInPictureWindow && !pictureInPictureWindow.closed) {
        pictureInPictureWindow.close();
      }
      returnEditorToMainWindow();
      const message = error instanceof Error ? error.message : "unknown error";
      showToast(`Could not open Picture-in-Picture: ${message}`, "error");
    } finally {
      isOpeningRef.current = false;
    }
  }, [attachEditorTo, returnEditorToMainWindow, syncAppearance]);

  useLayoutEffect(() => {
    return () => {
      const session = sessionRef.current;
      if (!session) return;
      session.dispose();
      sessionRef.current = null;

      const editorSlot = editorSlotRef.current;
      if (editorSlot) {
        attachEditorTo(editorSlot, document);
      }
      session.window.close();
    };
  }, [attachEditorTo, editorSlotRef]);

  return {
    closePictureInPicture,
    isPictureInPicture,
    isPictureInPictureSupported: getDocumentPictureInPicture() !== undefined,
    openPictureInPicture,
  };
};
