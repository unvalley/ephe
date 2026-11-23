import { planSync } from "./sync-plan";
import type { SyncFolder } from "./sync-folder";

export type SyncDocument = {
  fileName: string;
  getLocal: () => string;
  setLocal: (content: string) => void;
  /** False while the editor holds keystrokes that have not reached `getLocal` yet. */
  isSettled: () => boolean;
};

export type BaseStore = {
  get: (fileName: string) => string | null;
  set: (fileName: string, content: string) => void;
};

export type SyncOutcome =
  | { fileName: string; type: "none" | "settled" | "pushed" | "pulled" | "deferred" | "stale" }
  | { fileName: string; type: "conflict"; conflictCopy: string }
  | { fileName: string; type: "error"; error: unknown };

export const syncDocument = async (doc: SyncDocument, folder: SyncFolder, bases: BaseStore): Promise<SyncOutcome> => {
  const { fileName } = doc;
  const remote = await folder.read(fileName);
  // From here until a pull is applied there is no await, so no keystroke can
  // land between reading the local content and replacing it.
  const local = doc.getLocal();
  const action = planSync({ local, remote, base: bases.get(fileName) });

  switch (action.type) {
    case "none":
      return { fileName, type: "none" };
    case "settle":
      bases.set(fileName, local);
      return { fileName, type: "settled" };
    case "push": {
      // The base only advances once the file is known to hold `local`.
      if ((await folder.commit(fileName, local, remote)) === "stale") return { fileName, type: "stale" };
      bases.set(fileName, local);
      return { fileName, type: "pushed" };
    }
    case "pull":
      if (!doc.isSettled()) return { fileName, type: "deferred" };
      doc.setLocal(action.content);
      bases.set(fileName, action.content);
      return { fileName, type: "pulled" };
    case "conflict": {
      if (!doc.isSettled()) return { fileName, type: "deferred" };
      const conflictCopy = await folder.writeConflictCopy(fileName, local);
      // Anything typed while the copy was being written is not in it yet; the next pass handles it.
      if (doc.getLocal() !== local || !doc.isSettled()) return { fileName, type: "deferred" };
      doc.setLocal(action.content);
      bases.set(fileName, action.content);
      return { fileName, type: "conflict", conflictCopy };
    }
  }
};

// One document failing (a name taken by a directory, an unreadable placeholder)
// must not keep the others from syncing.
export const syncDocuments = async (
  docs: SyncDocument[],
  folder: SyncFolder,
  bases: BaseStore,
): Promise<SyncOutcome[]> => {
  const outcomes: SyncOutcome[] = [];
  for (const doc of docs) {
    try {
      outcomes.push(await syncDocument(doc, folder, bases));
    } catch (error) {
      outcomes.push({ fileName: doc.fileName, type: "error", error });
    }
  }
  return outcomes;
};
