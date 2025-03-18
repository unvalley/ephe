import type { TextDocument } from "./vscode-monaco";

export function buildToc(doc: TextDocument) {
  let toc: { level: number; text: string }[] = [];
  const lines = doc
    .getText()
    .replace(/^```[\W\w]+?^```/gm, "") // Remove code blocks
    .replace(/<!-- omit in (toc|TOC) -->/g, "&lt; omit in toc &gt;") // Escape magic comment
    .replace(/<!--[\W\w]+?-->/, "") // Remove comments
    .replace(/^---[\W\w]+?(\r?\n)---/, "") // Remove YAML front matter
    .split(/\r?\n/g);
  // Transform setext headings to ATX headings
  lines.forEach((lineText, i, arr) => {
    if (
      i < arr.length - 1 &&
      lineText.match(/^ {0,3}\S.*$/) &&
      arr[i + 1].match(/^ {0,3}(=+|-{2,}) *$/)
    ) {
      arr[i] = (arr[i + 1].includes("=") ? "# " : "## ") + lineText;
    }
  });
  toc = lines
    .filter((lineText) => {
      return (
        lineText.startsWith("#") &&
        lineText.includes("# ") &&
        !lineText.includes("&lt; omit in toc &gt;")
      );
    })
    .map((lineText) => {
      const matches = /^(#+) (.*)/.exec(lineText);
      if (!matches) {
        return { level: 0, text: "" }; // Provide a default value if no match
      }
      return {
        level: matches[1].length,
        text: matches[2].replace(/#+$/, "").trim(),
      };
    })
    .filter((item) => item.level > 0); // Filter out any invalid entries

  return toc;
}
