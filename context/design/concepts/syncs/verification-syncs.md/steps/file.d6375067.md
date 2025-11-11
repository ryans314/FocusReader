---
timestamp: 'Mon Nov 10 2025 18:06:30 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_180630.64626496.md]]'
content_id: d6375067393078b0786418d3bc30af134b14a08bf7cac5050160b1fec5edd1cc
---

# file: src/syncs/verification.sync.ts

```typescript
import { actions, Frames, Sync } from "@engine";
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
    [Profile.deleteAccount, {}, {}],
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

    return frames
      .filter(
        ($) => Array.isArray($[library]) && $[library].length > 0 && ($[library] as any)[0].library,
      )
      .map(($) => {
        const lib = ($[library] as any)[0].library;
        return { ...$, [libraryId]: lib._id };
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
    frames = await frames.query(Profile._getUserDetails, { user }, { details });
    return frames;
  },
  // Flatten the response to send back just the user details object, not an array.
  then: actions([Requesting.respond, { request, details: ({[details]: d}) => d[0] }]),
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
    frames = await frames.query(FocusStats._viewStats, { user }, {
      focusStats: stats,
    });
    return frames;
  },
    // Flatten the response to send back just the stats object, not an array.
  then: actions([Requesting.respond, { request, stats: ({[stats]: s}) => s[0] }]),
});

// FocusStats._getSessions
export const GetSessionsRequest: Sync = (
  { request, session, user, sessionData, sessions },
) => ({
  when: actions([
    Requesting.request,
    { path: "/FocusStats/_getSessions", session },
    { request },
  ]),
  where: async (frames) => {
    const originalFrame = frames[0]; // Preserve the original request bindings
    frames = await frames.query(Sessioning.getUser, { session }, { user });

    // This query creates a new frame for each session document found.
    frames = await frames.query(FocusStats._getSessions, { user }, {
      focusSession: sessionData,
    });

    // FIX: If no sessions are found, respond with an empty array.
    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [sessions]: [] });
    }

    // FIX: Manually map the results to create a flat array of session objects.
    const allSessions = frames.map(($) => $[sessionData]);

    // Return a new single frame with the final, correctly formatted array.
    return new Frames({ ...originalFrame, [sessions]: allSessions });
  },
  then: actions([Requesting.respond, { request, sessions }]),
});
```
