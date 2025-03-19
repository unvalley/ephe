import type { TextDocument } from "./vscode-monaco";
import { slugify } from "./util";

export type TocEntry = {
  level: number;
  text: string;
  slug: string;
  line: number;
};

/**
 * Build a table of contents from a markdown document
 */
export const buildToc = (document: TextDocument): TocEntry[] => {
  const toc: TocEntry[] = [];
  const lineCount = document.lineCount;

  for (let i = 0; i < lineCount; i++) {
    const lineText = document.lineAt(i).text;
    const match = lineText.match(/^(#{1,6})\s+(.+)$/);

    if (match) {
      const level = match[1].length;
      const text = match[2].trim();
      const slug = slugify(text);

      toc.push({
        level,
        text,
        slug,
        line: i,
      });
    }
  }

  return toc;
};
