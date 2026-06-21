import { invoke } from "@tauri-apps/api/core";
import { open } from "@tauri-apps/plugin-dialog";
import type { ReactNode } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

type NoteEntry = {
  path: string;
  title: string;
  modifiedMs: number;
  size: number;
};

type Heading = {
  level: number;
  text: string;
  anchor: string;
};

type LinkKind = "markdown" | "wiki" | "embed" | "tag";

type Link = {
  raw: string;
  target: string;
  heading?: string;
  alias?: string;
  kind: LinkKind;
};

type Backlink = {
  sourcePath: string;
  sourceTitle: string;
  links: Link[];
};

type NoteDocument = {
  path: string;
  title: string;
  content: string;
  modifiedMs: number;
  size: number;
  headings: Heading[];
  outgoingLinks: Link[];
  backlinks: Backlink[];
};

type Status = "idle" | "loading" | "saving";

export function App() {
  const [vaultPath, setVaultPath] = useState<string | null>(null);
  const [notes, setNotes] = useState<NoteEntry[]>([]);
  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [document, setDocument] = useState<NoteDocument | null>(null);
  const [draft, setDraft] = useState("");
  const [query, setQuery] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [inspectorOpen, setInspectorOpen] = useState(true);
  const [history, setHistory] = useState<string[]>([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const initialVaultOpened = useRef(false);

  const filteredNotes = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    if (!normalized) return notes;
    return notes.filter((note) => {
      return (
        note.title.toLowerCase().includes(normalized) ||
        note.path.toLowerCase().includes(normalized)
      );
    });
  }, [notes, query]);

  const canGoBack = historyIndex > 0;
  const canGoForward = historyIndex >= 0 && historyIndex < history.length - 1;

  async function openVaultPath(path: string) {
    setStatus("loading");
    try {
      setVaultPath(path);
      const nextNotes = await invoke<NoteEntry[]>("list_notes", {
        vaultPath: path,
      });
      setNotes(nextNotes);
      if (nextNotes[0]) {
        await selectNote(nextNotes[0].path, { vaultPath: path });
      }
    } catch (cause) {
      setError(String(cause));
    } finally {
      setStatus("idle");
    }
  }

  async function refreshNotes(nextVaultPath = vaultPath) {
    if (!nextVaultPath) return;
    const nextNotes = await invoke<NoteEntry[]>("list_notes", {
      vaultPath: nextVaultPath,
    });
    setNotes(nextNotes);
  }

  async function chooseVault() {
    setError(null);
    const selected = await open({
      directory: true,
      multiple: false,
      title: "Open Vault",
    });
    if (typeof selected !== "string") return;

    await openVaultPath(selected);
  }

  async function selectNote(
    path: string,
    options: { pushHistory?: boolean; vaultPath?: string } = {},
  ) {
    const activeVaultPath = options.vaultPath ?? vaultPath;
    if (!activeVaultPath) return;

    setError(null);
    setSelectedPath(path);
    setStatus("loading");
    try {
      const nextDocument = await invoke<NoteDocument>("read_note", {
        vaultPath: activeVaultPath,
        path,
      });
      setDocument(nextDocument);
      setDraft(nextDocument.content);
      void loadBacklinks(activeVaultPath, path);
      if (options.pushHistory !== false) {
        setHistory((current) => {
          const trimmed = current.slice(0, historyIndex + 1);
          if (trimmed[trimmed.length - 1] === path) return trimmed;
          return [...trimmed, path];
        });
        setHistoryIndex((current) => current + 1);
      }
    } catch (cause) {
      setError(String(cause));
    } finally {
      setStatus("idle");
    }
  }

  async function loadBacklinks(activeVaultPath: string, path: string) {
    try {
      const backlinks = await invoke<Backlink[]>("get_backlinks", {
        vaultPath: activeVaultPath,
        path,
      });
      setDocument((current) => {
        if (!current || current.path !== path) return current;
        return { ...current, backlinks };
      });
    } catch (cause) {
      setError(String(cause));
    }
  }

  async function createNote() {
    if (!vaultPath) return;
    const title = window.prompt("New file name", "Untitled");
    if (title === null) return;

    setError(null);
    setStatus("loading");
    try {
      const nextDocument = await invoke<NoteDocument>("create_note", {
        vaultPath,
        request: { title },
      });
      await refreshNotes();
      setDocument(nextDocument);
      setDraft(nextDocument.content);
      setSelectedPath(nextDocument.path);
      setHistory((current) => [...current.slice(0, historyIndex + 1), nextDocument.path]);
      setHistoryIndex((current) => current + 1);
    } catch (cause) {
      setError(String(cause));
    } finally {
      setStatus("idle");
    }
  }

  async function createFolder() {
    if (!vaultPath) return;
    const name = window.prompt("New folder name", "Untitled Folder");
    if (!name) return;

    setError(null);
    try {
      await invoke<string>("create_folder", {
        vaultPath,
        parent: "",
        name,
      });
      await refreshNotes();
    } catch (cause) {
      setError(String(cause));
    }
  }

  async function save() {
    if (!vaultPath || !document) return;
    setError(null);
    setStatus("saving");
    try {
      const nextDocument = await invoke<NoteDocument>("save_note", {
        vaultPath,
        path: document.path,
        content: draft,
      });
      setDocument(nextDocument);
      setDraft(nextDocument.content);
      await refreshNotes();
    } catch (cause) {
      setError(String(cause));
    } finally {
      setStatus("idle");
    }
  }

  function navigate(delta: -1 | 1) {
    const nextIndex = historyIndex + delta;
    const nextPath = history[nextIndex];
    if (!nextPath) return;
    setHistoryIndex(nextIndex);
    void selectNote(nextPath, { pushHistory: false });
  }

  useEffect(() => {
    let cancelled = false;
    async function openInitialVault() {
      if (initialVaultOpened.current) return;
      initialVaultOpened.current = true;
      const initialVault = await invoke<string | null>("initial_vault_path");
      if (!cancelled && initialVault) {
        await openVaultPath(initialVault);
      }
    }
    void openInitialVault();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
        event.preventDefault();
        void save();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [save]);

  return (
    <main className="app-shell">
      {sidebarOpen ? (
        <aside className="sidebar">
          <div className="sidebar-topbar">
            <button type="button" className="icon-button" disabled={!canGoBack} onClick={() => navigate(-1)} title="Back">
              ‹
            </button>
            <button type="button" className="icon-button" disabled={!canGoForward} onClick={() => navigate(1)} title="Forward">
              ›
            </button>
            <button type="button" className="icon-button" disabled={!vaultPath} onClick={createNote} title="New File">
              +
            </button>
            <button type="button" className="icon-button" disabled={!vaultPath} onClick={createFolder} title="New Folder">
              ◧
            </button>
            <span className="topbar-spacer" />
            <button type="button" className="icon-button" onClick={() => setSidebarOpen(false)} title="Hide Sidebar">
              ◨
            </button>
            <button type="button" className="icon-button" onClick={() => setInspectorOpen((value) => !value)} title="Toggle Inspector">
              ☷
            </button>
          </div>

          <div className="vault-row">
            <button type="button" className="vault-button" onClick={chooseVault}>
              {vaultPath ? basename(vaultPath) : "Open Vault"}
            </button>
          </div>

          <input
            className="search-input"
            placeholder="Search notes"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
          />

          <div className="note-list" role="listbox" aria-label="Notes">
            {filteredNotes.map((note) => (
              <button
                type="button"
                key={note.path}
                className={note.path === selectedPath ? "note-row selected" : "note-row"}
                onClick={() => selectNote(note.path)}
                title={note.path}
              >
                <span className="note-icon">▧</span>
                <span className="note-title">{note.title}</span>
              </button>
            ))}
          </div>
        </aside>
      ) : (
        <button type="button" className="sidebar-restore" onClick={() => setSidebarOpen(true)} title="Show Sidebar">
          ◨
        </button>
      )}

      <section className="workspace">
        <header className="editor-header">
          <div className="document-title">{document?.title ?? "Ephe"}</div>
          <div className="status-text">{status === "saving" ? "Saving..." : status === "loading" ? "Loading..." : ""}</div>
        </header>

        {error ? <div className="error-banner">{error}</div> : null}

        {document ? (
          <textarea
            className="editor"
            spellCheck={false}
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
        ) : (
          <div className="empty-state">
            <button type="button" className="primary-button" onClick={chooseVault}>
              Open Vault
            </button>
          </div>
        )}
      </section>

      {inspectorOpen ? (
        <aside className="inspector">
          <InspectorSection title="Outline">
            {document?.headings.length ? (
              document.headings.map((heading) => (
                <div key={heading.anchor} className="outline-row" style={{ paddingLeft: (heading.level - 1) * 10 }}>
                  {heading.text}
                </div>
              ))
            ) : (
              <p className="muted">No headings</p>
            )}
          </InspectorSection>

          <InspectorSection title="Backlinks">
            {document?.backlinks.length ? (
              document.backlinks.map((backlink) => (
                <button
                  type="button"
                  key={backlink.sourcePath}
                  className="inspector-link"
                  onClick={() => selectNote(backlink.sourcePath)}
                >
                  {backlink.sourceTitle}
                </button>
              ))
            ) : (
              <p className="muted">No backlinks</p>
            )}
          </InspectorSection>

          <InspectorSection title="Links">
            {document?.outgoingLinks.length ? (
              document.outgoingLinks.map((link, index) => (
                <div key={`${link.raw}-${index}`} className="link-row">
                  <span className={`link-kind ${link.kind}`}>{link.kind}</span>
                  <span>{link.alias ?? link.target}</span>
                </div>
              ))
            ) : (
              <p className="muted">No links</p>
            )}
          </InspectorSection>
        </aside>
      ) : null}
    </main>
  );
}

function InspectorSection(props: { title: string; children: ReactNode }) {
  return (
    <section className="inspector-section">
      <h2>{props.title}</h2>
      {props.children}
    </section>
  );
}

function basename(path: string) {
  return path.split(/[\\/]/).filter(Boolean).at(-1) ?? path;
}
