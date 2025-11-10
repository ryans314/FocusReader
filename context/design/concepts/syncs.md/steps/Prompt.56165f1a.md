---
timestamp: 'Mon Nov 10 2025 07:01:23 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_070123.4bb29015.md]]'
content_id: 56165f1a41854f07f1e50e713b3a9e80df2665fe69f62af6e61efcf3eab2892e
---

# Prompt: I get the following error for the following lines in the  HandleSubsequentCreateErrorAndRespond sync:

Lines:

```
      [Library.createLibrary, { user }, { error }],

      [FocusStats.initUser, { user }, { error }],

      [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, { error }],
```

Error (for the first line):

```
Type '((({ user }: { user: ID; }) => Promise<{ library?: ID | undefined; error?: string | undefined; }>) | { user: symbol; } | { error: symbol; })[]' is missing the following properties from type 'InstrumentedAction': apply, call, bind, prototype, and 5 more.deno-ts(2740)
```
