import { describe, it, expect } from "vitest";
import { generateIssuesTaskList } from "./github-api";

describe("GitHub API", () => {
    it("generateIssuesTaskList", () => {
        const issues = [
            {
                id: 1,
                title: "Issue 1",
                html_url: "https://github.com/unvalley/test/issues/1",
                state: "open",
                repository_url: "https://github.com/unvalley/test",
            },
            {
                id: 2,
                title: "Issue 2",
                html_url: "https://github.com/unvalley/test/issues/2",
                state: "open",
                repository_url: "https://github.com/unvalley/test",
            }
        ]
        const taskList = generateIssuesTaskList(issues);

        expect(taskList).toBeDefined();
        expect(taskList).toContain("- [ ] github.com/unvalley/test/issues/1");
        expect(taskList).toContain("- [ ] github.com/unvalley/test/issues/2");
    })
});
