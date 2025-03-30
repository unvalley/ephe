# GitHub Integration

Ephe now supports displaying your assigned GitHub issues directly in your markdown files.

## How to Use

1. Add a section heading `## @GitHub/issues/assigned` to your markdown file
2. Press `Cmd+G` (Mac) or `Ctrl+G` (Windows/Linux) to fetch and display your assigned GitHub issues
3. Your assigned issues will be displayed as a task list below the heading

Example:

```markdown
## @GitHub/issues/assigned
```

After pressing `Cmd+G`, it will be populated with:

```markdown
## @GitHub/issues/assigned

- [ ] github.com/owner/repo/issues/123
- [ ] github.com/another-owner/another-repo/issues/456
```

## Current Limitations

- Only works with public repositories
- Requires manual refresh using `Cmd+G`
- Currently hardcoded to use username "unvalley"
- Does not support authentication for private repositories (yet)

## Future Enhancements

Future versions will include:
- Authentication for private repositories
- Automatic refresh
- Ability to specify different GitHub usernames
- Filter options for issues
- Update issue status directly from the editor

## Troubleshooting

If you're having issues with the GitHub integration:

1. Make sure your heading is exactly `## @GitHub/issues/assigned`
2. Check your internet connection
3. GitHub API has rate limits for unauthenticated requests, so you might need to wait if you hit those limits

For any bugs or feature requests, please submit an issue in the GitHub repository. 