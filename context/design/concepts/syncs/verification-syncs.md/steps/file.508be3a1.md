---
timestamp: 'Mon Nov 10 2025 17:13:40 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_171340.4bcb6b86.md]]'
content_id: 508be3a15494eb6cc5c618a050959247c29023fb15333fa04052774170cd9a5b
---

# file: src/syncs/auth.sync.ts

```typescript
import { actions, Sync } from "@engine";
import {
  FocusStats,
  Library,
  Profile,
  Requesting,
  Sessioning,
  TextSettings,
} from "@concepts";

// Default settings for new users. In a real app, these might come from a config file.
const defaultTextSettings = {
  font: "Arial",
  fontSize: 16,
  lineHeight: 24,
};

/**
 * --- User Creation Flow ---
 */

// 1. A request to create an account triggers the Profile.createAccount action.
export const CreateAccountRequest: Sync = ({ request, username, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/createAccount", username, password },
    { request },
  ]),
  then: actions([Profile.createAccount, { username, password }]),
});

// 2. On successful account creation, set up the user's other required resources.
export const CreateAccountSuccess: Sync = (
  { request, user },
) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/createAccount" }, { request }],
    [Profile.createAccount, {}, { user }],
  ),
  then: actions(
    [Library.createLibrary, { user }],
    [FocusStats.initUser, { user }],
    [
      TextSettings.createUserSettings,
      { user, ...defaultTextSettings },
    ],
  ),
});

// 3. When all setup is complete (we listen for the main action), respond to the original request.
export const CreateAccountResponse: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/createAccount" }, { request }],
    // We only need to listen for the user creation to respond.
    // The other setup actions can happen asynchronously.
    [Profile.createAccount, {}, { user }],
  ),
  then: actions([Requesting.respond, { request, user }]),
});

// 4. If creating an account resulted in an error, respond with that error.
export const CreateAccountError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/createAccount" }, { request }],
    [Profile.createAccount, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * --- User Login Flow ---
 */

// 1. A request to authenticate triggers the Profile.authenticate action.
export const LoginRequest: Sync = ({ request, username, password }) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/authenticate", username, password },
    { request },
  ]),
  then: actions([Profile.authenticate, { username, password }]),
});

// 2. On successful authentication, create a new session for the user.
export const LoginSuccess: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/authenticate" }, { request }],
    [Profile.authenticate, {}, { user }],
  ),
  then: actions([Sessioning.create, { user }]),
});

// 3. When the session is created, respond to the original request with the session and user info.
export const LoginResponse: Sync = ({ request, user, session }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/authenticate" }, { request }],
    [Profile.authenticate, {}, { user }],
    [Sessioning.create, { user }, { session }],
  ),
  then: actions([Requesting.respond, { request, user, session }]),
});

// 4. If authentication fails, respond with the error.
export const LoginError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/authenticate" }, { request }],
    [Profile.authenticate, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * --- User Logout Flow ---
 */

// 1. A request to delete a session triggers the Sessioning.delete action.
export const LogoutRequest: Sync = ({ request, session }) => ({
  when: actions([
    Requesting.request,
    { path: "/Sessioning/delete", session },
    { request },
  ]),
  then: actions([Sessioning.delete, { session }]),
});

// 2. Respond to the request after the session is deleted.
export const LogoutResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/delete" }, { request }],
    [Sessioning.delete, {}, {}], // Success is an empty object
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const LogoutErrorResponse: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Sessioning/delete" }, { request }],
    [Sessioning.delete, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});
```
