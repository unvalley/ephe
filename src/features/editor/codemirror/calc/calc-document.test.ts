import { describe, expect, test } from "vitest";
import { evaluateCalcDocument, formatCalcValue } from "./calc-document";

const evaluate = (text: string) => evaluateCalcDocument(text.split("\n"));

describe("evaluateCalcDocument", () => {
  test("shows results for expression lines", () => {
    const results = evaluate("12 * 4");
    expect(results).toEqual([{ index: 0, value: 48 }]);
  });

  test("skips plain text and bare numbers", () => {
    expect(evaluate("just some words")).toEqual([]);
    expect(evaluate("42")).toEqual([]);
    expect(evaluate("3.14")).toEqual([]);
  });

  test("a trailing = forces a result even for bare values", () => {
    const results = evaluate("42 =");
    expect(results).toEqual([{ index: 0, value: 42 }]);
  });

  test("assignments define reactive variables", () => {
    const results = evaluate(["price = 1200", "qty = 3", "price * qty"].join("\n"));
    expect(results).toEqual([{ index: 2, value: 3600 }]);
  });

  test("assignments with computed right-hand side show their value", () => {
    const results = evaluate(["base = 100", "total = base * 1.1"].join("\n"));
    expect(results).toEqual([{ index: 1, value: expect.closeTo(110) }]);
  });

  test("sum aggregates the block above, including plain-text amounts", () => {
    const doc = ["coffee 4.50", "bagel 3.25", "- [ ] tip 2", "sum"].join("\n");
    const results = evaluate(doc);
    expect(results).toEqual([{ index: 3, value: 9.75 }]);
  });

  test("average works and blank lines bound the block", () => {
    const doc = ["10", "20", "", "30", "40", "average"].join("\n");
    const results = evaluate(doc);
    expect(results).toEqual([{ index: 5, value: 35 }]);
  });

  test("sum ignores lines without numbers and has no result on empty blocks", () => {
    expect(evaluate(["no numbers here", "sum"].join("\n"))).toEqual([]);
    const results = evaluate(["5", "words only", "7", "total"].join("\n"));
    expect(results).toEqual([{ index: 3, value: 12 }]);
  });

  test("evaluates inside markdown list items and quotes", () => {
    const results = evaluate(["- 2 * 3", "> 10 / 2"].join("\n"));
    expect(results).toEqual([
      { index: 0, value: 6 },
      { index: 1, value: 5 },
    ]);
  });

  test("skips fenced code blocks", () => {
    const doc = ["```", "1 + 1", "```", "2 + 2"].join("\n");
    const results = evaluate(doc);
    expect(results).toEqual([{ index: 3, value: 4 }]);
  });

  test("skips date-like and time-like lines", () => {
    expect(evaluate("2026-07-04")).toEqual([]);
    expect(evaluate("meeting at 12:30")).toEqual([]);
    expect(evaluate("7/4/2026")).toEqual([]);
  });

  test("variables persist across blocks but sums do not cross blank lines", () => {
    const doc = ["x = 10", "", "x * 2"].join("\n");
    const results = evaluate(doc);
    expect(results).toEqual([{ index: 2, value: 20 }]);
  });

  test("aggregate lines do not feed later aggregates", () => {
    const doc = ["1", "2", "sum", "sum"].join("\n");
    const results = evaluate(doc);
    expect(results).toEqual([
      { index: 2, value: 3 },
      { index: 3, value: 3 },
    ]);
  });

  test("division by zero produces no result", () => {
    expect(evaluate("1 / 0")).toEqual([]);
  });
});

describe("formatCalcValue", () => {
  test("trims floating point noise", () => {
    expect(formatCalcValue(0.1 + 0.2)).toBe("0.3");
  });

  test("keeps small values", () => {
    expect(formatCalcValue(0.000125)).toBe("0.000125");
  });

  test("limits long decimals", () => {
    expect(formatCalcValue(100 / 3)).toBe("33.333333");
  });
});
