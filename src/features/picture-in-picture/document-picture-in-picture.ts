type DocumentPictureInPictureOptions = {
  width?: number;
  height?: number;
  disallowReturnToOpener?: boolean;
};

type DocumentPictureInPicture = {
  readonly window: Window | null;
  requestWindow: (options?: DocumentPictureInPictureOptions) => Promise<Window>;
};

type WindowWithDocumentPictureInPicture = Window & {
  documentPictureInPicture?: DocumentPictureInPicture;
};

export const getDocumentPictureInPicture = (targetWindow: Window = window): DocumentPictureInPicture | undefined =>
  (targetWindow as WindowWithDocumentPictureInPicture).documentPictureInPicture;

export const copyDocumentStyles = (source: Document, target: Document) => {
  const styles = source.querySelectorAll('link[rel~="stylesheet"], style[data-vite-dev-id]');
  for (const style of styles) {
    target.head.append(style.cloneNode(true));
  }
};
