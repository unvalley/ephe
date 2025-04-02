/**
 * GitHub API service for fetching issues and other GitHub data
 */

export type GitHubIssue = {
  id: number;
  title: string;
  html_url: string;
  state: string;
  repository_url: string;
  repository_name?: string;
};

/**
 * Fetch issues assigned to a specific GitHub user
 * Currently only supports public repositories
 * @param github_user_id The GitHub user ID to fetch issues for
 * @returns Promise with the list of issues assigned to the user
 */
export const fetchAssignedIssues = async (github_user_id: string): Promise<GitHubIssue[]> => {
  try {
    const response = await fetch(`https://api.github.com/search/issues?q=assignee:${github_user_id}+state:open`);

    if (!response.ok) {
      throw new Error(`GitHub API error: ${response.status}`);
    }

    const data = await response.json();

    // Process the results to extract repository name from repository_url
    const issues: GitHubIssue[] = data.items.map((item: GitHubIssue) => {
      // Extract repository name from repository_url
      // Format: https://api.github.com/repos/owner/repo
      const repoUrl = item.repository_url;
      const repoName = repoUrl.split("/repos/")[1];

      return {
        ...item,
        repository_name: repoName,
      };
    });

    return issues;
  } catch (error) {
    console.error("Error fetching GitHub issues:", error);
    return [];
  }
};

/**
 * Generates markdown task list items from GitHub issues
 * @param issues List of GitHub issues
 * @returns Markdown string with task list items
 */
export const generateIssuesTaskList = (issues: GitHubIssue[]): string => {
  if (issues.length === 0) {
    return "No issues assigned.";
  }

  return issues
    .map((issue) => {
      // Remove https:// from the URL for cleaner display
      const displayUrl = issue.html_url.replace(/^https:\/\//, "");
      // Just display the URL without Markdown link formatting
      return `- [ ] ${displayUrl}`;
    })
    .join("\n");
};

/**
 * Fetches GitHub issues for a user and returns them as a markdown task list
 * @param username GitHub username to fetch issues for
 * @returns Promise with markdown text containing the task list
 */
export const fetchGitHubIssuesTaskList = async (github_user_id: string): Promise<string> => {
  try {
    const issues = await fetchAssignedIssues(github_user_id);
    return generateIssuesTaskList(issues);
  } catch (error) {
    console.error("Error fetching GitHub issues:", error);
    return "Error fetching GitHub issues.";
  }
};
