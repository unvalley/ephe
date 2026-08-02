type DocumentPictureInPictureOptions = {
  width?: number;
  height?: number;
};

export type DocumentPictureInPicture = {
  readonly window: Window | null;
  requestWindow: (options?: DocumentPictureInPictureOptions) => Promise<Window>;
};

type WindowWithDocumentPictureInPicture = Window & {
  documentPictureInPicture?: DocumentPictureInPicture;
};

export const getDocumentPictureInPicture = (targetWindow: Window = window): DocumentPictureInPicture | undefined =>
  (targetWindow as WindowWithDocumentPictureInPicture).documentPictureInPicture;

export const copyDocumentStyles = (source: Document, target: Document) => {
  for (const styleSheet of source.styleSheets) {
    if (styleSheet.href) {
      const link = target.createElement("link");
      link.rel = "stylesheet";
      link.href = styleSheet.href;
      link.media = styleSheet.media.mediaText;
      target.head.append(link);
      continue;
    }

    try {
      const style = target.createElement("style");
      style.textContent = Array.from(styleSheet.cssRules, (rule) => rule.cssText).join("\n");
      target.head.append(style);
    } catch {
      // A stylesheet without a readable href cannot be reproduced in the PiP document.
      // The editor's CodeMirror theme is injected separately into its own root.
    }
  }
};
