import type { EditorView } from "@codemirror/view";
import { useCallback, useEffect, useLayoutEffect, useRef, useState, type RefObject } from "react";
import { showToast } from "../../utils/components/toast";
import { copyDocumentStyles, getDocumentPictureInPicture } from "./document-picture-in-picture";

const PICTURE_IN_PICTURE_SIZE = {
  width: 420,
  height: 560,
} as const;

type UseDocumentPictureInPictureOptions = {
  editorSlotRef: RefObject<HTMLDivElement | null>;
  editorSurfaceRef: RefObject<HTMLDivElement | null>;
  getEditorView: () => EditorView | null;
  paperModeClass: string;
};

export const useDocumentPictureInPicture = ({
  editorSlotRef,
  editorSurfaceRef,
  getEditorView,
  paperModeClass,
}: UseDocumentPictureInPictureOptions) => {
  const [isPictureInPicture, setIsPictureInPicture] = useState(false);
  const pictureInPictureWindowRef = useRef<Window | null>(null);
  const pictureInPictureRootRef = useRef<HTMLElement | null>(null);
  const themeObserverRef = useRef<MutationObserver | null>(null);
  const getEditorViewRef = useRef(getEditorView);
  const isOpeningRef = useRef(false);

  useEffect(() => {
    getEditorViewRef.current = getEditorView;
  }, [getEditorView]);

  const syncAppearance = useCallback(() => {
    const pictureInPictureWindow = pictureInPictureWindowRef.current;
    const pictureInPictureRoot = pictureInPictureRootRef.current;
    if (!pictureInPictureWindow || !pictureInPictureRoot) return;

    pictureInPictureWindow.document.documentElement.className = document.documentElement.className;
    pictureInPictureRoot.className = `h-screen overflow-hidden antialiased ${paperModeClass}`;
  }, [paperModeClass]);

  useEffect(() => {
    syncAppearance();
  }, [syncAppearance]);

  const returnEditorToMainWindow = useCallback(() => {
    themeObserverRef.current?.disconnect();
    themeObserverRef.current = null;

    const editorSurface = editorSurfaceRef.current;
    const editorSlot = editorSlotRef.current;
    if (editorSurface && editorSlot && editorSurface.parentElement !== editorSlot) {
      editorSlot.append(editorSurface);
    }

    const editorView = getEditorViewRef.current();
    if (editorView) {
      editorView.setRoot(document);
      editorView.requestMeasure();
      editorView.focus();
    }

    pictureInPictureWindowRef.current = null;
    pictureInPictureRootRef.current = null;
    setIsPictureInPicture(false);
  }, [editorSlotRef, editorSurfaceRef]);

  const closePictureInPicture = useCallback(() => {
    const pictureInPictureWindow = pictureInPictureWindowRef.current;
    if (!pictureInPictureWindow || pictureInPictureWindow.closed) {
      returnEditorToMainWindow();
      return;
    }
    pictureInPictureWindow.close();
    returnEditorToMainWindow();
  }, [returnEditorToMainWindow]);

  const openPictureInPicture = useCallback(async () => {
    const documentPictureInPicture = getDocumentPictureInPicture();
    const editorSurface = editorSurfaceRef.current;
    if (!documentPictureInPicture || !editorSurface || isOpeningRef.current) return;

    if (documentPictureInPicture.window) {
      documentPictureInPicture.window.focus();
      return;
    }

    isOpeningRef.current = true;
    try {
      const pictureInPictureWindow = await documentPictureInPicture.requestWindow(PICTURE_IN_PICTURE_SIZE);
      pictureInPictureWindowRef.current = pictureInPictureWindow;

      const { document: pictureInPictureDocument } = pictureInPictureWindow;
      pictureInPictureDocument.title = "Ephe";

      const viewport = pictureInPictureDocument.createElement("meta");
      viewport.name = "viewport";
      viewport.content = "width=device-width, initial-scale=1";
      pictureInPictureDocument.head.append(viewport);
      copyDocumentStyles(document, pictureInPictureDocument);

      const pictureInPictureRoot = pictureInPictureDocument.createElement("main");
      pictureInPictureRoot.dataset.ephePictureInPicture = "";
      pictureInPictureRootRef.current = pictureInPictureRoot;
      pictureInPictureDocument.body.className = "m-0 h-screen overflow-hidden";
      pictureInPictureDocument.body.append(pictureInPictureRoot);
      pictureInPictureRoot.append(editorSurface);

      const editorView = getEditorViewRef.current();
      if (editorView) {
        editorView.setRoot(pictureInPictureDocument);
        editorView.requestMeasure();
        editorView.focus();
      }

      syncAppearance();
      themeObserverRef.current = new MutationObserver(syncAppearance);
      themeObserverRef.current.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
      });

      pictureInPictureWindow.addEventListener("pagehide", returnEditorToMainWindow, { once: true });
      setIsPictureInPicture(true);
    } catch (error) {
      const pictureInPictureWindow = pictureInPictureWindowRef.current;
      if (pictureInPictureWindow && !pictureInPictureWindow.closed) {
        pictureInPictureWindow.close();
      }
      returnEditorToMainWindow();
      const message = error instanceof Error ? error.message : "unknown error";
      showToast(`Could not open Picture-in-Picture: ${message}`, "error");
    } finally {
      isOpeningRef.current = false;
    }
  }, [editorSurfaceRef, returnEditorToMainWindow, syncAppearance]);

  useLayoutEffect(() => {
    return () => {
      themeObserverRef.current?.disconnect();
      const editorSurface = editorSurfaceRef.current;
      const editorSlot = editorSlotRef.current;
      if (editorSurface && editorSlot && editorSurface.parentElement !== editorSlot) {
        editorSlot.append(editorSurface);
        getEditorViewRef.current()?.setRoot(document);
      }
      pictureInPictureWindowRef.current?.close();
    };
  }, [editorSlotRef, editorSurfaceRef]);

  return {
    closePictureInPicture,
    isPictureInPicture,
    isPictureInPictureSupported: getDocumentPictureInPicture() !== undefined,
    openPictureInPicture,
  };
};
