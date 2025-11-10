---
timestamp: 'Mon Nov 10 2025 10:29:56 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_102956.ad9fc1e8.md]]'
content_id: b34a699895afc8c2f3bae0c91e3fc4ee81189d24c079a78459dbe79ddee7359a
---

# response:

You are absolutely right. The persistence of the `Missing actionId in `then` clause` error, despite clear startup logs, points to a very deep and subtle issue with how `Library.createDocument` is being dispatched by the synchronization engine. This error often means the function reference provided to `actions()` is either `undefined`, `null`, or not a callable function *at the moment of dispatch*, even if `typeof` correctly identified it at startup.

Since `bind()` broke framework instrumentation, and direct calls are failing, it suggests a problem in the interaction between the framework's instrumentation and the specific method.

Let's try a complete, fresh rewrite of the document creation synchronization. This time, we'll focus on extreme granularity and explicit variable usage, using the pattern that successfully resolved your login/logout issues.

This new file will be `src/syncs/document_creation.sync.ts`.

***

**Please perform the following steps carefully:**

1. **Delete your existing `src/syncs/create_document.sync.ts` (or `library_document.sync.ts`) file.**
2. **Create a new file `src/syncs/document_creation.sync.ts`** and paste the entire content from the block below into it.

***

**file: src/syncs/document\_creation.sync.ts**

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Library, Annotation, TextSettings, Sessioning } from "@concepts";
import { ID } from "@utils/types.ts";

// --- Document Creation Flow ---

/**
 * Sync: HandleCreateDocumentRequest
 * Catches the initial HTTP request to create a document,
 * performs session authentication and library ownership validation,
 * then dispatches the actual document creation.
 */
export const HandleCreateDocumentRequest: Sync = (
  {
    request,
    name: docName, // Renamed to avoid potential conflicts and for clarity
    epubContent: docContent, // Renamed for clarity
    session: userSessionId, // Renamed for clarity
    library: clientProvidedLibraryId, // The library ID provided in the frontend request
    library: userOwnedLibraryId, // The actual library ID retrieved from the DB for the authenticated user
    createdDocumentId, // Unique symbol for the new document's ID
    error: errorMessage, // Unique symbol for error messages from 'where' clause
    user: authenticatedUserId, // Unique symbol for the authenticated user's ID
  },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/createDocument", name: docName, epubContent: docContent, session: userSessionId, library: clientProvidedLibraryId },
      { request: request },
    ],
  ),
  where: async (initialFrames) => {
    let frames = initialFrames; // Work with a mutable `frames` variable

    // 1. Authenticate user via session
    frames = await frames.query(Sessioning._getUser, { session: userSessionId }, { user: authenticatedUserId });

    // If session is invalid, frames will be empty. Create an error frame.
    if (frames.length === 0) {
      return new Frames({
        [request]: initialFrames[0][request],
        [errorMessage]: "Invalid session or user not found.",
      });
    }

    // 2. Retrieve the actual library owned by this user
    frames = await frames.query(Library._getLibraryByUser, { user: authenticatedUserId }, { library: userOwnedLibraryId });

    // If user has no library, frames will be empty. Create an error frame.
    if (frames.length === 0) {
      return new Frames({
        [request]: initialFrames[0][request],
        [errorMessage]: "User does not have a library.",
      });
    }

    // 3. Validate that the requested library belongs to the user
    const validatedFrames = frames.filter(($) => $[clientProvidedLibraryId] === $[userOwnedLibraryId]);

    // If library ID mismatch, filter will make frames empty. Create an error frame.
    if (validatedFrames.length === 0) {
      return new Frames({
        [request]: initialFrames[0][request],
        [errorMessage]: "The provided library ID does not belong to the authenticated user.",
      });
    }

    return validatedFrames;
  },
  then: actions(
    // Trigger Library.createDocument. The output 'document' parameter will be bound to 'createdDocumentId' symbol.
    [Library.createDocument, { name: docName, epubContent: docContent, library: userOwnedLibraryId }, { document: createdDocumentId }],
  ),
});

/**
 * Sync: DocumentCreatedRegisterAnnotation
 * Follows successful Library.createDocument, then registers the document with the Annotation concept.
 */
export const DocumentCreatedRegisterAnnotation: Sync = (
  {
    request,
    name: docName,
    epubContent: docContent,
    session: userSessionId, // For context matching
    library: clientProvidedLibraryId, // For context matching
    user: authenticatedUserId,
    createdDocumentId,
    error: errorMessage, // For potential errors from the previous step (though caught by other syncs)
  },
) => ({
  when: actions(
    // Match the original request context.
    [Requesting.request, { path: "/Library/createDocument", name: docName, epubContent: docContent, session: userSessionId, library: clientProvidedLibraryId }, { request: request }],
    // Match the successful document creation.
    [Library.createDocument, { name: docName, epubContent: docContent, library: userOwnedLibraryId /* Use userOwnedLibraryId for matching what was *actually* created */ }, { document: createdDocumentId }],
  ),
  then: actions(
    // Trigger Annotation.registerDocument. This action returns an empty object on success or { error: string } on failure.
    [Annotation.registerDocument, { documentId: createdDocumentId, creatorId: authenticatedUserId }, {}],
  ),
});

/**
 * Sync: AnnotationRegisteredCreateTextSettings
 * Follows successful Annotation.registerDocument, then creates TextSettings for the document.
 */
export const AnnotationRegisteredCreateTextSettings: Sync = (
  {
    request,
    name: docName,
    epubContent: docContent,
    session: userSessionId, // For context matching
    library: clientProvidedLibraryId, // For context matching
    user: authenticatedUserId,
    createdDocumentId,
    error: errorMessage, // For potential errors from previous steps
    textSettingsId, // Unique symbol for the new text settings ID
  },
) => ({
  when: actions(
    // Match the original request context.
    [Requesting.request, { path: "/Library/createDocument", name: docName, epubContent: docContent, session: userSessionId, library: clientProvidedLibraryId }, { request: request }],
    // Match the successful document creation.
    [Library.createDocument, { name: docName, epubContent: docContent, library: userOwnedLibraryId }, { document: createdDocumentId }],
    // Match the successful annotation registration.
    [Annotation.registerDocument, { documentId: createdDocumentId, creatorId: authenticatedUserId }, {}],
  ),
  then: actions(
    // Trigger TextSettings.createDocumentSettings. This action returns { settings: ID } on success or { error: string } on failure.
    [
      TextSettings.createDocumentSettings,
      { document: createdDocumentId, font: "serif", fontSize: 16, lineHeight: 24 }, // Sensible defaults
      { settings: textSettingsId }, // Bind the output settings ID
    ],
  ),
});

/**
 * Sync: TextSettingsCreatedRespondSuccess
 * Final step: responds to the frontend after all creations are successful.
 */
export const TextSettingsCreatedRespondSuccess: Sync = (
  {
    request,
    name: docName,
    epubContent: docContent,
    session: userSessionId, // For context matching
    library: clientProvidedLibraryId, // For context matching
    user: authenticatedUserId,
    createdDocumentId,
    error: errorMessage, // For potential errors from previous steps
    textSettingsId, // For context matching
  },
) => ({
  when: actions(
    // Match the entire successful sequence.
    [Requesting.request, { path: "/Library/createDocument", name: docName, epubContent: docContent, session: userSessionId, library: clientProvidedLibraryId }, { request: request }],
    [Library.createDocument, { name: docName, epubContent: docContent, library: userOwnedLibraryId }, { document: createdDocumentId }],
    [Annotation.registerDocument, { documentId: createdDocumentId, creatorId: authenticatedUserId }, {}],
    [TextSettings.createDocumentSettings, { document: createdDocumentId }, { settings: textSettingsId }],
  ),
  then: actions(
    // Respond to the frontend with the final success message and the document ID.
    [Requesting.respond, { request: request, document: createdDocumentId, message: "Document created successfully." }],
  ),
});

// --- Error Handling for Document Creation Flow ---
// These syncs catch errors from any step and respond appropriately.

/**
 * Sync: DocumentCreationFailedAuthError
 * Catches validation errors from the 'where' clause of HandleCreateDocumentRequest.
 */
export const DocumentCreationFailedAuthError: Sync = (
  { request, error: errorMessage },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
  ),
  where: async (frames) => {
    // This sync fires if HandleCreateDocumentRequest's where clause
    // generated a frame that contains an 'error' binding.
    return frames.filter(($) => $[errorMessage] !== undefined);
  },
  then: actions(
    [Requesting.respond, { request: request, error: errorMessage }],
  ),
});

/**
 * Sync: DocumentCreationFailedLibraryError
 * Catches errors from Library.createDocument.
 */
export const DocumentCreationFailedLibraryError: Sync = (
  { request, name: docName, epubContent: docContent, library: clientProvidedLibraryId, error: errorMessage },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name: docName, epubContent: docContent, library: clientProvidedLibraryId }, { request: request }],
    [Library.createDocument, { name: docName, epubContent: docContent, library: clientProvidedLibraryId }, { error: errorMessage }],
  ),
  then: actions(
    [Requesting.respond, { request: request, error: errorMessage }],
  ),
});

/**
 * Sync: DocumentCreationFailedAnnotationError
 * Catches errors from Annotation.registerDocument.
 */
export const DocumentCreationFailedAnnotationError: Sync = (
  { request, name: docName, epubContent: docContent, session: userSessionId, library: clientProvidedLibraryId, user: authenticatedUserId, createdDocumentId, error: errorMessage },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name: docName, epubContent: docContent, session: userSessionId, library: clientProvidedLibraryId }, { request: request }],
    [Library.createDocument, { name: docName, epubContent: docContent, library: userOwnedLibraryId }, { document: createdDocumentId }], // Match the success for context
    [Annotation.registerDocument, { documentId: createdDocumentId, creatorId: authenticatedUserId }, { error: errorMessage }],
  ),
  then: actions(
    [Requesting.respond, { request: request, error: errorMessage }],
  ),
});

/**
 * Sync: DocumentCreationFailedTextSettingsError
 * Catches errors from TextSettings.createDocumentSettings.
 */
export const DocumentCreationFailedTextSettingsError: Sync = (
  { request, name: docName, epubContent: docContent, session: userSessionId, library: clientProvidedLibraryId, user: authenticatedUserId, createdDocumentId, error: errorMessage, textSettingsId },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", name: docName, epubContent: docContent, session: userSessionId, library: clientProvidedLibraryId }, { request: request }],
    [Library.createDocument, { name: docName, epubContent: docContent, library: userOwnedLibraryId }, { document: createdDocumentId }], // Match the success for context
    [Annotation.registerDocument, { documentId: createdDocumentId, creatorId: authenticatedUserId }, {}], // Match the success for context
    [TextSettings.createDocumentSettings, { document: createdDocumentId }, { error: errorMessage }],
  ),
  then: actions(
    [Requesting.respond, { request: request, error: errorMessage }],
  ),
});
```

***

**Crucial points in this rewrite:**

1. **Extreme Granularity:** Each step (authenticate, create doc, register annotation, create text settings, respond) is now its own chained synchronization. This forces the engine to resolve each action's output before proceeding, making failures more explicit.
2. **Clear Variable Aliasing:** Input parameters (`name`, `epubContent`, `session`) are immediately aliased (`docName`, `docContent`, `userSessionId`) in the `Sync` function's destructured parameters. This prevents any potential JavaScript global conflicts (like with `document`) and enhances clarity.
3. **Explicit `where` Clause Error Generation:** When a validation in the `where` clause fails (e.g., invalid session, library mismatch), a new `Frames` instance is explicitly created with the `request` symbol and an `errorMessage` symbol bound, which is then caught by `DocumentCreationFailedAuthError`.
4. **Consistent Matching in `when` Clauses:** Subsequent `when` clauses for chained syncs meticulously match the *successful outcomes* of preceding actions, using the bound symbols.
5. **Matching `library` parameter in `when` for `Library.createDocument`:** In cases where `Library.createDocument` is matched in a `when` clause, the `library` parameter is matched using `userOwnedLibraryId` (the validated, internal ID) for consistency, as this is what `then` clause would have used.

***

**Actions for you to take (AGAIN!):**

1. **Delete your existing `src/syncs/create_document.sync.ts` (or `library_document.sync.ts`) file.**
2. **Create a new file `src/syncs/document_creation.sync.ts`** and paste the **entire content from the block above** into it.
3. **Ensure `src/concepts/Library/LibraryConcept.ts` still has the constructor logs and the `createDocument` method's internal logs and `try...catch` block.** These are *still* our only way to confirm if the method is being entered.
4. **Ensure `src/concepts/Annotation/AnnotationConcept.ts` and `src/concepts/TextSettings/TextSettingsConcept.ts` also have their internal logs and `try...catch` blocks** in their respective `registerDocument` and `createDocumentSettings` methods.
5. **Run `deno cache --reload --force src/main.ts`** (aggressive cache clear).
6. **Run `deno run build`**.
7. **Stop and `deno run start`**.
8. **Attempt to create a document from the frontend.**
9. **Copy and paste the ENTIRE console output here.** This includes all server startup logs (especially `LibraryConcept.constructor` and the sync startup diagnostics), and the full request processing logs.

This is the most robust and explicit way to write these synchronizations, and it *should* eliminate any ambiguity leading to `Missing actionId`. Let's see what the logs tell us now.
