import { actions, Frames, Sync } from "@engine";
import {
  Annotation,
  Library,
  Requesting,
  Sessioning,
  TextSettings,
} from "@concepts";
// FIX: Import the LibraryDoc type to use for type assertion.
import type { LibraryDoc } from "@concepts/Library/LibraryConcept.ts";

/**
 * Sync: CreateDocumentSuccessFlow
 * This single synchronization handles the entire successful process of creating a document.
 * It uses the 'where' clause to perform all necessary checks and queries before proceeding.
 */
export const CreateDocumentSuccessFlow: Sync = (
  // FIX: Rename 'library' from request to 'clientLibraryId' to avoid name collision.
  // Declare 'userLibrary' to hold the full library object from the query.
  {
    request,
    name,
    epubContent,
    session,
    library: clientLibraryId,
    user,
    document,
    userLibrary,
  },
) => ({
  when: actions(
    // 1. Match the initial incoming HTTP request to get all input bindings.
    [
      Requesting.request,
      {
        path: "/Library/createDocument",
        name,
        epubContent,
        session,
        library: clientLibraryId,
      },
      { request },
    ],
  ),
  where: async (frames) => {
    // 2. Authenticate the user by getting the user ID from the session.
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    if (frames.length === 0) return new Frames(); // Stop if user could not be authenticated

    // 3. Authorize by getting the user's actual library object.
    // The query result is bound to the 'userLibrary' variable.
    frames = await frames.query(Library._getLibraryByUser, { user }, {
      library: userLibrary,
    });
    if (frames.length === 0) return new Frames(); // Stop if user has no library

    // 4. Perform the authorization check.
    // FIX: Use a type assertion `($[userLibrary] as LibraryDoc)` to inform TypeScript of the object's shape.
    return frames.filter(($) =>
      $[clientLibraryId] === ($[userLibrary] as LibraryDoc)?._id
    );
  },
  then: actions(
    // 5. If all 'where' checks passed, execute the creation actions.
    // The library ID from the request is used, as it has been validated.
    [Library.createDocument, { name, epubContent, library: clientLibraryId }, {
      document,
    }],
    [
      Annotation.registerDocument,
      { documentId: document, creatorId: user },
      {},
    ],
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
// Each sync below handles a specific failure point in the creation process.

/**
 * Sync: CreateDocumentFailed_InvalidSession
 * Catches requests where the session ID is invalid or expired.
 */
export const CreateDocumentFailed_InvalidSession: Sync = (
  { request, session, authError, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument", session }, {
      request,
    }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, {
      error: authError,
    });
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
    [Requesting.request, { path: "/Library/createDocument", session }, {
      request,
    }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    if (frames.length === 0) return new Frames();

    frames = await frames.query(Library._getLibraryByUser, { user }, {
      error: libraryError,
    });
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
  {
    request,
    session,
    user,
    library: clientLibraryId,
    userLibrary,
    fullErrorMsg,
  },
) => ({
  when: actions(
    [Requesting.request, {
      path: "/Library/createDocument",
      session,
      library: clientLibraryId,
    }, { request }],
  ),
  where: async (frames) => {
    frames = await frames.query(Sessioning.getUser, { session }, { user });
    if (frames.length === 0) return new Frames();

    frames = await frames.query(Library._getLibraryByUser, { user }, {
      library: userLibrary,
    });
    if (frames.length === 0) return new Frames();

    // FIX: Use the same type assertion here.
    return frames
      .filter(($) => $[clientLibraryId] !== ($[userLibrary] as LibraryDoc)?._id)
      .map(($) => ({
        ...$,
        [fullErrorMsg]:
          "Authorization failed: The provided library ID does not belong to the authenticated user.",
      }));
  },
  then: actions(
    [Requesting.respond, { request, error: fullErrorMsg }],
  ),
});

/**
 * Sync: CreateDocumentFailed_ActionError
 * Catches any errors that occur during the 'then' actions of the success flow.
 */
export const CreateDocumentFailed_ActionError: Sync = (
  { request, error, fullErrorMsg },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request }],
    // This pattern now correctly uses 'error' as the variable to bind to.
    [Library.createDocument, {}, { error }],
    [Annotation.registerDocument, {}, { error }],
    [TextSettings.createDocumentSettings, {}, { error }],
  ),
  where: async (frames) => {
    return frames.map(($) => ({
      ...$,
      [fullErrorMsg]: `Document creation process failed: ${String($[error])}`,
    }));
  },
  then: actions(
    [Requesting.respond, { request, error: fullErrorMsg }],
  ),
});
