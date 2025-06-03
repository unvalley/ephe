# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Essential Commands

### Development
```bash
pnpm dev              # Start dev server on port 3000
pnpm preview          # Preview production build
```

### Testing
```bash
pnpm test             # Run unit tests
pnpm test:e2e         # Run end-to-end tests with Playwright
pnpm test:unit:coverage  # Run tests with coverage report
```

### Code Quality
```bash
pnpm lint             # Run both Biome and ESLint
pnpm lint:biome:write # Auto-fix with Biome
pnpm lint:eslint:fix  # Auto-fix with ESLint
pnpm format           # Format code with Biome
```

### Build
```bash
pnpm build            # Production build (TypeScript check + Vite build)
```

## Architecture Overview

### Feature-Based Organization
The codebase follows a feature-based structure under `src/features/`:
- **editor/**: Core CodeMirror 6 integration with custom extensions for task lists, URL clicking, and markdown formatting
- **snapshots/**: Persistent storage system for saving work snapshots
- **history/**: UI for viewing and restoring past snapshots
- **integration/**: External service integrations (GitHub API)

### Key Technical Decisions

1. **Editor Core**: CodeMirror 6 with custom extensions for:
   - Task list auto-completion (`- [ ]` syntax)
   - Keyboard shortcuts (Cmd+Enter to toggle tasks)
   - URL click handling
   - Theme synchronization

2. **State Management**: Jotai atoms for global state, with localStorage persistence for:
   - Editor content
   - Theme preferences
   - Paper mode settings
   - Editor width

3. **Markdown Formatting**: dprint WASM module loaded asynchronously for Cmd+S formatting

4. **Testing Strategy**:
   - `.test.ts` files run in Node environment
   - `.browser.test.ts` files run in Playwright for DOM-dependent tests
   - E2E tests verify critical user workflows

### Development Guidelines

1. **Performance Focus**: Minimize re-renders, use React.memo and useMemo appropriately
2. **Functional Design**: Prefer immutable data structures and pure functions
3. **Side Effects Isolation**: Keep side effects in custom hooks or effect handlers
4. **Keyboard-First**: All features should be accessible via keyboard shortcuts

### Important Patterns

1. **Custom Hooks**: Extensive use of hooks for reusable logic (see `src/utils/hooks/`)
2. **Storage Abstraction**: All localStorage access through `src/utils/storage/`
3. **Error Boundaries**: Wrap feature components to prevent cascade failures
4. **Theme System**: Coordinated theme updates across CodeMirror and Tailwind