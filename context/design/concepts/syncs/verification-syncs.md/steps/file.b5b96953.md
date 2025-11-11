---
timestamp: 'Mon Nov 10 2025 17:13:40 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_171340.4bcb6b86.md]]'
content_id: b5b96953cda8616dd70e8e979eb6fe250d32cc99797ec970e2166949bdf469db
---

# file: src/syncs/verification.sync.ts

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

/**
 * This file implements the "guard" or "policy enforcer" pattern for standalone
 * actions that were excluded from passthrough and require authentication.
 * Each action has a request sync and two response syncs (success/error).
 */

// --- Profile.deleteAccount ---

export const DeleteAccountRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/deleteAccount", session },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning.getUser, { session }, { user }),
  then: actions([Profile.deleteAccount, { user }]),
});

export const DeleteAccountResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/deleteAccount" }, { request }],
    [Profile.deleteAccount, {}, {}], // Empty success response
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const DeleteAccountError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/deleteAccount" }, { request }],
    [Profile.deleteAccount, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Profile.changePassword ---

export const ChangePasswordRequest: Sync = (
  { request, session, user, oldPassword, newPassword },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/changePassword", session, oldPassword, newPassword },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning.getUser, { session }, { user }),
  then: actions([Profile.changePassword, { user, oldPassword, newPassword }]),
});

export const ChangePasswordResponse: Sync = ({ request, user }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/changePassword" }, { request }],
    [Profile.changePassword, {}, { user }],
  ),
  then: actions([Requesting.respond, { request, user }]),
});

export const ChangePasswordError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Profile/changePassword" }, { request }],
    [Profile.changePassword, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Profile._getUserDetails ---

export const GetUserDetailsRequest: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/_getUserDetails", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    return await frames.query(Profile._getUserDetails, { user }, { user });
  },
  then: actions([Requesting.respond, { request, user }]),
});

// --- Library.removeDocument ---

export const RemoveDocumentRequest: Sync = (
  { request, session, user, library, document },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/removeDocument", session, document },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    return await frames.query(Library._getLibraryByUser, { user }, { library });
  },
  then: actions([
    Library.removeDocument,
    ({ [library as any]: lib }) => ({ library: lib.library._id, document }),
  ]),
});

export const RemoveDocumentResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/removeDocument" }, { request }],
    [Library.removeDocument, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

// --- FocusStats Actions ---

export const RemoveSessionRequest: Sync = (
  { request, session, user, focusSession },
) => ({
  when: actions([
    Requesting.request,
    { path: "/FocusStats/removeSession", session, focusSession },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning.getUser, { session }, { user }),
  then: actions([FocusStats.removeSession, { focusSession }]),
});

export const ViewStatsRequest: Sync = ({ request, session, user, stats }) => ({
  when: actions([
    Requesting.request,
    { path: "/FocusStats/_viewStats", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    return await frames.query(FocusStats._viewStats, { user }, { stats });
  },
  then: actions([Requesting.respond, { request, stats }]),
});

export const GetSessionsRequest: Sync = (
  { request, session, user, sessions },
) => ({
  when: actions([
    Requesting.request,
    { path: "/FocusStats/_getSessions", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    return await frames.query(FocusStats._getSessions, { user }, { sessions });
  },
  then: actions([Requesting.respond, { request, sessions }]),
});

// --- Sessioning.getUser (Query Verification) ---

export const GetUserFromSession: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Sessioning/getUser", session },
    { request },
  ]),
  where: async (frames) => {
    // Perform the query in the 'where' clause and bind the result to 'user'.
    return await frames.query(Sessioning.getUser, { session }, { user });
  },
  // The 'then' clause uses the 'user' binding to construct the response.
  then: actions([Requesting.respond, { request, user }]),
});
```
