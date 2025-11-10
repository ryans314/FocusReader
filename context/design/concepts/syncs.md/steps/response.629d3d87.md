---
timestamp: 'Mon Nov 10 2025 06:54:51 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_065451.cc70a13d.md]]'
content_id: 629d3d87e36689a7bd1577fc8c9b3503baddf7f75251b23c6757ab40f5a7e02e
---

# response:

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
} from "@concepts"; // All relevant concepts for user creation

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
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Profile creation must have succeeded
    // Match any of the subsequent actions failing
    [
      [Library.createLibrary, { user }, { error }],
      [FocusStats.initUser, { user }, { error }],
      [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, { error }],
    ],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```
