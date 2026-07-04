import { evaluateExpression } from "./expression";

/**
 * Document-level evaluation for the inline calculator (inspired by Antinote):
 * - Expression lines ("12 * 4") show their result inline.
 * - Assignment lines ("price = 1200") define reactive variables usable below.
 * - Keyword lines ("sum" / "total" / "avg" / "average") aggregate the
 *   blank-line-delimited block of lines directly above, picking up evaluated
 *   results and trailing numbers in plain-text lines ("coffee 4.50").
 */

export type CalcLineResult = {
  /** 0-based line index in the evaluated document. */
  index: number;
  value: number;
};

const AGGREGATE_PATTERN = /^(sum|total|avg|average)\s*[:=]?\s*$/i;
const ASSIGNMENT_PATTERN = /^([A-Za-z_][A-Za-z0-9_]*)\s*=(?!=)\s*(\S.*)$/;
const CODE_FENCE_PATTERN = /^\s*(```|~~~)/;
// Dates ("2026-07-04", "7/4") and clock times ("12:30") parse as arithmetic
// but never mean it — skip such lines entirely.
const DATE_OR_TIME_PATTERN = /\d{1,4}[-/.]\d{1,2}[-/.]\d{1,4}|\d{1,2}:\d{2}/;
// A widget is only shown when the line actually computes something.
const CONTAINS_OPERATOR_PATTERN = /[+\-*/%^(]/;
const BARE_NUMBER_PATTERN = /^[-+]?[$€£¥]?\d[\d,]*(\.\d+)?$/;
const NUMBER_IN_TEXT_PATTERN = /-?\d[\d,]*(?:\.\d+)?/g;
const QUOTE_PREFIX_PATTERN = /^(?:>\s*)+/;
const HEADING_PREFIX_PATTERN = /^#{1,6}\s+/;
const LIST_PREFIX_PATTERN = /^[-*+]\s+(?:\[[ xX]\]\s+)?/;
const ORDERED_LIST_PREFIX_PATTERN = /^\d+[.)]\s+/;

/** Removes leading markdown syntax so list items and quotes can hold math. */
const stripMarkdownPrefix = (line: string): string =>
  line
    .trim()
    .replace(QUOTE_PREFIX_PATTERN, "")
    .replace(HEADING_PREFIX_PATTERN, "")
    .replace(LIST_PREFIX_PATTERN, "")
    .replace(ORDERED_LIST_PREFIX_PATTERN, "")
    .trim();

/** Last number in a plain-text line ("coffee 4.50" → 4.5), or null. */
const extractTrailingNumber = (text: string): number | null => {
  const matches = text.match(NUMBER_IN_TEXT_PATTERN);
  if (!matches) return null;
  const value = Number.parseFloat(matches[matches.length - 1].replaceAll(",", ""));
  return Number.isFinite(value) ? value : null;
};

export const formatCalcValue = (value: number): string => {
  // Trim float noise (0.1 + 0.2) without collapsing small values to 0.
  const rounded = Math.abs(value) >= 1 ? Math.round(value * 1e6) / 1e6 : Number(value.toPrecision(6));
  return String(rounded);
};

export const evaluateCalcDocument = (lines: readonly string[]): CalcLineResult[] => {
  const variables = new Map<string, number>();
  const results: CalcLineResult[] = [];
  // Running total of the current blank-line-delimited block, read by
  // aggregate keyword lines. Aggregates themselves never contribute.
  let blockSum = 0;
  let blockCount = 0;
  let insideCodeFence = false;

  const pushResult = (index: number, value: number) => {
    if (!Number.isFinite(value)) return;
    results.push({ index, value });
  };

  const contribute = (value: number | null) => {
    if (value === null) return;
    blockSum += value;
    blockCount++;
  };

  lines.forEach((rawLine, index) => {
    if (rawLine.trim().length === 0) {
      blockSum = 0;
      blockCount = 0;
      return;
    }
    if (CODE_FENCE_PATTERN.test(rawLine)) {
      insideCodeFence = !insideCodeFence;
      return;
    }
    if (insideCodeFence) return;

    const text = stripMarkdownPrefix(rawLine);
    if (text.length === 0 || DATE_OR_TIME_PATTERN.test(text)) return;

    const aggregate = text.match(AGGREGATE_PATTERN);
    if (aggregate) {
      if (blockCount === 0) return;
      const keyword = aggregate[1].toLowerCase();
      pushResult(index, keyword === "avg" || keyword === "average" ? blockSum / blockCount : blockSum);
      return;
    }

    const assignment = text.match(ASSIGNMENT_PATTERN);
    if (assignment) {
      const [, name, rhs] = assignment;
      const value = evaluateExpression(rhs, variables);
      if (value === null) return;
      variables.set(name, value);
      contribute(value);
      // "x = 5" needs no echo; "x = 5 * 3" does.
      if (!BARE_NUMBER_PATTERN.test(rhs.trim())) pushResult(index, value);
      return;
    }

    // A trailing "=" is an explicit request: always show the result.
    const explicit = text.endsWith("=");
    const expressionText = explicit ? text.slice(0, -1).trimEnd() : text;
    if (expressionText.length === 0) return;

    const value = evaluateExpression(expressionText, variables);
    if (value === null) {
      // Not math, but a plain-text line like "coffee 4.50" still feeds `sum`.
      contribute(extractTrailingNumber(text));
      return;
    }
    contribute(value);
    if (explicit || (CONTAINS_OPERATOR_PATTERN.test(expressionText) && !BARE_NUMBER_PATTERN.test(expressionText))) {
      pushResult(index, value);
    }
  });

  return results;
};
