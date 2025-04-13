# utils

Functions, components, hooks, constants, types, and other utilities that are used throughout the app.
Carefully consider if it should be in `/utils/**` or `/src/features/**`.

## Why `/utils` ?

For example, if `src/components` or `src/hooks` exists, you might put it there even though it is a component specialized for a certain feature. Use `/utils/**` as a recognition to prevent this.

If multiple features use the same utility, you should use `/utils/**`.