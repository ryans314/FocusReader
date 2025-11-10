---
timestamp: 'Mon Nov 10 2025 16:17:07 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_161707.f11c2df3.md]]'
content_id: 9930e89c0cfbb9556c10b658a96769470cd3d6519803b8c1b4a5f24aacfbe012
---

# Prompt: it seems to have fixed that bug, but there's a different bug (that's existed for a while): At the start of the then statement on EndFocusOnClose, `then` is highlighted with the error: `Type '(frame: any) => (((input: { focusSession: ID; }) => Promise<{ focusSession: ID; } | { error: string; }>) | { focusSession: ID; })[][]' is not assignable to type 'ActionPattern[]'.deno-ts(2322) types.ts(22, 3): The expected type comes from property 'then' which is declared here on type 'SyncDeclaration'` Similarly, `(frame)` is highlighted with the error: `Parameter 'frame' implicitly has an 'any' type.deno-ts(7006)`

\`
