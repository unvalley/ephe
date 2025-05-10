import { describe, test, expect } from "vitest";
import { isClosedTaskLine, isOpenTaskLine, isTaskLine } from "./task-list-utils";

describe("isTaskLine", () => {
  test("identifies task list lines correctly", () => {
    expect(isTaskLine("- [ ] Task")).toBe(true);
    expect(isTaskLine("- [x] Task")).toBe(true);
    expect(isTaskLine("- [X] Task")).toBe(true);
    expect(isTaskLine("  - [ ] Indented task")).toBe(true);
    expect(isTaskLine("* [ ] Task")).toBe(true);
    expect(isTaskLine("* [x] Task")).toBe(true);
    expect(isTaskLine("* [X] Task")).toBe(true);

    expect(isTaskLine("Not a task")).toBe(false);
    expect(isTaskLine("- Not a task")).toBe(false);
  });
});

describe("isClosedTaskLine", () => {
  test("identifies closed tasks correctly", () => {
    expect(isClosedTaskLine("- [x] Task")).toBe(true);
    expect(isClosedTaskLine("- [X] Task")).toBe(true);
    expect(isClosedTaskLine("  - [x] Indented task")).toBe(true);
    expect(isClosedTaskLine("* [x] Task")).toBe(true);
    expect(isClosedTaskLine("* [X] Task")).toBe(true);

    expect(isClosedTaskLine("- [ ] Unchecked task")).toBe(false);
    expect(isClosedTaskLine("Not a task")).toBe(false);
  });
});

describe("isOpenTaskLine", () => {
  test("identifies open tasks correctly", () => {
    expect(isOpenTaskLine("- [ ] Task")).toBe(true);
    expect(isOpenTaskLine("  - [ ] Indented task")).toBe(true);
    expect(isOpenTaskLine("* [ ] Task")).toBe(true);

    expect(isOpenTaskLine("- [x] Checked task")).toBe(false);
    expect(isOpenTaskLine("- [X] Checked task")).toBe(false);
    expect(isOpenTaskLine("Not a task")).toBe(false);
  });
});
