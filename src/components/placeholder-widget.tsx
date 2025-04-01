import * as monaco from "monaco-editor";

export class PlaceholderWidget implements monaco.editor.IContentWidget {
  private readonly id = "placeholder_widget";
  private domNode: HTMLElement | undefined;

  constructor(
    private readonly editor: monaco.editor.IStandaloneCodeEditor,
    private readonly placeholderText: string,
  ) {
    editor.addContentWidget(this);
  }

  getId() {
    return this.id;
  }

  getDomNode(): HTMLElement {
    if (!this.domNode) {
      const domNode = document.createElement("div");
      domNode.innerText = this.placeholderText;
      domNode.className = `
        absolute 
        text-md 
        left-0.5 px-4 sm:px-2 w-max
        items-center 
        text-gray-400 dark:text-gray-500 
        pointer-events-none 
        z-[1] 
        transition-opacity duration-300 opacity-100`;

      this.editor.applyFontInfo(domNode);
      this.domNode = domNode;
    }

    return this.domNode;
  }

  getPosition(): monaco.editor.IContentWidgetPosition | null {
    return {
      position: { lineNumber: 1, column: 1 },
      preference: [monaco.editor.ContentWidgetPositionPreference.EXACT],
    };
  }

  public dispose(): void {
    this.editor.removeContentWidget(this);
  }
}
