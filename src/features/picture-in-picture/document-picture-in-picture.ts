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

export const preparePictureInPictureDocument = (source: Document, target: Document): HTMLElement => {
  target.title = "Ephe";

  const viewport = target.createElement("meta");
  viewport.name = "viewport";
  viewport.content = "width=device-width, initial-scale=1";
  target.head.append(viewport);
  copyDocumentStyles(source, target);

  const root = target.createElement("main");
  target.body.className = "m-0 h-screen overflow-hidden";
  target.body.append(root);
  return root;
};
