---
timestamp: 'Mon Nov 10 2025 10:21:29 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_102129.e26488bf.md]]'
content_id: c6169252a5a25687909b19396a319c2f4cc4f44cc35c153ca577c8da844f66c0
---

# response:

You're encountering a new, very specific error: `[Requesting] Error processing request: Missing actionId in `then` clause.`

This error is thrown by the synchronization engine and indicates a fundamental problem with how an action is specified in a `then` clause. It typically means one of two things:

1. The "action ID" (i.e., the function reference like `Library.createDocument`) is `undefined`, `null`, or not a function when the engine attempts to resolve and dispatch it.
2. The `actions` helper function received an invalid argument where an action pattern (`[Concept.action, input, output]`) was expected.

Since you've meticulously followed the syntax, the problem is almost certainly the first scenario: `Library.createDocument` itself is not resolving to a valid function at the point the `then` clause is being processed by the engine. The absence of *any* `[LibraryConcept.createDocument]` logs confirms that the method is not even being entered, suggesting the problem is in the dispatch itself.

Let's pinpoint exactly what `Library.createDocument` looks like to the synchronization engine.

***

### Step 1: Add Diagnostic Logs at Sync File Startup

We'll add explicit checks at the very top of your `document_creation.sync.ts` file to see if the `Library` concept and its `createDocument` method are correctly imported and recognized as functions.

**Edit `src/syncs/document_creation.sync.ts`:**
(Add these `console.log`s directly below your imports)

```typescript
// file: src/syncs/document_creation.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, Library, Annotation, TextSettings, Sessioning } from "@concepts"; // <-- Ensure Library is imported
import { ID } from "@utils/types.ts";

// --- ADD THESE LOGS HERE ---
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
    // This is the line that causes the error, indicating Library.createDocument might not be a function
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

### Step 2: Ensure `LibraryConcept.ts` has Constructor Logs

Also, make sure `src/concepts/Library/LibraryConcept.ts` has the constructor logs that were added previously to confirm its collections are initialized:

```typescript
// file: src/concepts/Library/LibraryConcept.ts

// ... (imports and interfaces) ...

export default class LibraryConcept {
  libraries: Collection<LibraryDoc>;
  documents: Collection<DocumentDoc>;

  constructor(private readonly db: Db) {
    this.libraries = this.db.collection(PREFIX + "libraries");
    this.documents = this.db.collection(PREFIX + "documents");
    // --- CONFIRM THESE LOGS ARE PRESENT ---
    console.log(`[LibraryConcept.constructor] Initialized collections:`);
    console.log(`[LibraryConcept.constructor]   - Libraries: ${this.libraries.collectionName}`);
    console.log(`[LibraryConcept.constructor]   - Documents: ${this.documents.collectionName}`);
    // --- END LOGS ---
  }

  // ... (rest of the file, ensure createDocument has its logs/try-catch) ...
}
```

### Step 3: Perform a Clean Rebuild and Restart

This is critical to ensure Deno is running the absolute latest version of your code and resolving all modules cleanly.

1. **Save** all modified files (`document_creation.sync.ts` and `LibraryConcept.ts`).
2. Open your terminal in the project root.
3. Run `deno cache --reload --force src/main.ts` (aggressive cache clear).
4. Run `deno run build`.
5. Stop your server (if it's running).
6. Run `deno run start`.

### Step 4: Retest and Provide Full Console Output

1. Attempt to create a document from the frontend.
2. **Copy and paste the *entire* console output here.** This includes all server startup logs (especially the new constructor logs), and the request processing logs.

The startup logs from the sync file and the concept constructor will definitively tell us if `Library.createDocument` is a valid function reference when the syncs are loaded, which is what the `Missing actionId` error is complaining about.
