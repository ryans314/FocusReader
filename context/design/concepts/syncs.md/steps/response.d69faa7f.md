---
timestamp: 'Mon Nov 10 2025 07:05:06 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_070506.56ade2f0.md]]'
content_id: d69faa7ff7ab1dd5a35b5fac277983f55c9a70ff394438e19d362772ad538204
---

# response:

You've hit a common pattern-matching limitation when trying to express "OR" logic directly within the `when` clause using the provided DSL.

The `actions()` helper expects a flat list of action patterns, where each pattern represents an action that *must* have occurred (a conjunction). It doesn't support nested arrays to mean "this action OR that action".

To handle errors from *any one* of the subsequent creation steps, you need to create **separate synchronizations** for each potential failure point.

Here's how you would refactor `HandleSubsequentCreateErrorAndRespond` into three distinct synchronizations, one for each possible failure:

```typescript
// file: src/syncs/user_management.sync.ts

// These imports help you declare synchronizations and access concept instances
import { actions, Sync } from "@engine";
import {
  Requesting,
  Profile,
  Library,
  FocusStats,
  TextSettings,
} from "@concepts";

// ... (previous syncs: CreateUserRequest, HandleProfileCreateSuccessAndContinue, HandleProfileCreateErrorAndRespond, HandleAllSubsequentCreatesSuccessAndRespond) ...

/**
 * Synchronization: HandleLibraryCreateErrorAndRespond
 * Purpose: Catches errors from Library.createLibrary and responds to the original request.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND Library.createLibrary failed.
 * Then: Responds to the original request with the error message from Library.createLibrary.
 */
export const HandleLibraryCreateErrorAndRespond: Sync = (
  { request, user, username, password, font, fontSize, lineHeight, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Profile creation must have succeeded
    [Library.createLibrary, { user }, { error }], // Library creation failed
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Synchronization: HandleFocusStatsInitErrorAndRespond
 * Purpose: Catches errors from FocusStats.initUser and responds to the original request.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND FocusStats.initUser failed.
 * Then: Responds to the original request with the error message from FocusStats.initUser.
 */
export const HandleFocusStatsInitErrorAndRespond: Sync = (
  { request, user, username, password, font, fontSize, lineHeight, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Profile creation must have succeeded
    [FocusStats.initUser, { user }, { error }], // FocusStats initialization failed
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Synchronization: HandleTextSettingsCreateErrorAndRespond
 * Purpose: Catches errors from TextSettings.createUserSettings and responds to the original request.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND TextSettings.createUserSettings failed.
 * Then: Responds to the original request with the error message from TextSettings.createUserSettings.
 */
export const HandleTextSettingsCreateErrorAndRespond: Sync = (
  { request, user, username, password, font, fontSize, lineHeight, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Profile creation must have succeeded
    [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, { error }], // TextSettings creation failed
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```

**Explanation of the fix:**

* **No "OR" in `when` clause:** The `when` clause is fundamentally conjunctive. If you list multiple actions, *all* of them must match for the sync to fire. There's no direct syntax for "Action A occurred AND (Action B failed OR Action C failed)".
* **Separate Syncs for Disjunction:** To achieve "OR" logic (i.e., respond if *any one* of these subsequent steps fails), you create a separate synchronization for each potential failure path. Each new sync `when` clause includes the common preceding actions (`Requesting.request` and successful `Profile.createAccount`) plus the specific action that failed (e.g., `Library.createLibrary` returning an `error`).
* **Clarity and maintainability:** While it results in more `Sync` definitions, this approach is explicit, clear, and aligns with how the synchronization engine processes events. It makes debugging easier as each sync covers a specific, well-defined scenario.
