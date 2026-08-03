# Document Picture-in-Picture

Lets the user pop the editor out into an always-on-top floating window using the
[Document Picture-in-Picture API](https://developer.mozilla.org/en-US/docs/Web/API/Document_Picture-in-Picture_API)
(Chromium-only; the Float button is hidden when the API is unavailable).

## Files

- `document-picture-in-picture.ts` — pure DOM helpers with no React or app-state
  dependencies: feature detection, style copying, and PiP document setup.
- `use-document-picture-in-picture.ts` — React hook that owns the PiP lifecycle
  (open / appearance sync / close / unmount cleanup).
- Consumed by `src/page/editor-page.tsx`.

## Core design: move the DOM, not the React tree

The editor is never re-rendered into the PiP window. Instead, `EditorPage`
creates a plain `div` (`editorSurface`) outside the React tree and renders the
CodeMirror editor into it via `createPortal`. Entering and leaving PiP is then
just re-parenting that one element:

```
main window                          PiP window
┌─────────────────────┐              ┌─────────────────────┐
│ editorSlot          │   append     │ <main> root         │
│  └─ editorSurface ──┼─────────────▶│  └─ editorSurface   │
│      └─ CodeMirror  │◀─────────────┼─      (same node)   │
└─────────────────────┘   append     └─────────────────────┘
                        (on close)
```

From React's point of view the portal target never changes, so moving the
surface between windows causes no remount and no re-render. The CodeMirror
instance — document, selection, undo history — survives the move untouched.

The one thing CodeMirror must be told is which document it now lives in:
`editorView.setRoot(targetDocument)` after every move, otherwise focus handling
and geometry measurement keep pointing at the old document.

## Session model

While PiP is open, everything tied to that window lives in a single
`sessionRef: { window, root, dispose }`:

- `window` / `root` — the PiP window and the `<main>` element hosting the editor.
- `dispose()` — a closure that unregisters exactly what `open` registered
  (the focus listener and the theme `MutationObserver`). Keeping registration
  and teardown in one place is the point; nothing else may add session-scoped
  listeners without also extending `dispose`.

`sessionRef.current !== null` ⇔ a PiP session exists. React state
(`isPictureInPicture`) mirrors this only for rendering.

## Open flow (`openPictureInPicture`)

1. Guards: API unsupported → no-op; `requestWindow` already in flight
   (`isOpeningRef`) → no-op; window already open → just focus it.
2. `requestWindow(...)` — async, and only allowed from a user gesture.
3. `preparePictureInPictureDocument(document, pipDocument)` — the PiP window
   starts as a blank document, so this sets the title and viewport meta, copies
   stylesheets from the main document (`link[rel~="stylesheet"]` for production
   builds, `style[data-vite-dev-id]` for Vite dev), and appends the `<main>`
   root. Without the style copy the editor renders unstyled.
4. Register the session-scoped listeners, build `sessionRef`.
5. `attachEditorTo(root, pipDocument)` — move the surface, `setRoot`,
   `requestMeasure`.
6. Register `pagehide` → `returnEditorToMainWindow` with `{ once: true }`.

On failure the `catch` block closes the window if it was created (the window is
held in a local variable precisely so a failure mid-setup cannot leak it),
restores the editor, and shows a toast.

## Appearance sync

The PiP window is a separate document, so theme and paper-mode changes do not
propagate on their own. Two paths converge on `syncAppearance`, which copies the
`<html>` class list and sets the root's paper-mode class:

- Theme toggle → main `<html>` class mutates → `MutationObserver` fires.
- Paper mode change → `paperModeClass` prop changes → effect re-runs.

The observer calls through `syncAppearanceRef` so it always sees the latest
callback. Capturing `syncAppearance` directly at open time would freeze the
`paperModeClass` from that moment (change paper mode while floating, then
toggle the theme → the observer would revert to the stale class).

## Close flow — all roads lead to `pagehide`

`closePictureInPicture` normally just calls `session.window.close()`. The actual
restore work happens in `returnEditorToMainWindow`, triggered by the `pagehide`
listener. This makes the user clicking the OS close button and the app closing
programmatically take the identical path. The only direct call is the fallback
for a window that is already gone.

`returnEditorToMainWindow` is `open` in reverse: `dispose()`, move the surface
back into the editor slot with `setRoot(document)`, clear state, refocus the
main window, then focus the editor inside `requestAnimationFrame` (the surface
is not reliably focusable in the same frame as the DOM move).

`pagehide` also fires when the floating window reloads (e.g. an extension's
reload command). The handler closes the window outright, so a reload ends the
session cleanly instead of leaving an empty floating window behind.

## Unmount safety net

The `useLayoutEffect` cleanup handles `EditorPage` unmounting (e.g. route
change) while PiP is open: dispose the session, pull the editor back, and close
the orphaned window. Without it the PiP window and the editor DOM would outlive
the page.
