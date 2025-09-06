# Ephe VS Code Extension

Enhanced markdown editing with task list auto-completion and keyboard shortcuts, bringing the unique Ephe editing experience to VS Code.

## Features

### 📝 Task List Auto-completion
- Type `- [` + space → automatically completes to `- [ ] `
- Works with both `-` and `*` list markers
- Smart detection prevents duplicate checkbox syntax

### ⌨️ Keyboard Shortcuts
- **Cmd+Enter**: Toggle task completion (- [ ] ↔ - [x])
- **Cmd+↑**: Move task up
- **Cmd+↓**: Move task down
- **Enter**: Create new task items (enhanced list continuation)
- **Tab/Shift+Tab**: Smart indentation with nesting validation

### 🎯 Task Management
- Track completed tasks with timestamps
- Optional auto-flush mode to remove completed tasks
- Task history tracking

### 🎨 Markdown Formatting
- Basic markdown formatting support
- Consistent task list formatting
- Future: dprint WASM integration

## Installation

1. Open VS Code
2. Go to Extensions (Cmd+Shift+X)
3. Search for "Ephe"
4. Click Install

## Configuration

```json
{
  // Automatically remove completed tasks
  "ephe.autoFlushCompletedTasks": false,
  
  // Enable task list auto-completion
  "ephe.enableTaskAutoComplete": true,
  
  // Format markdown on save
  "ephe.enableFormatOnSave": false
}
```

## Usage

1. Open any markdown file
2. Start typing `- [` followed by a space to create a task
3. Use Cmd+Enter to toggle task completion
4. Use Cmd+↑/↓ to reorder tasks

## Development

```bash
# Install dependencies
pnpm install

# Compile
pnpm run compile

# Watch mode
pnpm run watch

# Run tests
pnpm test
```

## License

MIT