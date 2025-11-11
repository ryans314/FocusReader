---
timestamp: 'Mon Nov 10 2025 17:02:20 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_170220.d5e30ae7.md]]'
content_id: de624a609a4aa0b8a4ad3af0460f3cb17dfd55743b081fec38333e752899d710
---

# file: src/syncs/document.sync.ts

```typescript
import { actions, Sync } from "@engine";
import {
  Annotation,
  FocusStats,
  Library,
  Requesting,
  Sessioning,
  TextSettings,
} from "@concepts";

/**
 * --- Create Document Flow ---
 */

// 1. An authorized request to create a document triggers Library.createDocument.
export const CreateDocumentRequest: Sync = (
  { request, session, user, name, epubContent, library },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/createDocument", session, name, epubContent },
    { request },
  ]),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    frames = await frames.query(Library._getLibraryByUser, { user }, { library });
    return frames;
  },
  then: actions([
    Library.createDocument,
    // The library object from the query contains the _id, so we need to access it.
    ({ [library as any]: lib }) => ({ name, epubContent, library: lib._id }),
  ]),
});

// 2. When a document is successfully created, perform follow-up setup actions.
export const OnDocumentCreated: Sync = (
  { request, user, document, settings },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [Library.createDocument, {}, { document }],
  ),
  where: async (frames) => {
    // We need the user from the original request's session to perform these actions.
    frames = await frames.query(
      Sessioning.getUser,
      { session: request }, // The `request` object from the frame contains the session.
      { user },
    );
    frames = await frames.query(
      TextSettings._getUserDefaultSettings,
      { user },
      { settings },
    );
    return frames;
  },
  then: actions(
    [Annotation.registerDocument, { documentId: document, creatorId: user }],
    [
      TextSettings.createDocumentSettings,
      ({ [settings as any]: s }) => ({ // Extract settings from the returned array
        document,
        font: s[0].settings.font,
        fontSize: s[0].settings.fontSize,
        lineHeight: s[0].settings.lineHeight,
      }),
    ],
  ),
});

// 3. Respond to the original request upon successful document creation.
export const CreateDocumentResponse: Sync = ({ request, document }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [Library.createDocument, {}, { document }],
  ),
  then: actions([Requesting.respond, { request, document }]),
});

// 4. If document creation fails, respond with an error.
export const CreateDocumentError: Sync = ({ request, error }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [Library.createDocument, {}, { error }],
  ),
  then: actions([Requesting.respond, { request, error }]),
});

/**
 * --- Open/Close Document Flow (Focus Tracking) ---
 */

// 1. An authorized request to open a document triggers Library.openDocument
export const OpenDocumentRequest: Sync = (
  { request, session, user, document },
) => ({
  when: actions([
    Requesting.request,
    { path: "/Library/openDocument", session, document },
    { request },
  ]),
  where: (frames) => frames.query(Sessioning.getUser, { session }, { user }),
  then: actions([Library.openDocument, { user, document }]),
});

// 2. When a document is successfully "opened", start a new focus session.
export const OnDocumentOpened: Sync = ({ user, document, library }) => ({
  when: actions([Library.openDocument, { user, document }, { document }]),
  where: (frames) =>
    frames.query(Library._getLibraryByUser, { user }, { library }),
  then: actions([
    FocusStats.startSession,
    ({ [library as any]: lib }) => ({ user, document, library: lib._id }),
  ]),
});

// 3. Respond to the open request with the new focus session ID.
export const OpenDocumentResponse: Sync = ({ request, focusSession }) => ({
  when: actions(
    [Requesting.request, { path: "/Library/openDocument" }, { request }],
    [FocusStats.startSession, {}, { focusSession }],
  ),
  then: actions([Requesting.respond, { request, focusSession }]),
});

// 1. An authorized request to end a session triggers FocusStats.endSession
export const CloseDocumentRequest: Sync = (
  { request, session, user, focusSession },
) => ({
  when: actions([
    Requesting.request,
    { path: "/FocusStats/endSession", session, focusSession },
    { request },
  ]),
  // We check the session just to ensure the request is from a valid user.
  where: (frames) => frames.query(Sessioning.getUser, { session }, { user }),
  then: actions([FocusStats.endSession, { focusSession }]),
});

// 2. Respond to the close request.
export const CloseDocumentResponse: Sync = ({ request, focusSession }) => ({
  when: actions(
    [Requesting.request, { path: "/FocusStats/endSession" }, { request }],
    [FocusStats.endSession, {}, { focusSession }],
  ),
  then: actions([Requesting.respond, { request, focusSession }]),
});
```
