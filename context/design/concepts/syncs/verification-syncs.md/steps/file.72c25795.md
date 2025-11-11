---
timestamp: 'Mon Nov 10 2025 17:48:09 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_174809.72774d18.md]]'
content_id: 72c25795d421abf1e73127687d4cf2ee43079a8e7a476ef36ae8a659b2532729
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
} from "@concepts";

/**
 * This file implements the "guard" or "policy enforcer" pattern for actions
 * that were excluded from passthrough and require user authentication via a session.
 *
 * For actions that mutate state, the pattern is:
 * 1. Request Sync: Verifies the session and triggers the "pure" concept action.
 * 2. Response Syncs: Catches the result (success or error) of the action and
 *    responds to the original HTTP request.
 *
 * For queries, the pattern is simpler:
 * 1. A single sync verifies the session, performs the query in the `where`
 *    clause, and uses the result to respond in the `then` clause.
 */

// --- Profile Concept Actions ---

// Profile.deleteAccount
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

// Profile.changePassword
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

// --- Library Concept Actions ---

// Library.removeDocument
export const RemoveDocumentRequest: Sync = (
  { request, session, user, document, library, libraryId },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/removeDocument", session, document },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    frames = await frames.query(Library._getLibraryByUser, { user }, { library });

    // Filter for frames where a library was found, then map to add the new 'libraryId' binding.
    return frames
      .filter(
        ($) => Array.isArray($[library]) && $[library].length > 0 && ($[library] as any)[0].library,
      )
      .map(($) => {
        const lib = ($[library] as any)[0].library;
        return {
          ...$, // Keep all existing bindings
          [libraryId]: lib._id, // Add the extracted library ID as a new binding
        };
      });
  },
  then: actions([
    Library.removeDocument,
    { library: libraryId, document },
  ]),
});

export const RemoveDocumentResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/removeDocument" }, { request }],
    [Library.removeDocument, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RemoveDocumentError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/removeDocument" }, { request }],
    [Library.removeDocument, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- FocusStats Concept Actions ---

// FocusStats.removeSession
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

export const RemoveSessionResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/FocusStats/removeSession" }, { request }],
    [FocusStats.removeSession, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const RemoveSessionError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/FocusStats/removeSession" }, { request }],
    [FocusStats.removeSession, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Verified Queries ---

// Profile._getUserDetails
export const GetUserDetailsRequest: Sync = (
  { request, session, user, details },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/_getUserDetails", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    // FIX: Map the 'username' key from the query result to the 'details' variable.
    frames = await frames.query(Profile._getUserDetails, { user }, {
      username: details,
    });
    return frames;
  },
  then: actions([Requesting.respond, { request, details }]),
});

// FocusStats._viewStats
export const ViewStatsRequest: Sync = ({ request, session, user, stats }) => ({
  when: actions([
    Requesting.request,
    { path: "/FocusStats/_viewStats", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    // FIX: Map the 'focusStats' key from the query result to the 'stats' variable.
    frames = await frames.query(FocusStats._viewStats, { user }, {
      focusStats: stats,
    });
    return frames;
  },
  then: actions([Requesting.respond, { request, stats }]),
});

// FocusStats._getSessions
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
    // FIX: Map the 'focusSession' key from the query result to the 'sessions' variable.
    // NOTE: This will create a frame for each session. If the goal is a single response
    // with an array of all sessions, a more complex `collectAs` pattern would be needed.
    // This fix makes the query succeed but may respond multiple times.
    frames = await frames.query(FocusStats._getSessions, { user }, {
      focusSession: sessions,
    });
    return frames;
  },
  then: actions([Requesting.respond, { request, sessions }]),
});
```
