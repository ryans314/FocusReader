---
timestamp: 'Mon Nov 10 2025 15:52:35 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_155235.8e71e4e4.md]]'
content_id: 52426bc2471fe85abf76ef4d28f82d4f34004ffc2af2d41a7eea4bfc8bd8f5bb
---

# file: src/syncs/focus.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { FocusStats, Library } from "@concepts";
import { LibraryDoc } from "@concepts/Library/LibraryConcept.ts";
import { FocusSessionDocument } from "@concepts/FocusStats/FocusStatsConcept.ts";

/**
 * When a user successfully opens a document, this synchronization triggers
 * the start of a new focus session for that user and document.
 */
export const StartFocusOnOpen: Sync = ({ user, document, library }) => ({
  when: actions(
    [Library.openDocument, { user, document }, { document }],
  ),
  where: async (frames) => {
    // The FocusStats.startSession action requires the user's library ID.
    // We query for the user's library document.
    frames = await frames.query(
      Library._getLibraryByUser,
      { user },
      { library }, // Binds the full LibraryDoc to the `library` variable
    );

    // BUG FIX (1): Filter for successful queries and re-bind the `library` variable
    // to hold the ID, which is what the `then` clause action expects.
    return frames
      .filter(($) => $[library]) // Ensure the library document was found
      .map(($) => {
        const libDoc = $[library] as LibraryDoc;
        return {
          ...$,
          [library]: libDoc._id, // Re-bind `library` variable to be the ID
        };
      });
  },
  then: actions(
    // With the `library` variable now holding the ID, this action will fire correctly.
    [FocusStats.startSession, { user, document, library }],
  ),
});

/**
 * When a user closes a document, this synchronization finds the corresponding
 * active focus session and marks it as ended.
 */
export const EndFocusOnClose: Sync = ({ user, document, session }) => ({
  when: actions(
    [Library.closeDocument, { user, document }, { document }],
  ),
  where: async (frames) => {
    // BUG FIX (2): The query now type-checks correctly because _getSessions returns Promise<Array>.
    // BUG FIX (3): The output pattern `{ focusSession: session }` correctly binds the
    // FocusSessionDocument from the query result to our `session` variable.
    frames = await frames.query(
      FocusStats._getSessions,
      { user },
      { focusSession: session },
    );

    // Then, filter these sessions to find the one that is for the correct document
    // and is still active (its `endTime` is null).
    return frames.filter(($) => {
      // BUG FIX (3): Access the session document directly from the bound `session` variable.
      const s = $[session] as FocusSessionDocument;
      return s && s.document === $[document] && s.endTime === null;
    });
  },
  then: actions(
    // BUG FIX (4): The 'where' clause provides frames with a correctly-typed `session` variable.
    // We can now access its `_id` property safely.
    (frame) => [
      FocusStats.endSession,
      { focusSession: (frame[session] as FocusSessionDocument)._id },
    ],
  ),
});
```
