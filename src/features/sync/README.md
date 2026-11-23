# Folder sync

Keeps Ephe's documents identical across browsers on one machine by mirroring
them to Markdown files in a folder the user picks, using the
[File System Access API](https://developer.mozilla.org/en-US/docs/Web/API/File_System_API)
(Chromium-only; the menu entries are hidden when the API is unavailable).
No account and no server: every browser that links the same folder converges on
the same files. Put the folder inside iCloud Drive or Dropbox and the same
mechanism reaches other devices.

## What is synced

| Document                 | File                    |
| ------------------------ | ----------------------- |
| Single editor            | `ephe.md`               |
| Multi editor, documents 1–5 | `ephe-1.md` … `ephe-5.md` |

Files hold exactly the editor's text: UTF-8, no front matter, nothing trimmed.
Snapshots, task history and settings stay per browser.

## Files

- `sync-plan.ts` — pure decision logic: given what this browser holds, what the
  file holds, and what both last agreed on, what should happen.
- `sync-engine.ts` — applies a plan to one document. Depends only on small
  interfaces, so it is tested against an in-memory folder.
- `sync-folder.ts` — the only code that touches the file system: read, guarded
  write, conflict copy, picker and permission helpers.
- `sync-storage.ts` — the linked directory handle (IndexedDB) and the per-file
  bases (localStorage).
- `folder-sync.ts` — the controller: link state, permission, when to run a pass.
- `use-folder-sync.ts` — hooks for the menus and for `EditorPage`.

## How a pass decides

Each browser remembers, per file, the content it and the folder last agreed on
(the *base*). A pass reads the file and compares three values:

| This browser | File      | Result                                              |
| ------------ | --------- | --------------------------------------------------- |
| unchanged    | changed   | take the file's content                             |
| changed      | unchanged | write to the file                                   |
| changed      | changed   | the file wins; this browser's text is saved beside it as `ephe-N (conflict <date> <time> <id>).md` |
| any          | deleted   | keep this browser's text; the file is only written again after the next edit |

An empty side never causes a conflict copy, and no file is created for a
document that has always been empty. Linking a folder that already holds
different notes is the "both changed" row: the folder's notes show up in the
editor and this browser's notes are kept as conflict copies.

Passes run when a document changes, when the window regains focus, and every
two seconds while the tab is visible. Tabs of the same browser share one base
store and take turns through a Web Lock.

## Guarantees and their limits

- A file is replaced through a swap file, so readers see the old or the new
  content, never part of one.
- A write is skipped if the file changed since the pass read it. The API has no
  compare-and-swap, so two browsers writing within the same few milliseconds can
  still overwrite one another.
- Only a missing file reads as "no file". Any other read failure (a cloud
  placeholder that cannot be downloaded, a timeout) is reported and changes
  nothing.
- The base only advances after a write is known to have landed; a failed write
  is retried by the next pass.
- Losing the base store is safe: differing content then counts as a conflict.
- The editor saves its text 300 ms after a keystroke. While it holds text that
  has not been saved yet, incoming content for that document waits, so typing
  is never replaced mid-word.

## Permission

The browser forgets write access when its last Ephe tab closes, unless the user
chose "Allow on every visit". On the next visit the link is restored in a
`needs-permission` state and a toast offers **Reconnect**, since asking for
access needs a click. Edits made before reconnecting are reconciled like any
other change.
