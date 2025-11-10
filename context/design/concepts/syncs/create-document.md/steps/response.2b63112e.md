---
timestamp: 'Mon Nov 10 2025 10:18:48 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_101848.6e156fb1.md]]'
content_id: 2b63112e8978ae3e106558fc37f5e8768292cf294d155d5f4fef5f85d8c8bfd0
---

# response:

You are absolutely right! This is another common (and annoying) TypeScript conflict.

The error `Cannot find name 'document'` occurs because `document` is a well-known global object in browser environments (the DOM `document` object). When you use `document` as a variable name (which becomes a `symbol` internally in the sync engine), TypeScript gets confused, thinking you might be trying to refer to the global `document` object, which isn't available by default in a Deno backend environment.

The solution is to simply **rename the variable `document`** in your `Sync` function's parameter destructuring to something that doesn't conflict with a global browser API, like `newDocumentId`.

Let's apply this fix consistently across all relevant synchronizations in `src/syncs/document_creation.sync.ts`.

***

**file: src/syncs/document\_creation.sync.ts**

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Library, Annotation, TextSettings, Sessioning } from "@concepts";
import { ID } from "@utils/types.ts";

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
    newDocumentId, // Renamed from 'document' to avoid conflict
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
    // Proceed to create the document in the Library concept.
    [Library.createDocument, { name, epubContent, library: userOwnedLibraryId }, { document: newDocumentId /* Use new variable here */ }],
  ),
});

/**
 * Sync: DocumentCreationSuccessRegisterAnnotation
 * Fires when Library.createDocument successfully creates the document.
 * Proceeds to register this new document with the Annotation concept.
 */
export const DocumentCreationSuccessRegisterAnnotation: Sync = (
  { request, name, epubContent, session, user: authenticatedUserId, library: clientProvidedLibraryId, newDocumentId }, // Renamed here
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId }, { request: request }],
    [Library.createDocument, { name, epubContent, library: clientProvidedLibraryId }, { document: newDocumentId }], // Use new variable here
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
  { request, name, epubContent, session, user: authenticatedUserId, library: clientProvidedLibraryId, newDocumentId }, // Renamed here
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId }, { request: request }],
    [Library.createDocument, { name, epubContent, library: clientProvidedLibraryId }, { document: newDocumentId }], // Use new variable here
    [Annotation.registerDocument, { documentId: newDocumentId, creatorId: authenticatedUserId }, {}],
  ),
  then: actions(
    [
      TextSettings.createDocumentSettings,
      {
        document: newDocumentId, // Use new variable here
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
  { request, name, epubContent, session, user: authenticatedUserId, library: clientProvidedLibraryId, newDocumentId }, // Renamed here
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId }, { request: request }],
    [Library.createDocument, { name, epubContent, library: clientProvidedLibraryId }, { document: newDocumentId }], // Use new variable here
    [Annotation.registerDocument, { documentId: newDocumentId, creatorId: authenticatedUserId }, {}],
    [TextSettings.createDocumentSettings, { document: newDocumentId }, {}], // Use new variable here
  ),
  then: actions(
    [
      Requesting.respond,
      { request: request, document: newDocumentId, message: "Document created successfully." }, // Use new variable here
    ],
  ),
});

// --- Error Handling for Document Creation Flow ---
// These error syncs will now correctly match on the 'error' symbol being bound in the frames.

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
  { request, name, epubContent, session, library: clientProvidedLibraryId, newDocumentId, user: authenticatedUserId, error: errorMessage }, // Renamed here
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId }, { request: request }],
    [Library.createDocument, { name, epubContent, library: clientProvidedLibraryId }, { document: newDocumentId }], // Use new variable here
    [Annotation.registerDocument, { documentId: newDocumentId, creatorId: authenticatedUserId }, { error: errorMessage }], // Use new variable here
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
  { request, name, epubContent, session, library: clientProvidedLibraryId, newDocumentId, user: authenticatedUserId, error: errorMessage }, // Renamed here
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId }, { request: request }],
    [Library.createDocument, { name, epubContent, library: clientProvidedLibraryId }, { document: newDocumentId }], // Use new variable here
    [Annotation.registerDocument, { documentId: newDocumentId, creatorId: authenticatedUserId }, {}],
    [TextSettings.createDocumentSettings, { document: newDocumentId }, { error: errorMessage }], // Use new variable here
  ),
  then: actions(
    [Requesting.respond, { request: request, error: errorMessage }],
  ),
});

// ... (remaining syncs for login/logout/account creation, if applicable) ...
```

***

**Summary of Changes:**

* Everywhere `document` was used as a *variable name* (a symbol) in the `Sync` function's parameter destructuring, it has been renamed to `newDocumentId`.
* All subsequent references to this variable within the `when`, `where`, and `then` clauses (both as input values and output bindings) have been updated to `newDocumentId`.
* The *key* `document` (e.g., `document: newDocumentId`) in the action patterns remains `document` because that is the *parameter name* expected by the underlying concept action (e.g., `Library.createDocument`'s second output is named `document`).

**Actions for you to take:**

1. **Replace the content of your `src/syncs/document_creation.sync.ts` (or whichever file you named it) with the updated code above.**
2. **Run `deno cache --reload --force src/main.ts`** (aggressive cache clear).
3. **Run `deno run build`**.
4. **Stop and `deno run start`**.
5. **Attempt to create a document from the frontend.**
6. **Copy and paste the ENTIRE console output here.**

This should resolve the "Cannot find name 'document'" TypeScript error. Now, let's see if the timeout persists, or if we finally get to see logs from `LibraryConcept.createDocument`!
