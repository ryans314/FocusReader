---
timestamp: 'Mon Nov 10 2025 10:27:19 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_102719.aa6b8d2b.md]]'
content_id: 5aa20a4be7a7afd0bb2e61c2a8e77ba0d3934fc032d51d2566521afcb45d3ffc
---

# response:

You've hit a new error: `Action bound instrumented is not instrumented.` This is a very specific error from the `@engine` framework itself, indicating that it doesn't recognize the function you're passing to `actions()` as one of its specially "instrumented" concept methods.

The cause of this error is directly related to the fix I proposed in the previous step: using `.bind(Library)`. While `.bind()` is a correct JavaScript pattern to ensure `this` context, it creates a *new function*. The `@engine` framework likely applies some kind of wrapper or metadata to the original concept methods (this "instrumentation" allows it to do things like logging, error handling, or transaction management). When you call `.bind()`, this new function loses that original instrumentation.

So, the `.bind()` approach, while logically sound for `this` context, is incompatible with how the framework itself instruments and dispatches actions.

We need to revert the `.bind()` changes. The true underlying problem (why `Library.createDocument` wasn't being called initially and led to `Missing actionId`) needs to be solved differently.

***

### Proposed Fix: Revert `.bind()`

We will revert all instances of `.bind(Library)` back to the direct method reference (`Library.createDocument`). We'll then re-evaluate the error message.

**Edit `src/syncs/document_creation.sync.ts`:**
(Revert all instances of `Library.createDocument.bind(Library)` back to `Library.createDocument`)

```typescript
// file: src/syncs/document_creation.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, Library, Annotation, TextSettings, Sessioning } from "@concepts";
import { ID } from "@utils/types.ts";

// --- DEBUGGING DOCUMENT CREATION SYNC (STARTUP) logs are good, keep them ---
console.log("--- DEBUGGING DOCUMENT CREATION SYNC (STARTUP) ---");
console.log("Library concept imported:", !!Library);
console.log("Library.createDocument is a function:", typeof Library.createDocument === 'function');
console.log("Annotation concept imported:", !!Annotation);
console.log("Annotation.registerDocument is a function:", typeof Annotation.registerDocument === 'function');
console.log("TextSettings concept imported:", !!TextSettings);
console.log("TextSettings.createDocumentSettings is a function:", typeof TextSettings.createDocumentSettings === 'function');
console.log("--- END DEBUGGING DOCUMENT CREATION SYNC (STARTUP) ---");
// --- END LOGS ---

// --- Document Creation Flow ---

/**
 * Sync: HandleCreateDocumentRequest
 * Catches the initial HTTP request to create a document.
 * It first authenticates the user's session and validates library ownership,
 * then triggers the core document creation in the Library concept.
 */
export const HandleCreateDocumentRequest: Sync = (
  {
    request,
    name,
    epubContent,
    session,
    user: authenticatedUserId,
    library: clientProvidedLibraryId,
    library: userOwnedLibraryId,
    newDocumentId,
    error: errorMessage,
  },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId },
      { request: request },
    ],
  ),
  where: async (initialFrames) => {
    let frames = initialFrames;

    // 1. Get the user associated with the session ID.
    frames = await frames.query(Sessioning._getUser, { session: session }, { user: authenticatedUserId });

    if (frames.length === 0) {
      return new Frames({
        [request]: initialFrames[0][request],
        [errorMessage]: "Invalid session or user not found.",
      });
    }

    // 2. Query for the *actual* library owned by this user.
    frames = await frames.query(Library._getLibraryByUser, { user: authenticatedUserId }, { library: userOwnedLibraryId });

    if (frames.length === 0) {
      return new Frames({
        [request]: initialFrames[0][request],
        [errorMessage]: "User does not have a library.",
      });
    }

    // 3. Verify that the clientProvidedLibraryId matches the userOwnedLibraryId.
    const filteredFrames = frames.filter(($) => $[clientProvidedLibraryId] === $[userOwnedLibraryId]);

    if (filteredFrames.length === 0) {
      return new Frames({
        [request]: initialFrames[0][request],
        [errorMessage]: "The provided library ID does not belong to the authenticated user.",
      });
    }

    return filteredFrames;
  },
  then: actions(
    // REVERTED: Now just directly referencing the method
    [Library.createDocument, { name, epubContent, library: userOwnedLibraryId }, { document: newDocumentId }],
  ),
});

/**
 * Sync: DocumentCreationSuccessRegisterAnnotation
 * Fires when Library.createDocument successfully creates the document.
 * Proceeds to register this new document with the Annotation concept.
 */
export const DocumentCreationSuccessRegisterAnnotation: Sync = (
  { request, name, epubContent, session, user: authenticatedUserId, library: clientProvidedLibraryId, newDocumentId },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId }, { request: request }],
    // REVERTED: Now just directly referencing the method
    [Library.createDocument, { name, epubContent, library: clientProvidedLibraryId }, { document: newDocumentId }],
  ),
  then: actions(
    [Annotation.registerDocument, { documentId: newDocumentId, creatorId: authenticatedUserId }, {}],
  ),
});

/**
 * Sync: DocumentCreationSuccessCreateTextSettings
 * Fires when Annotation.registerDocument successfully registers the document.
 * Proceeds to create default text settings for this new document.
 */
export const DocumentCreationSuccessCreateTextSettings: Sync = (
  { request, name, epubContent, session, user: authenticatedUserId, library: clientProvidedLibraryId, newDocumentId },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId }, { request: request }],
    // REVERTED: Now just directly referencing the method
    [Library.createDocument, { name, epubContent, library: clientProvidedLibraryId }, { document: newDocumentId }],
    [Annotation.registerDocument, { documentId: newDocumentId, creatorId: authenticatedUserId }, {}],
  ),
  then: actions(
    [
      TextSettings.createDocumentSettings,
      {
        document: newDocumentId,
        font: "serif",
        fontSize: 16,
        lineHeight: 24,
      },
      {},
    ],
  ),
});

/**
 * Sync: DocumentCreationSuccessRespond
 * Fires when TextSettings.createDocumentSettings successfully completes.
 * Responds to the frontend with the new document ID and a success message.
 */
export const DocumentCreationSuccessRespond: Sync = (
  { request, name, epubContent, session, user: authenticatedUserId, library: clientProvidedLibraryId, newDocumentId },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId }, { request: request }],
    // REVERTED: Now just directly referencing the method
    [Library.createDocument, { name, epubContent, library: clientProvidedLibraryId }, { document: newDocumentId }],
    [Annotation.registerDocument, { documentId: newDocumentId, creatorId: authenticatedUserId }, {}],
    [TextSettings.createDocumentSettings, { document: newDocumentId }, {}],
  ),
  then: actions(
    [
      Requesting.respond,
      { request: request, document: newDocumentId, message: "Document created successfully." },
    ],
  ),
});

// --- Error Handling for Document Creation Flow ---

/**
 * Sync: DocumentCreationFailedAuthError
 * Catches errors from the 'where' clause (Sessioning or Library auth failure)
 * and responds to the original request with the error.
 */
export const DocumentCreationFailedAuthError: Sync = (
    { request, error: errorMessage },
) => ({
  when: actions(
      [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
  ),
  where: async (frames) => {
      return frames.filter(($) => $[errorMessage] !== undefined);
  },
  then: actions(
      [Requesting.respond, { request: request, error: errorMessage }],
  ),
});


/**
 * Sync: DocumentCreationFailedLibraryError
 * Catches errors specifically from Library.createDocument and responds.
 */
export const DocumentCreationFailedLibraryError: Sync = (
  { request, name, epubContent, library: clientProvidedLibraryId, error: errorMessage },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name, epubContent, library: clientProvidedLibraryId }, { request: request }],
    // REVERTED: Now just directly referencing the method
    [Library.createDocument, { name, epubContent, library: clientProvidedLibraryId }, { error: errorMessage }],
  ),
  then: actions(
    [Requesting.respond, { request: request, error: errorMessage }],
  ),
});

/**
 * Sync: DocumentCreationFailedAnnotationError
 * Catches errors specifically from Annotation.registerDocument and responds.
 */
export const DocumentCreationFailedAnnotationError: Sync = (
  { request, name, epubContent, session, library: clientProvidedLibraryId, newDocumentId, user: authenticatedUserId, error: errorMessage },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId }, { request: request }],
    // REVERTED: Now just directly referencing the method
    [Library.createDocument, { name, epubContent, library: clientProvidedLibraryId }, { document: newDocumentId }],
    [Annotation.registerDocument, { documentId: newDocumentId, creatorId: authenticatedUserId }, { error: errorMessage }],
  ),
  then: actions(
    [Requesting.respond, { request: request, error: errorMessage }],
  ),
});

/**
 * Sync: DocumentCreationFailedTextSettingsError
 * Catches errors specifically from TextSettings.createDocumentSettings and responds.
 */
export const DocumentCreationFailedTextSettingsError: Sync = (
  { request, name, epubContent, session, library: clientProvidedLibraryId, newDocumentId, user: authenticatedUserId, error: errorMessage },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId }, { request: request }],
    // REVERTED: Now just directly referencing the method
    [Library.createDocument, { name, epubContent, library: clientProvidedLibraryId }, { document: newDocumentId }],
    [Annotation.registerDocument, { documentId: newDocumentId, creatorId: authenticatedUserId }, {}],
    [TextSettings.createDocumentSettings, { document: newDocumentId }, { error: errorMessage }],
  ),
  then: actions(
    [Requesting.respond, { request: request, error: errorMessage }],
  ),
});
```

***

### Actions for you to take:

1. **Replace the content of your `src/syncs/document_creation.sync.ts` (or whichever file you named it) with the updated code above.**
2. **Ensure `src/concepts/Library/LibraryConcept.ts` still has the constructor logs and the `createDocument` method's internal logs and `try...catch` block.** These are crucial for seeing the execution flow if we get past the instrumentation error.
3. **Run `deno cache --reload --force src/main.ts`** (aggressive cache clear).
4. **Run `deno run build`**.
5. **Stop and `deno run start`**.
6. **Attempt to create a document from the frontend.**
7. **Copy and paste the ENTIRE console output here.**

This should get us back to the `Missing actionId in then clause` error, which we can then investigate further with the assumption that the `actions` helper should correctly bind `this` to the instantiated concept object.
