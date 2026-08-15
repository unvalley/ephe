import type { PaperMode } from "../../../utils/hooks/use-paper-mode";

/**
 * The metrics the editor lays its text out with.
 *
 * The paper pattern is derived from these rather than chosen independently, so
 * a ruling can never drift away from the text: every cell is a whole fraction
 * of a line box, and the pattern's origin is the top-left corner of the first
 * line.
 */
export const EDITOR_LAYOUT = {
  fontSizePx: 16,
  // A length rather than a ratio, applied to every line including headings, so
  // a line box is always exactly one row of paper. A ratio would make headings
  // taller than a row and push every line after them off the ruling.
  lineHeightPx: 26,
  paddingXPx: 20,
  paddingYPx: 60,
  maxWidthPx: 680,
} as const;

type Pattern = {
  cellPx: number;
  /** Distance from the tile's origin to the ink it draws. */
  inkOffsetPx: number;
  color: { light: string; dark: string };
  image: (color: string) => string;
};

const PATTERNS: Record<Exclude<PaperMode, "normal">, Pattern> = {
  graph: {
    // Half a line box: a ruling on every line boundary plus one through the
    // middle, which keeps the fine squares graph paper is supposed to have.
    cellPx: EDITOR_LAYOUT.lineHeightPx / 2,
    // Gradients start their ruling at the tile's edge.
    inkOffsetPx: 0,
    color: { light: "rgba(210, 210, 210, 0.3)", dark: "rgba(80, 80, 80, 0.3)" },
    image: (color) =>
      `linear-gradient(${color} 1px, transparent 1px), linear-gradient(to right, ${color} 1px, transparent 1px)`,
  },
  dots: {
    cellPx: EDITOR_LAYOUT.lineHeightPx,
    // A radial gradient centres its dot in the tile.
    inkOffsetPx: EDITOR_LAYOUT.lineHeightPx / 2,
    color: { light: "rgba(210, 210, 210, 0.5)", dark: "rgba(80, 80, 80, 0.5)" },
    image: (color) => `radial-gradient(${color} 1px, transparent 1px)`,
  },
};

/**
 * Places the pattern's ink on the top-left corner of the first line of text.
 *
 * `background-position` percentages resolve against (area - tile) instead of
 * the area alone, so a bare `50%` lands a tile half a cell left of centre; the
 * `cellPx / 2` term puts it back. `max()` covers viewports narrower than the
 * text column, where the text stops being centred and sits on its padding.
 */
const patternOrigin = (pattern: Pattern, isWideMode: boolean): string => {
  const { maxWidthPx, paddingXPx, paddingYPx } = EDITOR_LAYOUT;
  const top = `${paddingYPx - pattern.inkOffsetPx}px`;
  const left = `${paddingXPx - pattern.inkOffsetPx}px`;
  if (isWideMode) return `${left} ${top}`;
  const fromCenter = maxWidthPx / 2 - paddingXPx - pattern.cellPx / 2 + pattern.inkOffsetPx;
  return `max(${left}, calc(50% - ${fromCenter}px)) ${top}`;
};

/**
 * The paper for the editor's scroller. The page behind it only carries the
 * paper's colour; the pattern lives here because this is the only element that
 * knows where the text actually is.
 */
export const paperBackgroundStyle = (
  paperMode: PaperMode,
  isDarkMode: boolean,
  isWideMode: boolean,
): Record<string, string> => {
  if (paperMode === "normal") return {};

  const pattern = PATTERNS[paperMode];
  return {
    backgroundImage: pattern.image(isDarkMode ? pattern.color.dark : pattern.color.light),
    backgroundSize: `${pattern.cellPx}px ${pattern.cellPx}px`,
    backgroundPosition: patternOrigin(pattern, isWideMode),
    // Anchors the pattern to the text instead of the viewport, so the two stay
    // aligned while scrolling.
    backgroundAttachment: "local",
  };
};
