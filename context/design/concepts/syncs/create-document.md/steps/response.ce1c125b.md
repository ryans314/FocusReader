---
timestamp: 'Mon Nov 10 2025 08:22:22 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_082222.88cdf91f.md]]'
content_id: ce1c125b21b077c79e6f80e8cb0f5a3d22f3d52f2614a267b6b20698a2f3d550
---

# response:

```typescript
// file: src/syncs/library_document.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, Library, Annotation, TextSettings, Sessioning } from "@concepts";
import { ID } from "@utils/types.ts";

/**
 * Sync: CreateDocumentRequest
 *
 * Handles the creation of a new document in a user's library.
 * This synchronization orchestrates the following actions:
 * 1. Authenticates the user via their session.
 * 2. Verifies that the requested library belongs to the authenticated user.
 * 3. Creates the document in the Library concept.
 * 4. Registers the new document in the Annotation concept's view.
 * 5. Creates default text settings for the new document in the TextSettings concept.
 * 6. Responds to the original HTTP request with the new document ID.
 */
export const CreateDocumentRequest: Sync = (
  { request, name, epubContent, session, user, library: requestedLibrary, document, library: actualUserLibrary }: {
    request: ID;
    name: string;
    epubContent: string;
    session: ID;
    user: ID; // Bound in where clause
    requestedLibrary: ID; // From Requesting.request input
    document: ID; // Bound in then clause
    actualUserLibrary: ID; // Bound in where clause
  },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/createDocument", name, epubContent, session, library: requestedLibrary },
      { request },
    ],
  ),
  where: async (frames) => {
    // 1. Get the user associated with the session ID.
    frames = await frames.query(Sessioning._getUser, { session }, { user });

    // 2. Query for the *actual* library owned by this user.
    frames = await frames.query(Library._getLibraryByUser, { user }, { library: actualUserLibrary });

    // 3. Verify that the `requestedLibrary` ID from the client matches the `actualUserLibrary` ID.
    // This is a security check to ensure the user is creating a document in their own library.
    return frames.filter(($) => $[requestedLibrary] === $[actualUserLibrary]);
  },
  then: actions(
    // 1. Create the document in the Library concept.
    // Uses the validated `actualUserLibrary` to ensure correct ownership.
    [
      Library.createDocument,
      { name, epubContent, library: actualUserLibrary },
      { document }, // Bind the ID of the newly created document
    ],
    // 2. Register the newly created document with the Annotation concept.
    // This sets up the Annotation concept's internal state for this document.
    [
      Annotation.registerDocument,
      { documentId: document, creatorId: user },
      {}, // No explicit output expected, just successful completion
    ],
    // 3. Create default text settings for the new document.
    // Uses fixed default values for font, size, and line height.
    [
      TextSettings.createDocumentSettings,
      {
        document,
        font: "serif",
        fontSize: 16,
        lineHeight: 24,
      },
      {}, // No explicit output expected
    ],
    // 4. Respond to the original request, confirming success and returning the document ID.
    [
      Requesting.respond,
      { request, document, message: "Document created successfully." },
    ],
  ),
});

/**
 * Sync: CreateDocumentResponseError
 *
 * Catches errors specifically from `Library.createDocument` and responds to the original request.
 * This handles cases like a document with the same name already existing in the library.
 */
export const CreateDocumentResponseError: Sync = (
  { request, error }: { request: ID; error: string },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [Library.createDocument, {}, { error }], // Catch the error output from Library.createDocument
  ),
  then: actions(
    [Requesting.respond, { request, error }], // Respond to the original request with the error
  ),
});

/**
 * Sync: RegisterDocumentResponseError
 *
 * Catches errors from `Annotation.registerDocument` (e.g., if the document was already registered, though unlikely in this flow)
 * and responds to the original request.
 */
export const RegisterDocumentResponseError: Sync = (
  { request, error }: { request: ID; error: string },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [Annotation.registerDocument, {}, { error }], // Catch the error output from Annotation.registerDocument
  ),
  then: actions(
    [Requesting.respond, { request, error }], // Respond to the original request with the error
  ),
});

/**
 * Sync: CreateDocumentSettingsResponseError
 *
 * Catches errors from `TextSettings.createDocumentSettings` (e.g., if settings already exist for the document, though unlikely)
 * and responds to the original request.
 */
export const CreateDocumentSettingsResponseError: Sync = (
  { request, error }: { request: ID; error: string },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [TextSettings.createDocumentSettings, {}, { error }], // Catch the error output from TextSettings.createDocumentSettings
  ),
  then: actions(
    [Requesting.respond, { request, error }], // Respond to the original request with the error
  ),
});
```
