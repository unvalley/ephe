import { describe, test, expect } from "vitest";
import { isClosedTaskLine, isOpenTaskLine, isTaskLine, isRegularListLine, isEmptyListLine } from "./task-list-utils";

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

describe("isRegularListLine", () => {
  test("should detect regular list items with dash", () => {
    expect(isRegularListLine("- item")).toBe(true);
    expect(isRegularListLine("  - indented item")).toBe(true);
    expect(isRegularListLine("- ")).toBe(true); // Empty list item is still a list line
  });

  test("should detect regular list items with asterisk", () => {
    expect(isRegularListLine("* item")).toBe(true);
    expect(isRegularListLine("  * indented item")).toBe(true);
    expect(isRegularListLine("* ")).toBe(true);
  });

  test("should detect regular list items with plus", () => {
    expect(isRegularListLine("+ item")).toBe(true);
    expect(isRegularListLine("  + indented item")).toBe(true);
    expect(isRegularListLine("+ ")).toBe(true);
  });

  test("should not detect task list items", () => {
    expect(isRegularListLine("- [ ] task")).toBe(false);
    expect(isRegularListLine("- [x] completed task")).toBe(false);
    expect(isRegularListLine("* [ ] task")).toBe(false);
    expect(isRegularListLine("  - [ ] indented task")).toBe(false);
  });

  test("should not detect non-list content", () => {
    expect(isRegularListLine("regular text")).toBe(false);
    expect(isRegularListLine("")).toBe(false);
    expect(isRegularListLine("  regular text")).toBe(false);
  });
});

describe("isEmptyListLine", () => {
  test("should detect empty list items", () => {
    expect(isEmptyListLine("- ")).toBe(true);
    expect(isEmptyListLine("* ")).toBe(true);
    expect(isEmptyListLine("+ ")).toBe(true);
    expect(isEmptyListLine("  - ")).toBe(true);
    expect(isEmptyListLine("  * ")).toBe(true);
    expect(isEmptyListLine("-")).toBe(true); // Without trailing space
    expect(isEmptyListLine("*")).toBe(true);
  });

  test("should not detect list items with content", () => {
    expect(isEmptyListLine("- item")).toBe(false);
    expect(isEmptyListLine("* content")).toBe(false);
    expect(isEmptyListLine("+ text")).toBe(false);
    expect(isEmptyListLine("  - content")).toBe(false);
  });

  test("should not detect task list items", () => {
    expect(isEmptyListLine("- [ ]")).toBe(false);
    expect(isEmptyListLine("- [x]")).toBe(false);
    expect(isEmptyListLine("* [ ]")).toBe(false);
  });

  test("should not detect non-list content", () => {
    expect(isEmptyListLine("")).toBe(false);
    expect(isEmptyListLine("text")).toBe(false);
    expect(isEmptyListLine("  text")).toBe(false);
  });
});
