import { EditorState } from "@codemirror/state";
import { describe, expect, it } from "vitest";
import { isPersistedEdit } from "./persisted-edit";

const state = EditorState.create({ doc: "- [ ] a\n- [ ] b" });
const change = { from: 0, insert: "x" };

describe("isPersistedEdit", () => {
  it.each(["input.type", "delete.backward", "undo", "redo", "move.task.up", "indent.more"])(
    "saves a change made by the user (%s)",
    (userEvent) => {
      expect(isPersistedEdit(state.update({ changes: change, userEvent }))).toBe(true);
    },
  );

  it("skips a change the app made itself", () => {
    expect(isPersistedEdit(state.update({ changes: change }))).toBe(false);
  });

  it("skips a user event that does not change the document", () => {
    expect(isPersistedEdit(state.update({ selection: { anchor: 3 }, userEvent: "select" }))).toBe(false);
  });
});
