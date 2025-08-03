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
   
### TypeScript

- Use type alias instead of interface

### Development Guidelines

1. **Performance Focus**: Minimize re-renders, we use React 19 and React Compiler
2. **Functional Design**: Prefer immutable data structures and pure functions (inspired by Rich Hickey's principles)
3. **Side Effects Isolation**: Keep side effects in custom hooks or effect handlers
4. **Keyboard-First**: All features should be accessible via keyboard shortcuts

### Philosophy & Design Principles

This codebase embraces principles from Rich Hickey and John Ousterhout:

#### Rich Hickey's Functional Programming Principles:
- **Simplicity over ease**: Choose simple solutions that compose well
- **Data orientation**: Treat data as immutable values, not objects with behavior
- **Pure functions**: Maximize referential transparency and minimize side effects
- **Explicit over implicit**: Make data flow and transformations visible
- **Accretion**: Grow software by adding capabilities, not by modifying existing code

#### John Ousterhout's Software Design Principles:
- **Deep modules**: Create powerful interfaces that hide complexity (see CodeMirror extensions)
- **Strategic programming**: Invest time upfront in good design to reduce future complexity
- **Information hiding**: Minimize dependencies between modules and expose minimal interfaces
- **Exception aggregation**: Handle errors at the highest appropriate level
- **Define errors out of existence**: Design APIs that make errors impossible or unlikely
- **Pull complexity downward**: Better to have complex implementation than complex interface
- **Together or apart**: Related functionality should be together; unrelated should be separate
- **Comments for why, not what**: Focus on design decisions and non-obvious behavior

### Important Patterns

1. **Custom Hooks**: Extensive use of hooks for reusable logic (see `src/utils/hooks/`)
2. **Storage Abstraction**: All localStorage access through `src/utils/storage/`
3. **Error Boundaries**: Wrap feature components to prevent cascade failures
4. **Theme System**: Coordinated theme updates across CodeMirror and Tailwind
