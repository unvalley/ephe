export const LOCAL_STORAGE_KEYS = {
  EDITOR_CONTENT: "ephe:editor-content",
  COMPLETED_TASKS: "ephe:completed-tasks",
  SNAPSHOTS: "ephe:snapshots",
  THEME: "ephe:theme",
  EDITOR_WIDTH: "ephe:editor-width",
  PAPER_MODE: "ephe:paper-mode",
  PREVIEW_MODE: "ephe:preview-mode",
  TOC_MODE: "ephe:toc-mode",
  TASK_AUTO_FLUSH_MODE: "ephe:task-auto-flush-mode",
  FONT_FAMILY: "ephe:font-family",
  CURSOR_POSITION: "ephe:cursor-position",
  DOCUMENTS: "ephe:documents",
  ACTIVE_DOCUMENT_INDEX: "ephe:active-document-index",
  EDITOR_MODE: "ephe:editor-mode",
} as const satisfies Record<string, `ephe:${string}`>;

export const EPHE_VERSION = "0.0.1";
