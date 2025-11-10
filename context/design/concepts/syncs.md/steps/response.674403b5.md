---
timestamp: 'Mon Nov 10 2025 07:02:15 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_070215.7378610f.md]]'
content_id: 674403b5f751f4e369418e55b2cc53c3cd51ee33c01ce8fab889bb290edb2612
---

# response:

The error message `Type '((({ user }: { user: ID; }) => Promise<{ library?: ID | undefined; error?: string | undefined; }>) | { user: symbol; } | { error: symbol; })[]' is missing the following properties from type 'InstrumentedAction'` indicates a type mismatch in how you're constructing the `when` clause, specifically for the "OR" condition involving multiple action failures.

Let's break down the likely issue and solution:

1. **`actions` helper function usage**:
   * The `actions` helper function typically takes a **spread** of action patterns (tuples like `[Concept.action, inputs, outputs]`) to denote an "AND" sequence of actions.
   * To denote an "OR" group (where *any* of the actions in the group can match), the `actions` helper expects a **single array** as one of its arguments, and that array should contain the individual action patterns for the "OR" condition.
   * The `when` property of a `Sync` expects a `InstrumentedAction[]` (an array of `InstrumentedAction` objects). The `actions` helper function itself produces such an array.

2. **Your current problematic line**:

   ```typescript
       // Problematic part
       [
         [Library.createLibrary, { user }, { error }],
         [FocusStats.initUser, { user }, { error }],
         [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, { error }],
       ],
   ```

   You are passing an array (`[ ...]`) as one of the arguments to `actions`. The *elements* of this array are themselves arrays (`[Library.createLibrary, ...]`, `[FocusStats.initUser, ...]`, etc.). Each of these inner arrays represents an individual action pattern.

   The error suggests that `[Library.createLibrary, { user }, { error }]` (an array/tuple) is *not* directly an `InstrumentedAction` object, and the `actions` helper expects `InstrumentedAction`s (or arrays of them for OR groups) as its arguments.

**The Fix:**

You need to call `actions` twice: once for the "AND" conditions (the `Requesting.request` and `Profile.createAccount` actions) and once for the "OR" condition (the various failure scenarios). The results of these `actions` calls (which are `InstrumentedAction[]`) are then spread into the main `when` array.

Here's the corrected `HandleSubsequentCreateErrorAndRespond` synchronization:

```typescript
// file: src/syncs/user_management.sync.ts

import { actions, Sync } from "@engine";
import {
  Requesting,
  Profile,
  Library,
  FocusStats,
  TextSettings,
} from "@concepts";

/**
 * Synchronization: CreateUserRequest
 * Purpose: Catches an incoming HTTP request to create a user and triggers the Profile.createAccount action.
 *
 * When: A Requesting.request action occurs with the path "/users/create",
 *       providing username, password, and initial text settings (font, fontSize, lineHeight).
 * Then: Triggers the Profile.createAccount action with the provided username and password.
 */
export const CreateUserRequest: Sync = (
  { request, username, password, font, fontSize, lineHeight },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
  ),
  then: actions(
    [Profile.createAccount, { username, password }, {}], // Outputs will be handled by subsequent syncs
  ),
});

/**
 * Synchronization: HandleProfileCreateSuccessAndContinue
 * Purpose: Handles successful Profile.createAccount and proceeds to create associated resources
 *          (Library, FocusStats, TextSettings) for the new user.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount successfully returned a 'user' ID.
 * Then: Triggers:
 *       1. Library.createLibrary for the new user.
 *       2. FocusStats.initUser for the new user.
 *       3. TextSettings.createUserSettings for the new user with default settings.
 */
export const HandleProfileCreateSuccessAndContinue: Sync = (
  { request, user, username, password, font, fontSize, lineHeight },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Matches successful profile creation
  ),
  then: actions(
    [Library.createLibrary, { user }, {}], // Outputs will be handled by subsequent syncs
    [FocusStats.initUser, { user }, {}],
    [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, {}],
  ),
});

/**
 * Synchronization: HandleProfileCreateErrorAndRespond
 * Purpose: Responds to the original request if Profile.createAccount fails.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount failed (returned an 'error').
 * Then: Responds to the original request with the error message.
 */
export const HandleProfileCreateErrorAndRespond: Sync = (
  { request, username, password, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/users/create", username, password }, { request }],
    [Profile.createAccount, { username, password }, { error }], // Matches failed profile creation
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Synchronization: HandleAllSubsequentCreatesSuccessAndRespond
 * Purpose: Finalizes the user creation process by responding successfully to the original request
 *          once all associated resources (Profile, Library, FocusStats, TextSettings) have been created.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded (returned 'user'),
 *       AND Library.createLibrary succeeded (returned 'library'),
 *       AND FocusStats.initUser succeeded (returned 'focusStats'),
 *       AND TextSettings.createUserSettings succeeded (returned 'settings').
 * Then: Responds to the original request with the IDs of the newly created user and their associated resources.
 */
export const HandleAllSubsequentCreatesSuccessAndRespond: Sync = (
  { request, user, username, password, font, fontSize, lineHeight, library, focusStats, settings },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }],
    [Library.createLibrary, { user }, { library }],
    [FocusStats.initUser, { user }, { focusStats }],
    [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, { settings }],
  ),
  then: actions(
    // Respond with all successfully created IDs
    [Requesting.respond, { request, user, library, focusStats, settings }],
  ),
});

/**
 * Synchronization: HandleSubsequentCreateErrorAndRespond
 * Purpose: Catches errors from any of the subsequent resource creation steps (Library, FocusStats, TextSettings)
 *          and responds to the original request with the encountered error.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded (returned 'user'),
 *       AND any of the following failed (returned an 'error'):
 *       - Library.createLibrary
 *       - FocusStats.initUser
 *       - TextSettings.createUserSettings
 * Then: Responds to the original request with the error message.
 */
export const HandleSubsequentCreateErrorAndRespond: Sync = (
  { request, user, username, password, font, fontSize, lineHeight, error },
) => ({
  when: [ // `when` expects an array of InstrumentedActions
    ...actions( // Spread the InstrumentedActions for the "AND" part
      [
        Requesting.request,
        { path: "/users/create", username, password, font, fontSize, lineHeight },
        { request },
      ],
      [Profile.createAccount, { username, password }, { user }],
    ),
    ...actions([ // Spread the InstrumentedActions for the "OR" part.
                  // The argument to this `actions` call is a single array of ActionPatterns.
      [Library.createLibrary, { user }, { error }],
      [FocusStats.initUser, { user }, { error }],
      [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, { error }],
    ]),
  ],
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```
