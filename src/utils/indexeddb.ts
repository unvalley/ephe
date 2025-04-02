import Dexie from "dexie";
import type { Table } from "dexie";
import { EDITOR_CONTENT_KEY } from "./constants";

type EditorContent = {
  id: string;
  content: string;
}

export class EpheDatabase extends Dexie {
  editorContent!: Table<EditorContent>;

  constructor() {
    super("ephe");
    this.version(1).stores({
      editorContent: "id",
    });
  }
}

const idb = new EpheDatabase();

export const saveContent = async (content: string): Promise<void> => {
  await idb.editorContent.put({ id: EDITOR_CONTENT_KEY, content });
};

export const loadContent = async (): Promise<string | null> => {
  const result = await idb.editorContent.get(EDITOR_CONTENT_KEY);
  return result?.content ?? null;
}; 