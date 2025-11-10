---
timestamp: 'Mon Nov 10 2025 16:40:53 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_164053.c65f2ae7.md]]'
content_id: 90cf0dce7e19accb0dff4d87d7c0dfb7e77fa252a1af0c56090643abfdd0eced
---

# file: src/syncs/focus.sync.ts

```typescript
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
  { request, user, document, libraryResult, libraryId },
) => ({
  // 1. WHEN: Trigger on the specific API request for opening a document.
  when: actions(
    [Requesting.request, { path: "/Library/openDocument", user, document }, {
      request,
    }],
  ),
  // 2. WHERE: Authorize the request and gather necessary data.
  where: async (frames) => {
    // Check if the user has the document in their library.
    frames = await frames.query(
      Library._getLibraryByUser,
      { user },
      { libraryResult },
    );

    return frames
      // Filter for successful library lookups where the document is present.
      .filter(($) => {
        const result = $[libraryResult] as
          | { library?: LibraryDoc; error?: string };
        // BUG FIX: Cast the document from the frame to ID, not string.
        return result && result.library &&
          result.library.documents.includes($[document] as ID);
      })
      // If authorized, extract the library's ID for the next step.
      .map(($) => {
        const doc = ($[libraryResult] as { library: LibraryDoc }).library;
        return {
          ...$,
          [libraryId]: doc._id,
        };
      });
  },
  // 3. THEN: If the 'where' clause passed, perform actions and respond.
  then: actions(
    // Start the focus session.
    [FocusStats.startSession, { user, document, library: libraryId }],
    // Respond to the original request to prevent a timeout.
    [Requesting.respond, { request, document }],
  ),
});

/**
 * Handles an incoming request to close a document. It authorizes the user,
 * finds and ends the active focus session, and responds to the request.
 */
export const HandleCloseDocumentRequest: Sync = (
  { request, user, document, libraryResult, sessionResult, focusSessionId },
) => ({
  // 1. WHEN: Trigger on the specific API request for closing a document.
  when: actions(
    [Requesting.request, { path: "/Library/closeDocument", user, document }, {
      request,
    }],
  ),
  // 2. WHERE: Authorize and find the active session to end.
  where: async (frames) => {
    // First, authorize the user against the document.
    frames = await frames.query(
      Library._getLibraryByUser,
      { user },
      { libraryResult },
    );

    let authorizedFrames = frames.filter(($) => {
      const result = $[libraryResult] as
        | { library?: LibraryDoc; error?: string };
      // BUG FIX: Cast the document from the frame to ID, not string.
      return result && result.library &&
        result.library.documents.includes($[document] as ID);
    });

    // If authorization fails, return empty frames so the 'then' clause doesn't run.
    if (authorizedFrames.length === 0) return authorizedFrames;

    // Next, find the active focus session for this user and document.
    authorizedFrames = await authorizedFrames.query(
      FocusStats._getSessions,
      { user },
      { sessionResult },
    );

    return authorizedFrames
      .filter(($) => {
        const result = $[sessionResult] as
          | { focusSession?: FocusSessionDocument; error?: string };
        return result && result.focusSession &&
          result.focusSession.document === $[document] &&
          result.focusSession.endTime === null;
      })
      .map(($) => {
        const activeSession =
          ($[sessionResult] as { focusSession: FocusSessionDocument })
            .focusSession;
        return {
          ...$,
          [focusSessionId]: activeSession._id,
        };
      });
  },
  // 3. THEN: If an active session was found, end it and respond.
  then: actions(
    // End the specific focus session.
    [FocusStats.endSession, { focusSession: focusSessionId }],
    // Respond to the original request.
    [Requesting.respond, { request, document }],
  ),
});
```
