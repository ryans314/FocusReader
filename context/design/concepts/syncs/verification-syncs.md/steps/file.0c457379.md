---
timestamp: 'Tue Nov 11 2025 01:01:32 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251111_010132.527e5c9a.md]]'
content_id: 0c457379b109c2578f6e3c94b66eaec929dee4d93ed8fbbf9d3b1f35226ded87
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
    // This query binds the object `{ library: LibraryDoc }` to the 'library' variable.
    frames = await frames.query(Library._getLibraryByUser, { user }, { library });

    // FIX: The filter now correctly checks for an object with an inner 'library' property.
    return frames
      .filter(
        ($) => $[library] && ($[library] as any).library,
      )
      .map(($) => {
        // We now correctly access the inner library document.
        const lib = ($[library] as any).library;
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
  { request, session, user, username },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Profile/_getUserDetails", session },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    frames = await frames.query(
      Profile._getUserDetails,
      { user },
      { username },
    );
    return frames;
  },
  then: actions([Requesting.respond, { request, username }]),
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
  then: actions([Requesting.respond, { request, stats }]),
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
    const originalFrame = frames[0];
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    frames = await frames.query(FocusStats._getSessions, { user }, {
      focusSession: sessionData,
    });

    if (frames.length === 0) {
      return new Frames({ ...originalFrame, [sessions]: [] });
    }

    const allSessions = frames.map(($) => $[sessionData]);
    return new Frames({ ...originalFrame, [sessions]: allSessions });
  },
  then: actions([Requesting.respond, { request, sessions }]),
});
```
