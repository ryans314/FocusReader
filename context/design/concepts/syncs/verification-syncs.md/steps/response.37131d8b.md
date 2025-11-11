---
timestamp: 'Mon Nov 10 2025 17:48:09 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_174809.72774d18.md]]'
content_id: 37131d8b5bba540e40fd766c01c2f6d502792204f1478986d0323684b0740b17
---

# response:

You've found a great bug! My apologies for the repeated errors; that "Missing binding" error is a clear sign that the `where` clause isn't producing the variable the `then` clause expects. You are right to be persistent, as the cause is a subtle but important mismatch.

Let me repeat your prompt to ensure I'm addressing the right problem.

**Prompt:** I'm getting an error when I try to view my stats. The console output shows `[Requesting] Error processing request: Missing binding: Symbol(stats) in frame: [object Object]`. Please fix this.

***

### Analysis and Fix

The error `Missing binding: Symbol(stats)` tells us exactly what's wrong:

1. The synchronization `ViewStatsRequest` has a `then` clause that tries to use a variable named `stats`: `then: actions([Requesting.respond, { request, stats }])`.
2. This means the `where` clause *must* produce a frame that has a `stats` variable bound to it.
3. Let's look at the `where` clause: `frames = await frames.query(FocusStats._viewStats, { user }, { stats });`
4. This line tells the engine: "Call the `_viewStats` query and look for a property named `stats` in its results."
5. However, if we look at the `FocusStatsConcept.ts` file, the `_viewStats` query returns an array of objects with a property named `focusStats`, not `stats`: `return [{ focusStats: resultStats }];`

This mismatch is the root of the bug. The sync is looking for `stats` but the concept is providing `focusStats`.

The solution is to use **key aliasing** in the `where` clause. We need to tell the engine: "When you find the `focusStats` property, bind its value to a variable named `stats`."

The same error pattern exists in the other query-based syncs in this file, so I have fixed all of them to prevent similar bugs.

* For `ViewStatsRequest`, we map `focusStats` to `stats`.
* For `GetSessionsRequest`, we map `focusSession` to `sessions`.
* For `GetUserDetailsRequest`, we map `username` to `details`.

Here is the fully corrected `verification.sync.ts` file.

***
