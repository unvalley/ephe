import { describe, expect, test } from "vitest";
import { type BaseStore, type SyncDocument, syncDocument, syncDocuments } from "./sync-engine";
import type { SyncFolder } from "./sync-folder";

type FakeFolder = SyncFolder & {
  files: Map<string, string>;
  writes: string[];
  /** Runs once, right before the next commit checks the file. */
  beforeCommit?: () => void;
  /** Runs once, while the next conflict copy is being written. */
  duringConflictCopy?: () => void;
  failNextCommit?: Error;
  unreadable: Set<string>;
};

const createFakeFolder = (initial: Record<string, string> = {}): FakeFolder => {
  const files = new Map(Object.entries(initial));
  const folder: FakeFolder = {
    files,
    writes: [],
    unreadable: new Set(),
    read: async (fileName) => {
      if (folder.unreadable.has(fileName)) throw new Error(`Cannot read ${fileName}`);
      return files.get(fileName) ?? null;
    },
    commit: async (fileName, content, expected) => {
      folder.beforeCommit?.();
      folder.beforeCommit = undefined;
      if ((files.get(fileName) ?? null) !== expected) return "stale";
      if (folder.failNextCommit) {
        const error = folder.failNextCommit;
        folder.failNextCommit = undefined;
        throw error;
      }
      files.set(fileName, content);
      folder.writes.push(fileName);
      return "committed";
    },
    writeConflictCopy: async (fileName, content) => {
      folder.duringConflictCopy?.();
      folder.duringConflictCopy = undefined;
      const name = `${fileName}.conflict-${folder.writes.length}`;
      files.set(name, content);
      folder.writes.push(name);
      return name;
    },
  };
  return folder;
};

type FakeDocument = SyncDocument & { content: string; settled: boolean };

const createDocument = (fileName: string, content = ""): FakeDocument => {
  const doc: FakeDocument = {
    fileName,
    content,
    settled: true,
    getLocal: () => doc.content,
    setLocal: (next) => {
      doc.content = next;
    },
    isSettled: () => doc.settled,
  };
  return doc;
};

const createBases = (initial: Record<string, string> = {}): BaseStore & { values: Map<string, string> } => {
  const values = new Map(Object.entries(initial));
  return {
    values,
    get: (fileName) => values.get(fileName) ?? null,
    set: (fileName, content) => {
      values.set(fileName, content);
    },
  };
};

const FILE = "ephe-1.md";

describe("syncDocument", () => {
  test("creates the file from local content on first sync", async () => {
    const folder = createFakeFolder();
    const doc = createDocument(FILE, "- [ ] buy milk\n");
    const bases = createBases();

    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "pushed" });
    expect(folder.files.get(FILE)).toBe("- [ ] buy milk\n");
    expect(bases.get(FILE)).toBe("- [ ] buy milk\n");
  });

  test("leaves the folder empty for an empty document", async () => {
    const folder = createFakeFolder();

    expect(await syncDocument(createDocument(FILE), folder, createBases())).toEqual({ fileName: FILE, type: "none" });
    expect(folder.files.size).toBe(0);
  });

  test("adopts a file another browser already wrote", async () => {
    const folder = createFakeFolder({ [FILE]: "from the other browser" });
    const doc = createDocument(FILE);
    const bases = createBases();

    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "pulled" });
    expect(doc.content).toBe("from the other browser");
    expect(folder.writes).toEqual([]);
  });

  test("pulls content byte for byte, trailing blank lines included", async () => {
    const folder = createFakeFolder({ [FILE]: "note\n\n\n" });
    const doc = createDocument(FILE, "note");
    const bases = createBases({ [FILE]: "note" });

    await syncDocument(doc, folder, bases);

    expect(doc.content).toBe("note\n\n\n");
  });

  test("pushes content byte for byte, trailing blank lines included", async () => {
    const folder = createFakeFolder({ [FILE]: "note" });
    const doc = createDocument(FILE, "note\n\n\n");

    await syncDocument(doc, folder, createBases({ [FILE]: "note" }));

    expect(folder.files.get(FILE)).toBe("note\n\n\n");
  });

  test("keeps both versions when both sides changed", async () => {
    const folder = createFakeFolder({ [FILE]: "theirs" });
    const doc = createDocument(FILE, "mine");
    const bases = createBases({ [FILE]: "original" });

    const outcome = await syncDocument(doc, folder, bases);

    expect(outcome.type).toBe("conflict");
    expect(folder.files.get(FILE)).toBe("theirs");
    expect(doc.content).toBe("theirs");
    const [copyName] = folder.writes;
    expect(outcome).toEqual({ fileName: FILE, type: "conflict", conflictCopy: copyName });
    expect(folder.files.get(copyName)).toBe("mine");
  });

  test("keeps local content when the file is deleted, and does not recreate it", async () => {
    const folder = createFakeFolder();
    const doc = createDocument(FILE, "still here");
    const bases = createBases({ [FILE]: "still here" });

    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "none" });
    expect(doc.content).toBe("still here");
    expect(folder.files.has(FILE)).toBe(false);

    doc.content = "still here, edited";
    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "pushed" });
    expect(folder.files.get(FILE)).toBe("still here, edited");
  });

  test("does not overwrite a file that changed after it was read", async () => {
    const folder = createFakeFolder({ [FILE]: "original" });
    const doc = createDocument(FILE, "mine");
    const bases = createBases({ [FILE]: "original" });
    folder.beforeCommit = () => folder.files.set(FILE, "theirs");

    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "stale" });
    expect(folder.files.get(FILE)).toBe("theirs");
    expect(bases.get(FILE)).toBe("original");

    // The next pass sees two diverged versions and keeps both.
    expect((await syncDocument(doc, folder, bases)).type).toBe("conflict");
    expect(doc.content).toBe("theirs");
    expect([...folder.files.values()]).toContain("mine");
  });

  test("a failed write leaves the file and the base untouched, and the next pass retries", async () => {
    const folder = createFakeFolder({ [FILE]: "original" });
    const doc = createDocument(FILE, "mine");
    const bases = createBases({ [FILE]: "original" });
    folder.failNextCommit = new Error("disk full");

    await expect(syncDocument(doc, folder, bases)).rejects.toThrow("disk full");
    expect(folder.files.get(FILE)).toBe("original");
    expect(bases.get(FILE)).toBe("original");
    expect(doc.content).toBe("mine");

    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "pushed" });
    expect(folder.files.get(FILE)).toBe("mine");
  });

  test("an unreadable file is never treated as an empty one", async () => {
    const folder = createFakeFolder({ [FILE]: "placeholder not downloaded" });
    const doc = createDocument(FILE, "mine");
    const bases = createBases({ [FILE]: "mine" });
    folder.unreadable.add(FILE);

    await expect(syncDocument(doc, folder, bases)).rejects.toThrow("Cannot read");
    expect(doc.content).toBe("mine");
    expect(folder.writes).toEqual([]);
  });

  test("waits for pending keystrokes before replacing the editor's content", async () => {
    const folder = createFakeFolder({ [FILE]: "theirs" });
    const doc = createDocument(FILE, "original");
    const bases = createBases({ [FILE]: "original" });
    doc.settled = false;

    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "deferred" });
    expect(doc.content).toBe("original");

    doc.settled = true;
    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "pulled" });
    expect(doc.content).toBe("theirs");
  });

  test("does not replace content edited while its conflict copy was being written", async () => {
    const folder = createFakeFolder({ [FILE]: "theirs" });
    const doc = createDocument(FILE, "mine");
    const bases = createBases({ [FILE]: "original" });
    folder.duringConflictCopy = () => {
      doc.content = "mine, still typing";
    };

    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "deferred" });
    expect(doc.content).toBe("mine, still typing");

    expect((await syncDocument(doc, folder, bases)).type).toBe("conflict");
    expect(doc.content).toBe("theirs");
    expect([...folder.files.values()]).toContain("mine, still typing");
  });

  test("converges: repeating a pass changes nothing", async () => {
    const folder = createFakeFolder({ [FILE]: "theirs" });
    const doc = createDocument(FILE, "mine");
    const bases = createBases({ [FILE]: "original" });

    await syncDocument(doc, folder, bases);
    const writesAfterFirstPass = [...folder.writes];

    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "none" });
    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "none" });
    expect(folder.writes).toEqual(writesAfterFirstPass);
  });

  test("rebuilds a lost base without touching either side when they agree", async () => {
    const folder = createFakeFolder({ [FILE]: "same" });
    const doc = createDocument(FILE, "same");
    const bases = createBases();

    expect(await syncDocument(doc, folder, bases)).toEqual({ fileName: FILE, type: "settled" });
    expect(bases.get(FILE)).toBe("same");
    expect(folder.writes).toEqual([]);
  });
});

describe("syncDocuments", () => {
  test("two browsers sharing a folder end up with the same documents", async () => {
    const folder = createFakeFolder();
    const chrome = { doc: createDocument(FILE, "written in Chrome"), bases: createBases() };
    const edge = { doc: createDocument(FILE), bases: createBases() };

    await syncDocuments([chrome.doc], folder, chrome.bases);
    await syncDocuments([edge.doc], folder, edge.bases);
    expect(edge.doc.content).toBe("written in Chrome");

    edge.doc.content = "written in Chrome, edited in Edge";
    await syncDocuments([edge.doc], folder, edge.bases);
    await syncDocuments([chrome.doc], folder, chrome.bases);
    expect(chrome.doc.content).toBe("written in Chrome, edited in Edge");
    expect([...folder.files.keys()]).toEqual([FILE]);
  });

  test("a failing document does not stop the others", async () => {
    const folder = createFakeFolder({ "ephe-2.md": "theirs" });
    folder.unreadable.add("ephe-1.md");
    const first = createDocument("ephe-1.md", "mine");
    const second = createDocument("ephe-2.md");

    const outcomes = await syncDocuments([first, second], folder, createBases());

    expect(outcomes.map((outcome) => outcome.type)).toEqual(["error", "pulled"]);
    expect(second.content).toBe("theirs");
  });
});
