---
timestamp: 'Mon Nov 10 2025 07:04:56 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_070456.0e8cc59b.md]]'
content_id: 54610aa2e465c3fc4637580a5edcc5ccc24153cb0497314fd9768d855701e066
---

# Prompt: I get the following error for the following lines in the  HandleSubsequentCreateErrorAndRespond sync:

Lines with errors on it:

```
[

      [Library.createLibrary, { user }, { error }],

      [FocusStats.initUser, { user }, { error }],

      [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, { error }],

    ],
```

Error on the createLibrary line

```
Type '((({ user }: { user: ID; }) => Promise<{ library?: ID | undefined; error?: string | undefined; }>) | { user: symbol; } | { error: symbol; })[]' is missing the following properties from type 'InstrumentedAction': apply, call, bind, prototype, and 5 more.deno-ts(2740)
```

Error on the initUser line:

```
Type '(((input: { user: ID; }) => Promise<{ focusStats: ID; } | { error: string; }>) | { user: symbol; } | { error: symbol; })[]' is not assignable to type 'Mapping'.  
Index signature for type 'string' is missing in type '(((input: { user: ID; }) => Promise<{ focusStats: ID; } | { error: string; }>) | { user: symbol; } | { error: symbol; })[]'.deno-ts(2322)
```

Error on the createUserSettings line:

```
Type '((({ font, fontSize, lineHeight, user }: { font: string; fontSize: number; lineHeight: number; user: ID; }) => Promise<{ settings: ID; } | { error: string; }>) | { font: symbol; fontSize: symbol; lineHeight: symbol; user: symbol; } | { ...; })[]' is not assignable to type 'Mapping'.  
Index signature for type 'string' is missing in type '((({ font, fontSize, lineHeight, user }: { font: string; fontSize: number; lineHeight: number; user: ID; }) => Promise<{ settings: ID; } | { error: string; }>) | { font: symbol; fontSize: symbol; lineHeight: symbol; user: symbol; } | { ...; })[]'.deno-ts(2322)
```
