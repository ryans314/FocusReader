---
timestamp: 'Mon Nov 10 2025 11:03:01 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_110301.9ee5ca98.md]]'
content_id: 70bb26936127b553f4964aa6ff9adcfd5ade179f74cb08244bd219c9a0cf6aaf
---

# response:

You've found the exact kind of subtle but critical bug that can appear when working with this synchronization framework. The error message is spot on: `Implicit conversion of a 'symbol' to a 'string' will fail at runtime`.

The issue is that inside the `then` clause of a sync, variables like `textSettingsCreationError` are treated as **symbols** (placeholders for data), not the actual data itself. Trying to use a symbol inside a template string (e.g., `` `Error: ${symbol}` ``) is not allowed.

The correct way to handle this is to perform the string construction inside a `where` clause, where you have access to the actual data bound to the frame. We will create a new variable in the frame to hold the full error message and then use that new variable in the `then` clause.

I will now provide the fully corrected `create_document.sync.ts` file. This new version applies this fix to all the error-handling syncs that had this issue.

***

**File: `src/syncs/create_document.sync.ts`**

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Library, Annotation, TextSettings, Sessioning } from "@concepts";
import { ID } from "@utils/types.ts";

// --- Main Document Creation Flow ---

/**
 * Sync: CreateDocumentFlow
 * This single synchronization handles the entire successful process of creating a document:
 * 1. Authenticates the user via session.
 * 2. Verifies library ownership.
 * 3. Creates the document in the Library concept.
 * 4. Registers the document with the Annotation concept.
 * 5. Creates default text settings for the document.
 * 6. Responds to the original request.
 */
export const CreateDocumentFlow: Sync = (
  { request, name, epubContent, session, library: clientProvidedLibraryId, user, library: userOwnedLibraryId, document, authError, libraryError, authzError },
) => ({
  when: actions(
    // 1. Match the initial incoming HTTP request.
    [
      Requesting.request,
      { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId },
      { request: request },
    ],
  ),
  where: async (frames) => {
    // 2. Get the user ID from the session. If this fails, bind the error to 'authError'.
    frames = await frames.query(Sessioning.getUser, { session: session }, { user: user, error: authError });
    // If there was an error, stop processing this frame for the success path.
    if (frames.some(($) => $[authError] !== undefined)) {
      return frames.filter(($) => $[authError] !== undefined);
    }
    
    // 3. Query for the actual library owned by this user. Bind error to 'libraryError'.
    frames = await frames.query(Library._getLibraryByUser, { user: user }, { library: userOwnedLibraryId, error: libraryError });
    if (frames.some(($) => $[libraryError] !== undefined)) {
      return frames.filter(($) => $[libraryError] !== undefined);
    }

    // 4. Authorize: Filter frames to ensure the client-provided library ID matches the user's actual library ID.
    const authorizedFrames = frames.filter(($) => $[clientProvidedLibraryId] === $[userOwnedLibraryId]);
    if (authorizedFrames.length < frames.length) {
      // Create a specific error for unauthorized frames.
      const unauthorizedFrames = frames.filter(($) => $[clientProvidedLibraryId] !== $[userOwnedLibraryId]);
      unauthorizedFrames.forEach(($) => $[authzError] = "Unauthorized: Client-provided library ID does not match user's owned library.");
      return unauthorizedFrames;
    }
    
    return authorizedFrames; // Only return frames that passed all checks.
  },
  then: actions(
    // 5. Create the document in the Library concept.
    [
      Library.createDocument,
      { name: name, epubContent: epubContent, library: userOwnedLibraryId },
      { document: document },
    ],
    // 6. Register the document with the Annotation concept.
    [Annotation.registerDocument, { documentId: document, creatorId: user }, {}],
    // 7. Create default text settings for the document.
    [
      TextSettings.createDocumentSettings,
      { document: document, font: "serif", fontSize: 16, lineHeight: 24 },
      {},
    ],
    // 8. Respond to the frontend, indicating success.
    [
      Requesting.respond,
      { request: request, document: document, message: "Document created successfully." },
    ],
  ),
});


// --- Error Handling for Create Document Flow ---

/**
 * Sync: CreateDocumentFailedSessionError
 * Catches errors from Sessioning.getUser.
 */
export const CreateDocumentFailedSessionError: Sync = (
  { request, authError, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    // Match the error output which is now bound to 'authError'
    // We can rely on the 'where' clause of the main sync to have produced this binding.
  ),
  where: async (frames) => {
    // This sync will only receive frames that have an 'authError'.
    return frames
      .filter(($) => $[authError] !== undefined)
      .map(($) => ({
        ...$,
        [fullErrorMsg]: `Authentication failed: ${String($[authError])}`
      }));
  },
  then: actions(
    [Requesting.respond, { request: request, error: fullErrorMsg }],
  ),
});

/**
 * Sync: CreateDocumentFailedLibraryLookupError
 * Catches errors when `Library._getLibraryByUser` fails.
 */
export const CreateDocumentFailedLibraryLookupError: Sync = (
  { request, libraryError, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
  ),
  where: async (frames) => {
    return frames
      .filter(($) => $[libraryError] !== undefined)
      .map(($) => ({
        ...$,
        [fullErrorMsg]: `Library lookup failed: ${String($[libraryError])}`
      }));
  },
  then: actions(
    [Requesting.respond, { request: request, error: fullErrorMsg }],
  ),
});

/**
 * Sync: CreateDocumentFailedAuthorizationError
 * Catches authorization failures.
 */
export const CreateDocumentFailedAuthorizationError: Sync = (
  { request, authzError },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
  ),
  where: async (frames) => {
    return frames.filter(($) => $[authzError] !== undefined);
  },
  then: actions(
    [Requesting.respond, { request: request, error: authzError }],
  ),
});


/**
 * Sync: CreateDocumentFailedCreationError
 * Catches errors when `Library.createDocument` action itself fails.
 */
export const CreateDocumentFailedCreationError: Sync = (
  { request, error, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    [Library.createDocument, {}, { error: error }],
  ),
  where: async (frames) => {
    return frames.map(($) => ({
      ...$,
      [fullErrorMsg]: `Document creation failed: ${String($[error])}`
    }));
  },
  then: actions(
    [Requesting.respond, { request: request, error: fullErrorMsg }],
  ),
});

/**
 * Sync: CreateDocumentFailedAnnotationRegistrationError
 * Catches errors when `Annotation.registerDocument` fails.
 */
export const CreateDocumentFailedAnnotationRegistrationError: Sync = (
  { request, error, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    [Annotation.registerDocument, {}, { error: error }],
  ),
  where: async (frames) => {
    return frames.map(($) => ({
      ...$,
      [fullErrorMsg]: `Annotation registration failed: ${String($[error])}`
    }));
  },
  then: actions(
    [Requesting.respond, { request: request, error: fullErrorMsg }],
  ),
});

/**
 * Sync: CreateDocumentFailedTextSettingsError
 * Catches errors when `TextSettings.createDocumentSettings` fails.
 */
export const CreateDocumentFailedTextSettingsError: Sync = (
  { request, error, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    [TextSettings.createDocumentSettings, {}, { error: error }],
  ),
  where: async (frames) => {
    return frames.map(($) => ({
      ...$,
      [fullErrorMsg]: `Text settings creation failed: ${String($[error])}`
    }));
  },
  then: actions(
    [Requesting.respond, { request: request, error: fullErrorMsg }],
  ),
});
```
