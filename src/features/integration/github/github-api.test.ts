import { describe, it, expect } from "vitest";
import { generateIssuesTaskList, type GitHubIssue } from "./github-api";

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
      },
    ];
    const taskList = generateIssuesTaskList(issues);

    expect(taskList).toBeDefined();
    expect(taskList).toContain("- [ ] github.com/unvalley/test/issues/1");
    expect(taskList).toContain("- [ ] github.com/unvalley/test/issues/2");
  });

  const baseIssue: Omit<GitHubIssue, "id" | "html_url"> = {
    title: "Test Issue",
    state: "open",
    repository_url: "https://api.github.com/repos/owner/repo",
    repository_name: "owner/repo",
  };

  it("should return 'No issues assigned.' when the issues array is empty", () => {
    const issues: GitHubIssue[] = [];
    const taskList = generateIssuesTaskList(issues);
    expect(taskList).toBe("No issues assigned.");
  });

  it("should generate a task list for a single issue", () => {
    const issues: GitHubIssue[] = [
      {
        ...baseIssue,
        id: 1,
        html_url: "https://github.com/owner/repo/issues/1",
      },
    ];
    const taskList = generateIssuesTaskList(issues);
    expect(taskList).toBe("- [ ] github.com/owner/repo/issues/1");
  });

  it("should generate a task list for multiple issues, removing https:// and joining with newline", () => {
    const issues: GitHubIssue[] = [
      {
        ...baseIssue,
        id: 1,
        html_url: "https://github.com/owner/repo/issues/1",
      },
      {
        ...baseIssue,
        id: 2,
        html_url: "https://github.com/another/repo/issues/2",
      },
    ];
    const taskList = generateIssuesTaskList(issues);
    const expectedOutput = ["- [ ] github.com/owner/repo/issues/1", "- [ ] github.com/another/repo/issues/2"].join(
      "\n",
    );
    expect(taskList).toBe(expectedOutput);
  });
});
