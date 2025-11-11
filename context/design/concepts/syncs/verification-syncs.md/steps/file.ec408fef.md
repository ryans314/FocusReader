---
timestamp: 'Mon Nov 10 2025 17:02:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_170220.d5e30ae7.md]]'
content_id: ec408fef9478e5024df647a0e8464bd0f287cd2decc74c554a0a7206572ec43b
---

# file: src/syncs/verification.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { Profile, Requesting, Sessioning, TextSettings } from "@concepts";

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

// --- TextSettings.editSettings ---

export const EditSettingsRequest: Sync = (
  { request, session, user, textSettings, font, fontSize, lineHeight },
) => ({
  when: actions([
    Requesting.request,
    {
      path: "/TextSettings/editSettings",
      session,
      textSettings,
      font,
      fontSize,
      lineHeight,
    },
    { request },
  ]),
  // Here we only verify the user's session exists. A more robust implementation
  // might also query to ensure the textSettings ID belongs to this user.
  where: (frames) => frames.query(Sessioning.getUser, { session }, { user }),
  then: actions([
    TextSettings.editSettings,
    { textSettings, font, fontSize, lineHeight },
  ]),
});

export const EditSettingsResponse: Sync = ({ request }) => ({
  when: actions(
    [Requesting.request, { path: "/TextSettings/editSettings" }, { request }],
    [TextSettings.editSettings, {}, {}],
  ),
  then: actions([Requesting.respond, { request, success: true }]),
});

export const EditSettingsError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/TextSettings/editSettings" }, { request }],
    [TextSettings.editSettings, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

// --- Sessioning.getUser (Query Verification) ---

export const GetUserFromSession: Sync = ({ request, session, user }) => ({
  when: actions([
    Requesting.request,
    { path: "/Sessioning/getUser", session },
    { request },
  ]),
  where: async (frames) => {
    // We perform the query in the 'where' clause and then use the result
    // to construct the response in the 'then' clause.
    return await frames.query(Sessioning.getUser, { session }, { user });
  },
  then: actions([Requesting.respond, { request, user }]),
});
```
