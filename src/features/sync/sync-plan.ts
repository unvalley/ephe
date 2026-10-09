export const SINGLE_FILE_NAME = "ephe.md";

export const multiFileName = (index: number): string => `ephe-${index + 1}.md`;

const pad = (value: number): string => String(value).padStart(2, "0");

// Avoids ":" so the name is valid on every filesystem a sync folder may live on.
export const conflictFileName = (fileName: string, now: Date, suffix: string): string => {
  const stem = fileName.replace(/\.md$/, "");
  const date = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const time = `${pad(now.getHours())}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
  return `${stem} (conflict ${date} ${time} ${suffix}).md`;
};

// The editor only ever holds "\n", so a file saved elsewhere with "\r\n" must
// not look like an edit. Nothing else is normalized: trailing blank lines are
// part of the document.
export const normalizeLineEndings = (text: string): string => text.replace(/\r\n?/g, "\n");

type SyncState = {
  /** What this browser holds. */
  local: string;
  /** What the file holds, or null when the file does not exist. */
  remote: string | null;
  /** What both sides held when they last agreed, or null when they never did. */
  base: string | null;
};

type SyncAction =
  | { type: "none" }
  /** Both sides already agree; only the base has to be recorded. */
  | { type: "settle" }
  /** Write the local content to the file. */
  | { type: "push" }
  /** Take the file's content. */
  | { type: "pull"; content: string }
  /** Both sides changed: the file wins and the local content is kept as a copy. */
  | { type: "conflict"; content: string };

export const planSync = ({ local, remote, base }: SyncState): SyncAction => {
  if (remote === null) {
    // The file was removed outside Ephe. Keep what this browser has and leave
    // the folder alone until the user edits the document again.
    if (local === base) return { type: "none" };
    if (base === null && local === "") return { type: "none" };
    return { type: "push" };
  }

  if (remote === local) return base === local ? { type: "none" } : { type: "settle" };
  if (local === base) return { type: "pull", content: remote };
  if (remote === base) return { type: "push" };

  // Both sides changed, or they never shared a base. An empty side has nothing to preserve.
  if (local === "") return { type: "pull", content: remote };
  if (base === null && remote === "") return { type: "push" };
  return { type: "conflict", content: remote };
};
