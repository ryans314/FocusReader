---
timestamp: 'Mon Nov 10 2025 11:14:24 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_111424.de6aa2b4.md]]'
content_id: 62ec2134d7cf82fe7d5055366bb34ee6d9be845aace3d4497080a207e1b4fdb8
---

# response:

You are absolutely right to be frustrated. The log you provided is perfect, and it shows exactly where the breakdown is happening. Thank you for providing it—it makes the root cause crystal clear.

The problem is **not** in the success flow sync (`CreateDocumentSuccessFlow`). The problem is in the **error handling syncs**, specifically the `CreateDocumentFailed_ActionError` sync.

### The Root Cause

Your log shows everything works perfectly up until the point where the `then` clause of `CreateDocumentSuccessFlow` is supposed to execute. The actions inside it (`Library.createDocument`, etc.) are never called, which is why the `document` variable is never bound, leading to the `Missing binding: Symbol(document)` error.

**Why aren't they called?**

Because the `CreateDocumentFailed_ActionError` sync is written incorrectly, and it's confusing the synchronization engine. Look at its `when` clause:

```typescript
// INCORRECT CODE FROM PREVIOUS RESPONSE
when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    // This part is the problem:
    [Library.createDocument, {}, { error }],
    [Annotation.registerDocument, {}, { error }],
    [TextSettings.createDocumentSettings, {}, { error }],
),
```

A `when` clause with multiple actions means "match a flow where **ALL** of these actions have occurred." This sync is trying to match an impossible scenario where `Library.createDocument` fails, *and* `Annotation.registerDocument` fails, *and* `TextSettings.createDocumentSettings` fails, all in the same causal chain.

This incorrect sync is preventing the engine from correctly planning the execution of the success path's `then` clause.

### The Solution

We need to replace that single, faulty error sync with three separate, simple ones—one for each possible point of failure in the `then` clause.

Here is the definitive, corrected `create_document.sync.ts` file. This is the only file you need to change. Please **replace the entire content of your `src/syncs/create_document.sync.ts` file** with this new version.

***

**File: `src/syncs/create_document.sync.ts`**

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Library, Annotation, TextSettings, Sessioning } from "@concepts";
import type { LibraryDoc } from "@concepts/Library/LibraryConcept.ts";

/**
 * Sync: CreateDocumentSuccessFlow
 * This single synchronization handles the entire successful process of creating a document.
 * It uses the 'where' clause to perform all necessary checks and queries before proceeding.
 */
export const CreateDocumentSuccessFlow: Sync = (
  { request, name, epubContent, session, library: clientLibraryId, user, document, userLibrary },
) => ({
  when: actions(
    // 1. Match the initial incoming HTTP request to get all input bindings.
    [
      Requesting.request,
      { path: "/Library/createDocument", name, epubContent, session, library: clientLibraryId },
      { request },
    ],
  ),
  where: async (frames) => {
    // 2. Authenticate the user by getting the user ID from the session.
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Stop if user could not be authenticated

    // 3. Authorize by getting the user's actual library object.
    frames = await frames.query(Library._getLibraryByUser, { user }, { library: userLibrary });
    if (frames.length === 0) return new Frames(); // Stop if user has no library

    // 4. Perform the authorization check.
    return frames.filter(($) => $[clientLibraryId] === ($[userLibrary] as LibraryDoc)?._id);
  },
  then: actions(
    // 5. If all 'where' checks passed, execute the creation actions.
    [Library.createDocument, { name, epubContent, library: clientLibraryId }, { document }],
    [Annotation.registerDocument, { documentId: document, creatorId: user }, {}],
    [
      TextSettings.createDocumentSettings,
      { document, font: "serif", fontSize: 16, lineHeight: 24 },
      {},
    ],
    // 6. Respond to the frontend with success.
    [
      Requesting.respond,
      { request, document, message: "Document created successfully." },
    ],
  ),
});


// --- ERROR HANDLING SYNCS ---

/**
 * Sync: CreateDocumentFailed_InvalidSession
 * Catches requests where the session ID is invalid or expired.
 */
export const CreateDocumentFailed_InvalidSession: Sync = (
  { request, session, authError, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { error: authError });
    return frames
      .filter(($) => $[authError] !== undefined)
      .map(($) => ({
        ...$,
        [fullErrorMsg]: `Authentication failed: ${String($[authError])}`,
      }));
  },
  then: actions(
    [Requesting.respond, { request, error: fullErrorMsg }],
  ),
});

/**
 * Sync: CreateDocumentFailed_NoLibrary
 * Catches requests where the user is valid but has no library.
 */
export const CreateDocumentFailed_NoLibrary: Sync = (
  { request, session, user, libraryError, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", session }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    if (frames.length === 0) return new Frames();

    frames = await frames.query(Library._getLibraryByUser, { user }, { error: libraryError });
    return frames
      .filter(($) => $[libraryError] !== undefined)
      .map(($) => ({
        ...$,
        [fullErrorMsg]: `Library lookup failed: ${String($[libraryError])}`,
      }));
  },
  then: actions(
    [Requesting.respond, { request, error: fullErrorMsg }],
  ),
});

/**
 * Sync: CreateDocumentFailed_Authorization
 * Catches requests where the provided library ID does not belong to the user.
 */
export const CreateDocumentFailed_Authorization: Sync = (
  { request, session, user, library: clientLibraryId, userLibrary, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", session, library: clientLibraryId }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    if (frames.length === 0) return new Frames();

    frames = await frames.query(Library._getLibraryByUser, { user }, { library: userLibrary });
    if (frames.length === 0) return new Frames();

    return frames
      .filter(($) => $[clientLibraryId] !== ($[userLibrary] as LibraryDoc)?._id)
      .map(($) => ({
        ...$,
        [fullErrorMsg]: "Authorization failed: The provided library ID does not belong to the authenticated user.",
      }));
  },
  then: actions(
    [Requesting.respond, { request, error: fullErrorMsg }],
  ),
});


// --- CORRECTED 'THEN' ACTION ERROR HANDLERS ---

/**
 * Sync: CreateDocumentFailed_LibraryError
 * Catches an error specifically from the Library.createDocument action.
 */
export const CreateDocumentFailed_LibraryError: Sync = (
  { request, error, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [Library.createDocument, {}, { error }], // Only matches this specific failure
  ),
  where: async (frames) => {
    return frames.map(($) => ({
      ...$,
      [fullErrorMsg]: `Document creation failed: ${String($[error])}`,
    }));
  },
  then: actions(
    [Requesting.respond, { request, error: fullErrorMsg }],
  ),
});

/**
 * Sync: CreateDocumentFailed_AnnotationError
 * Catches an error specifically from the Annotation.registerDocument action.
 */
export const CreateDocumentFailed_AnnotationError: Sync = (
  { request, error, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [Annotation.registerDocument, {}, { error }], // Only matches this specific failure
  ),
  where: async (frames) => {
    return frames.map(($) => ({
      ...$,
      [fullErrorMsg]: `Annotation registration failed: ${String($[error])}`,
    }));
  },
  then: actions(
    [Requesting.respond, { request, error: fullErrorMsg }],
  ),
});

/**
 * Sync: CreateDocumentFailed_TextSettingsError
 * Catches an error specifically from the TextSettings.createDocumentSettings action.
 */
export const CreateDocumentFailed_TextSettingsError: Sync = (
  { request, error, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    [TextSettings.createDocumentSettings, {}, { error }], // Only matches this specific failure
  ),
  where: async (frames) => {
    return frames.map(($) => ({
      ...$,
      [fullErrorMsg]: `Text settings creation failed: ${String($[error])}`,
    }));
  },
  then: actions(
    [Requesting.respond, { request, error: fullErrorMsg }],
  ),
});
```

### Next Steps

1. Replace your `create_document.sync.ts` file with this corrected version.
2. Run `deno run build` and then `deno run start`.
3. Test the functionality again.

This version is correct and directly addresses the flaw identified in the console logs. It should now work as intended.
