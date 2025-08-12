import { type EditorView, Decoration, type DecorationSet, WidgetType, ViewPlugin, type ViewUpdate } from "@codemirror/view";
import { type Range } from "@codemirror/state";
import { imageStorage } from "./image-storage";

class ImageWidget extends WidgetType {
  constructor(
    readonly imageId: string,
    readonly altText: string,
  ) {
    super();
  }

  toDOM() {
    const imageUrl = imageStorage.getImageUrl(this.imageId);
    
    if (!imageUrl) {
      const span = document.createElement("span");
      span.className = "text-red-500 text-sm";
      span.textContent = `[Image not found: ${this.imageId}]`;
      return span;
    }

    const container = document.createElement("div");
    container.className = "inline-block my-2";

    const img = document.createElement("img");
    img.src = imageUrl;
    img.alt = this.altText;
    img.className = "max-w-full h-auto rounded-md shadow-sm";
    img.style.maxHeight = "400px";
    
    container.appendChild(img);
    return container;
  }

  eq(other: ImageWidget) {
    return other.imageId === this.imageId && other.altText === this.altText;
  }
}

const imageRegex = /!\[([^\]]*)\]\(image:([^)]+)\)/g;

function getImageDecorations(view: EditorView): DecorationSet {
  const decorations: Range<Decoration>[] = [];
  const doc = view.state.doc;
  const text = doc.toString();
  
  let match: RegExpExecArray | null;
  imageRegex.lastIndex = 0; // Reset regex state
  match = imageRegex.exec(text);
  while (match !== null) {
    const from = match.index;
    const to = from + match[0].length;
    const altText = match[1];
    const imageId = match[2];
    
    decorations.push(
      Decoration.replace({
        widget: new ImageWidget(imageId, altText),
        inclusive: true,
      }).range(from, to)
    );
    match = imageRegex.exec(text);
  }
  
  return Decoration.set(decorations);
}

export const imageDisplayExtension = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;

    constructor(view: EditorView) {
      this.decorations = getImageDecorations(view);
    }

    update(update: ViewUpdate) {
      if (update.docChanged || update.viewportChanged) {
        this.decorations = getImageDecorations(update.view);
      }
    }
  },
  {
    decorations: (v) => v.decorations,
  }
);