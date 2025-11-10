---
timestamp: 'Mon Nov 10 2025 12:11:39 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_121139.1cd8e953.md]]'
content_id: 90772f047d9e2fe0a5dbecae21867026cdc113b6f59b8add671d62b6ea5e1a5c
---

# response:

You are absolutely correct. Your analysis is spot-on, and I apologize for my repeated failures to grasp this fundamental concept. You have been debugging my flawed code, not the other way around, and your last prompt shows you understand the engine's mechanics better than I have demonstrated.

I have been operating under the incorrect assumption that a single `then` clause can execute actions sequentially, with the output of one becoming the input for the next within the same clause. **You are 100% right that this is wrong.**

### Why You Are Correct: The Mechanics of `then`

The `then` clause is **declarative, not imperative**. It is a list of actions that the engine should schedule for execution. All actions in the list are planned based on the single, final frame that comes out of the `where` clause. The output of the first action in the list is **not available** to the second action in the same list because the bindings for the entire `then` clause are determined *before* any of its actions are executed.

This means your proposed solution is exactly the right one: **we need to chain synchronizations, where the successful completion of one action becomes the trigger for the next sync.**

I will now provide the correct implementation based on this principle. Please **replace the entire content of your `src/syncs/create_document.sync.ts` file** with the code below.

***

**File: `src/syncs/create_document.sync.ts`**

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Library, Annotation, TextSettings, Sessioning } from "@concepts";
import type { LibraryDoc } from "@concepts/Library/LibraryConcept.ts";

/**
 * Sync 1: Initial Request & Document Creation
 * This sync handles the initial request, performs all validation in the 'where' clause,
 * and if successful, triggers the first action in the chain: creating the document.
 */
export const CreateDocumentRequest: Sync = (
  { request, name, epubContent, session, library: clientLibraryId, user, document, userLibrary },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/createDocument", name, epubContent, session, library: clientLibraryId },
      { request },
    ],
  ),
  where: async (frames) => {
    // Authenticate the user.
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    if (frames.length === 0) return new Frames();

    // Get the user's library.
    frames = await frames.query(Library._getLibraryByUser, { user }, { library: userLibrary });
    if (frames.length === 0) return new Frames();

    // Authorize the request.
    return frames.filter(($) => $[clientLibraryId] === ($[userLibrary] as LibraryDoc)?._id);
  },
  then: actions(
    // This is the ONLY action in this 'then' clause.
    // It creates the document and its output will trigger the next sync in the chain.
    [Library.createDocument, { name, epubContent, library: clientLibraryId }, { document }],
  ),
});

/**
 * Sync 2: Register Document with Annotation
 * This sync is triggered by the successful creation of a document.
 */
export const RegisterDocumentOnCreation: Sync = (
  { request, user, document }, // We need 'user' and 'document' from the previous steps.
) => ({
  when: actions(
    // Match the original request to maintain context.
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    // Match the successful creation of the document, which binds the 'document' variable.
    [Library.createDocument, {}, { document }],
  ),
  where: async (frames) => {
    // We need the user ID again. Re-querying is the most robust way to ensure we have it.
    // The frame from the 'when' clause contains the 'session' from the original request.
    const { session } = frames[0];
    return await frames.query(Sessioning.getUser, { session }, { user });
  },
  then: actions(
    // The ONLY action is to register the document.
    [Annotation.registerDocument, { documentId: document, creatorId: user }, {}],
  ),
});

/**
 * Sync 3: Create Document Settings
 * This sync is triggered by the successful registration of the document.
 */
export const CreateSettingsOnRegistration: Sync = (
  { request, document }, // We only need 'document' from the previous steps.
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [Library.createDocument, {}, { document }],
    [Annotation.registerDocument, { documentId: document }, {}], // Match successful registration.
  ),
  then: actions(
    // The ONLY action is to create text settings.
    [
      TextSettings.createDocumentSettings,
      { document, font: "serif", fontSize: 16, lineHeight: 24 },
      {},
    ],
  ),
});

/**
 * Sync 4: Respond to Client
 * This final sync in the chain is triggered by the successful creation of text settings.
 * Its only job is to respond to the original request, preventing a timeout.
 */
export const RespondOnCompletion: Sync = (
  { request, document },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [Library.createDocument, {}, { document }],
    [Annotation.registerDocument, { documentId: document }, {}],
    [TextSettings.createDocumentSettings, { document }, {}], // Match the final step.
  ),
  then: actions(
    // The ONLY action is to respond.
    [
      Requesting.respond,
      { request, document, message: "Document created successfully." },
    ],
  ),
});


// --- ERROR HANDLING FOR THE CHAIN ---
// Each error sync is now simple and targets a single point of failure.

/**
 * Catches errors during the validation phase (e.g., invalid session, no library).
 */
export const CreateDocumentFailed_ValidationError: Sync = (
  { request, session, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", session }, { request }],
  ),
  where: async (frames) => {
    const { user } = frames.vars();
    const { userLibrary } = frames.vars();

    const userFrames = await frames.query(Sessioning.getUser, { session }, { user });
    if (userFrames.length === 0) {
      return frames.map(($) => ({ ...$, [fullErrorMsg]: "Authentication failed: Invalid session." }));
    }

    const libraryFrames = await userFrames.query(Library._getLibraryByUser, { user }, { library: userLibrary });
    if (libraryFrames.length === 0) {
      return userFrames.map(($) => ({ ...$, [fullErrorMsg]: "Authorization failed: No library found for user." }));
    }

    const authorizedFrames = libraryFrames.filter(($) => $[frames.vars().library] === ($[userLibrary] as LibraryDoc)?._id);
    if (authorizedFrames.length === 0) {
      return libraryFrames.map(($) => ({ ...$, [fullErrorMsg]: "Authorization failed: Provided library ID does not match user's library." }));
    }

    return new Frames(); // If all checks pass, this error sync produces no frames.
  },
  then: actions(
    [Requesting.respond, { request, error: fullErrorMsg }],
  ),
});

/**
 * Catches an error from the Library.createDocument action.
 */
export const CreateDocumentFailed_LibraryError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [Library.createDocument, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error: `Document creation failed: ${String(error)}` }],
  ),
});

/**
 * Catches an error from the Annotation.registerDocument action.
 */
export const CreateDocumentFailed_AnnotationError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [Annotation.registerDocument, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error: `Annotation registration failed: ${String(error)}` }],
  ),
});

/**
 * Catches an error from the TextSettings.createDocumentSettings action.
 */
export const CreateDocumentFailed_TextSettingsError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [TextSettings.createDocumentSettings, {}, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error: `Text settings creation failed: ${String(error)}` }],
  ),
});
```
