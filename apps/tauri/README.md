# Ephe Tauri

Experimental Tauri + React rewrite of the local-first Ephe Mac app.

Markdown files remain the source of truth. The Rust backend reads and writes
the selected vault folder directly; the React UI owns only transient view state.

## Commands

```sh
just tauri-dev
just tauri-check
just tauri-build
```

`just tauri-build` produces a macOS `.app` bundle under:

```text
apps/tauri/src-tauri/target/release/bundle/macos/Ephe Tauri.app
```

For faster local verification, the debug bundle command is:

```sh
pnpm --dir apps/tauri tauri build --debug --bundles app
```
