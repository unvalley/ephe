import * as monaco from "monaco-editor";

// Interface for the folding controller
interface FoldingController {
  getFoldingModel(): {
    isCollapsed(lineNumber: number): boolean;
  } | null;
}

/**
 * Adds fold/unfold controls to markdown headings
 */
export function applyHeadingFoldDecorations(
  editor: monaco.editor.IStandaloneCodeEditor,
  model: monaco.editor.ITextModel | null
): void {
  if (!model) return;

  // Remove any existing heading fold decorations
  const oldDecorations = model.getAllDecorations() || [];
  const oldIds = oldDecorations
    .filter((d) => d.options.className?.includes("heading-fold-control"))
    .map((d) => d.id);
  
  if (oldIds.length > 0) {
    editor.deltaDecorations(oldIds, []);
  }

  const decorations: monaco.editor.IModelDeltaDecoration[] = [];
  const foldingController = editor.getContribution("editor.contrib.folding") as unknown as FoldingController | null;
  
  // Process each line to find headings
  for (let lineNumber = 1; lineNumber <= model.getLineCount(); lineNumber++) {
    const lineContent = model.getLineContent(lineNumber);
    
    // Check if the line is a markdown header
    const headerMatch = lineContent.match(/^(#{1,6})\s+(.*?)$/);
    if (headerMatch) {
      const level = headerMatch[1].length; // Get heading level (h1, h2, etc.)
      
      // Skip first line completely to avoid conflict with placeholder
      if (lineNumber === 1) {
        continue;
      }
      
      // Determine if this section is folded
      const isFolded = foldingController?.getFoldingModel()?.isCollapsed(lineNumber) || false;

      // Tailwind-based class names
      const baseClasses = "inline-flex items-center justify-center w-5 h-5 absolute -left-7 opacity-0 cursor-pointer transition-opacity duration-200 z-5";
      const stateClasses = isFolded ? "text-gray-600 dark:text-gray-400" : "text-gray-500 dark:text-gray-500";
      const levelClasses = `ml-${Math.max(0, 5 - level)}`;
      
      // Create HTML strings for the fold/unfold icons with tailwind classes
      const iconClass = `w-3.5 h-3.5 ${stateClasses}`;
      const foldIconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="${iconClass}"><polyline points="6 9 12 15 18 9" /></svg>`;
      const unfoldIconHtml = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" class="${iconClass}"><polyline points="18 15 12 9 6 15" /></svg>`;
      
      // Combined class for the decoration
      const decorationClass = `heading-fold-control ${levelClasses}`;
        
      // Create the decoration for this heading
      decorations.push({
        range: new monaco.Range(lineNumber, 1, lineNumber, 1),
        options: {
          isWholeLine: false,
          className: decorationClass,
          beforeContentClassName: `${baseClasses} ${levelClasses} heading-fold-control-before`,
          before: {
            content: isFolded ? unfoldIconHtml : foldIconHtml,
          },
          stickiness: monaco.editor.TrackedRangeStickiness.NeverGrowsWhenTypingAtEdges,
        },
      });
    }
  }

  // Apply the decorations
  editor.createDecorationsCollection(decorations);
}

/**
 * Register click handler for heading fold controls
 */
export function registerHeadingFoldClickHandler(
  editor: monaco.editor.IStandaloneCodeEditor
): void {
  // Handle mouse clicks on fold controls
  editor.onMouseDown((e) => {
    // Check if clicking on a fold control or one of its children (SVG, etc.)
    const isClickingFoldControl = 
      e.target.element?.classList.contains("heading-fold-control-before") ||
      e.target.element?.closest(".heading-fold-control-before");
      
    if (!isClickingFoldControl) {
      return;
    }
    
    const position = e.target.position;
    if (!position) return;

    // Toggle fold state at this position
    const lineNumber = position.lineNumber;
    const foldingController = editor.getContribution("editor.contrib.folding") as unknown as FoldingController | null;
    
    if (foldingController) {
      if (foldingController.getFoldingModel()?.isCollapsed(lineNumber)) {
        // If folded, unfold it
        editor.trigger("heading-fold", "editor.unfold", { selectionLines: [lineNumber] });
      } else {
        // If unfolded, fold it
        editor.trigger("heading-fold", "editor.fold", { selectionLines: [lineNumber] });
      }
      
      // Update decorations after folding state changes
      setTimeout(() => {
        applyHeadingFoldDecorations(editor, editor.getModel());
      }, 100);
    }
  });
}

/**
 * Add hover effect to heading fold controls using DOM
 */
export function addHeadingFoldHoverEffect(editor: monaco.editor.IStandaloneCodeEditor): void {
  const editorElement = editor.getDomNode();
  if (!editorElement) return;
  
  // Add CSS to show fold controls on hover
  const style = document.createElement('style');
  style.textContent = `
    .monaco-editor .view-line:hover .heading-fold-control-before {
      opacity: 0.6 !important;
    }
    .monaco-editor .view-line .heading-fold-control-before:hover {
      opacity: 1 !important;
    }
  `;
  document.head.appendChild(style);
}

/**
 * Register event listeners for updating fold decorations when content or folding state changes
 */
export function registerFoldingStateListeners(
  editor: monaco.editor.IStandaloneCodeEditor
): void {
  // Update decorations when folding state changes
  editor.onDidChangeModelContent(() => {
    applyHeadingFoldDecorations(editor, editor.getModel());
  });
  
  // Add a listener on the editor to refresh decorations when scrolling
  // This helps with keeping decorations in sync with folding state
  editor.onDidScrollChange(() => {
    applyHeadingFoldDecorations(editor, editor.getModel());
  });

  // Add hover effect for fold controls
  addHeadingFoldHoverEffect(editor);

  // If there's a folding controller, hook into its events if possible
  const foldingController = editor.getContribution("editor.contrib.folding") as unknown;
  if (foldingController && typeof foldingController === 'object' && foldingController !== null) {
    // Some versions of Monaco expose events we can listen to
    // Using unknown for generic event handling since the exact type is not documented
    const controller = foldingController as unknown as { 
      onDidChangeFoldingState?: (callback: () => void) => void 
    };
    
    if (controller.onDidChangeFoldingState) {
      controller.onDidChangeFoldingState(() => {
        applyHeadingFoldDecorations(editor, editor.getModel());
      });
    }
  }
} 