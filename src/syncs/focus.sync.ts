import { actions, Sync } from "@engine";
import { FocusStats, Library, Requesting } from "@concepts";
import { LibraryDoc } from "@concepts/Library/LibraryConcept.ts";
import { FocusSessionDocument } from "@concepts/FocusStats/FocusStatsConcept.ts";
import { ID } from "@utils/types.ts";

/**
 * Handles an incoming request to open a document. It authorizes the user,
 * starts a focus session, and responds to the request.
 */
export const HandleOpenDocumentRequest: Sync = (
  { request, user, document, libraryDoc, libraryId },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/openDocument", user, document }, {
      request,
    }],
  ),
  where: async (frames) => {
    // BUG FIX: Use the destructuring pattern.
    // This tells the engine: "For each result object from the query, look for a
    // 'library' property. If you find it, bind its value to a new variable called `libraryDoc`."
    frames = await frames.query(
      Library._getLibraryByUser,
      { user },
      { library: libraryDoc },
    );

    const authorizedFrames = frames.filter(($) => {
      // Now, $[libraryDoc] will either be the LibraryDoc object or undefined.
      // This check is now safe and correct.
      const doc = $[libraryDoc] as LibraryDoc | undefined;
      return doc && doc.documents.includes($[document] as ID);
    });

    if (authorizedFrames.length === 0) {
      return authorizedFrames;
    }

    // If authorized, extract the library's ID for the next step.
    return authorizedFrames.map(($) => {
      const doc = $[libraryDoc] as LibraryDoc;
      return {
        ...$,
        [libraryId]: doc._id,
      };
    });
  },
  then: actions(
    [FocusStats.startSession, { user, document, library: libraryId }],
    [Requesting.respond, { request, document }],
  ),
});

/**
 * Handles an incoming request to close a document. It authorizes the user,
 * finds and ends the active focus session, and responds to the request.
 */
export const HandleCloseDocumentRequest: Sync = (
  { request, user, document, libraryDoc, sessionDoc, focusSessionId },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/closeDocument", user, document }, {
      request,
    }],
  ),
  where: async (frames) => {
    // First, authorize the user using the same safe destructuring pattern.
    frames = await frames.query(
      Library._getLibraryByUser,
      { user },
      { library: libraryDoc },
    );

    let authorizedFrames = frames.filter(($) => {
      const doc = $[libraryDoc] as LibraryDoc | undefined;
      return doc && doc.documents.includes($[document] as ID);
    });

    if (authorizedFrames.length === 0) return authorizedFrames;

    // Next, find the active focus session for this user and document.
    // Use the destructuring pattern again for safety.
    authorizedFrames = await authorizedFrames.query(
      FocusStats._getSessions,
      { user },
      { focusSession: sessionDoc },
    );

    return authorizedFrames
      .filter(($) => {
        const session = $[sessionDoc] as FocusSessionDocument | undefined;
        return session && session.document === $[document] &&
          session.endTime === null;
      })
      .map(($) => {
        const activeSession = $[sessionDoc] as FocusSessionDocument;
        return {
          ...$,
          [focusSessionId]: activeSession._id,
        };
      });
  },
  then: actions(
    [FocusStats.endSession, { focusSession: focusSessionId }],
    [Requesting.respond, { request, document }],
  ),
});
