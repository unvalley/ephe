# Markdown Processing with @ts-stack/markdown

This directory contains a more efficient markdown processing implementation based on the @ts-stack/markdown library, a TypeScript port of the popular marked library.

## Key Features

1. **Efficient Markdown Parsing**: Uses a single parsing pass to efficiently process markdown content.
2. **Task List Support**: Custom renderer extensions for GitHub-style task lists.
3. **Heading Extraction**: Specialized TOC extraction with custom slugify implementation.
4. **Performance Improvements**: Eliminates multiple passes through the content by handling all operations in a single parse.

## Main Components

- `markdown-service.ts`: Core service that handles markdown processing and task counting
- `toc-parser.ts`: Specialized parser for efficiently extracting TOC items

## Usage

### Process Markdown Content

```typescript
import { markdownService } from "./markdown-service";

// Process content (returns HTML, task counts, and character count)
const { html, taskCount, charCount } = markdownService.processMarkdown(content);
```

### Count Tasks Only

```typescript
import { markdownService } from "./markdown-service";

// Get task counts without full HTML processing
const { open, closed } = markdownService.countTasks(content);
```

### Extract TOC Items

```typescript
import { parseToc } from "./toc-parser";

// Get TOC items with line numbers
const tocItems = parseToc(content);
```

## Benefits Over Previous Implementation

1. **Single Pass Processing**: Previously, the application used multiple regex passes over the content for tasks, headings, etc. Now all processing happens in a single efficient parse.
2. **Standardized Markdown**: Better compatibility with GitHub Flavored Markdown (GFM) specification.
3. **Extensible Renderer**: The custom renderer can be extended to support additional markdown features.
4. **Maintainable Code**: Cleaner separation of concerns with dedicated service classes.

## Performance Comparison

The previous implementation required multiple iterations over the content:
- One pass to count tasks
- Another pass for heading extraction
- Additional passes for other markdown features

The new implementation processes everything in a single pass, resulting in significant performance improvements, especially for large documents. 