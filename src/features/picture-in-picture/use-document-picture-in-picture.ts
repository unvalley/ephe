import type { EditorView } from "@codemirror/view";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { showToast } from "../../utils/components/toast";
import { getDocumentPictureInPicture, preparePictureInPictureDocument } from "./document-picture-in-picture";

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
  paperModeClass: string;
};

export const useDocumentPictureInPicture = ({
  editorSlotRef,
  editorSurface,
  getEditorView,
  paperModeClass,
}: UseDocumentPictureInPictureOptions) => {
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const sessionRef = useRef<PictureInPictureSession | null>(null);
  const isOpeningRef = useRef(false);
  const getEditorViewRef = useRef(getEditorView);

  useEffect(() => {
    getEditorViewRef.current = getEditorView;
  }, [getEditorView]);

  const syncAppearance = useCallback(() => {
    const session = sessionRef.current;
    if (!session) return;

    session.window.document.documentElement.className = document.documentElement.className;
    session.root.className = `h-screen overflow-hidden antialiased ${paperModeClass}`;
  }, [paperModeClass]);

  // The theme observer must always see the latest paperModeClass, not the one
  // captured when the picture-in-picture window was opened.
  const syncAppearanceRef = useRef(syncAppearance);
  useEffect(() => {
    syncAppearanceRef.current = syncAppearance;
    syncAppearance();
  }, [syncAppearance]);

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

      // The floating window hosts nothing but the editor, so focus must never
      // rest anywhere else. Without this, keystrokes land on <body> and
      // extensions like Vimium (which treat a non-editable activeElement as
      // normal mode) start swallowing keys instead of letting them type.
      const keepEditorFocused = (event: FocusEvent) => {
        if (event.relatedTarget) return;
        focusEditor();
      };
      targetWindow.document.addEventListener("focusout", keepEditorFocused);

      const themeObserver = new MutationObserver(() => syncAppearanceRef.current());
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
          targetWindow.document.removeEventListener("focusout", keepEditorFocused);
        },
      };

      attachEditorTo(pictureInPictureRoot, targetWindow.document);
      syncAppearanceRef.current();
      focusEditor();

      targetWindow.addEventListener("pagehide", returnEditorToMainWindow, { once: true });
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
  }, [attachEditorTo, returnEditorToMainWindow]);

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
