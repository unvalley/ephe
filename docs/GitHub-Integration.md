# GitHub Integration

Ephe now supports displaying your assigned GitHub issues directly in your markdown files.

## How to Use

1. Press `Cmd+K` (Mac) or `Ctrl+K` (Windows/Linux) to open the command menu
2. Select "Insert GitHub Issues" from the menu
3. Enter the GitHub username when prompted (defaults to "unvalley")
4. Your assigned GitHub issues will be inserted at the cursor position as a task list

Example of inserted issues:

```markdown
- [ ] github.com/owner/repo/issues/123
- [ ] github.com/another-owner/another-repo/issues/456
```

## Current Limitations

- Only works with public repositories
- Does not support authentication for private repositories (yet)

## Future Enhancements

Future versions will include:
- Authentication for private repositories
- Filter options for issues
- Update issue status directly from the editor
- More integrations with other services

## Troubleshooting

If you're having issues with the GitHub integration:

1. Make sure your cursor is positioned where you want the issues to be inserted
2. Check your internet connection
3. GitHub API has rate limits for unauthenticated requests, so you might need to wait if you hit those limits

For any bugs or feature requests, please submit an issue in the GitHub repository. 