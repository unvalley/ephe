import { describe, expect, test } from "vitest";
import { evaluateExpression } from "./expression";

describe("evaluateExpression", () => {
  test("evaluates basic arithmetic", () => {
    expect(evaluateExpression("1 + 2")).toBe(3);
    expect(evaluateExpression("10 - 4")).toBe(6);
    expect(evaluateExpression("6 * 7")).toBe(42);
    expect(evaluateExpression("15 / 4")).toBe(3.75);
    expect(evaluateExpression("10 % 3")).toBe(1);
  });

  test("respects operator precedence", () => {
    expect(evaluateExpression("2 + 3 * 4")).toBe(14);
    expect(evaluateExpression("(2 + 3) * 4")).toBe(20);
    expect(evaluateExpression("2 * 3 + 4 * 5")).toBe(26);
  });

  test("exponent is right-associative and binds tighter than unary", () => {
    expect(evaluateExpression("2 ^ 3")).toBe(8);
    expect(evaluateExpression("2 ^ 3 ^ 2")).toBe(512);
    expect(evaluateExpression("-2 ^ 2")).toBe(-4);
  });

  test("handles unary signs", () => {
    expect(evaluateExpression("-5 + 10")).toBe(5);
    expect(evaluateExpression("--5")).toBe(5);
    expect(evaluateExpression("+5")).toBe(5);
  });

  test("supports functions", () => {
    expect(evaluateExpression("sqrt(16)")).toBe(4);
    expect(evaluateExpression("abs(-3)")).toBe(3);
    expect(evaluateExpression("round(2.6)")).toBe(3);
    expect(evaluateExpression("floor(2.6)")).toBe(2);
    expect(evaluateExpression("ceil(2.1)")).toBe(3);
    expect(evaluateExpression("min(3, 1, 2)")).toBe(1);
    expect(evaluateExpression("max(3, 1, 2)")).toBe(3);
  });

  test("supports constants", () => {
    expect(evaluateExpression("pi")).toBeCloseTo(Math.PI);
    expect(evaluateExpression("e ^ 2")).toBeCloseTo(Math.E ** 2);
  });

  test("resolves variables", () => {
    const variables = new Map([
      ["price", 1200],
      ["qty", 3],
    ]);
    expect(evaluateExpression("price * qty", variables)).toBe(3600);
  });

  test("user variables shadow constants", () => {
    expect(evaluateExpression("e + 1", new Map([["e", 10]]))).toBe(11);
  });

  test("accepts currency symbols and grouped thousands", () => {
    expect(evaluateExpression("$1,200 * 3")).toBe(3600);
    expect(evaluateExpression("¥1,000 + ¥500")).toBe(1500);
  });

  test("keeps comma as argument separator when spaced", () => {
    expect(evaluateExpression("min(1, 200)")).toBe(1);
    // Without a space the thousands-group reading wins: min(1200).
    expect(evaluateExpression("min(1,200)")).toBe(1200);
  });

  test("returns null for invalid input", () => {
    expect(evaluateExpression("")).toBeNull();
    expect(evaluateExpression("hello world")).toBeNull();
    expect(evaluateExpression("1 +")).toBeNull();
    expect(evaluateExpression("(1 + 2")).toBeNull();
    expect(evaluateExpression("1 + unknown")).toBeNull();
    expect(evaluateExpression("2 items + 3")).toBeNull();
  });

  test("returns null for non-finite results", () => {
    expect(evaluateExpression("1 / 0")).toBeNull();
    expect(evaluateExpression("0 / 0")).toBeNull();
  });
});
