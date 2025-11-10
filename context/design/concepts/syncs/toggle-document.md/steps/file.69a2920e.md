---
timestamp: 'Mon Nov 10 2025 15:59:43 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_155943.bde0ed02.md]]'
content_id: 69a2920e05799cd8f42de76a0c39e207b31aa79c2f8fd9d4843b0f2bf35a7fc8
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
export const StartFocusOnOpen: Sync = (
  { user, document, libraryDoc, libraryId },
) => ({
  when: actions(
    // Trigger when a document is successfully opened.
    // This gives us the `user` and `document` variables.
    [Library.openDocument, { user, document }, { document }],
  ),
  where: async (frames) => {
    // The `FocusStats.startSession` action requires a `library` ID.
    // We must query the Library concept to get it.
    frames = await frames.query(
      Library._getLibraryByUser,
      { user },
      // The query returns an array of objects like `{ library: LibraryDoc }`.
      // We bind the inner `LibraryDoc` object to a new variable, `libraryDoc`.
      { library: libraryDoc },
    );

    // Now, we transform the frames. We filter for successful queries and
    // create a new binding for `libraryId` containing just the ID.
    return frames
      .filter(($) => $[libraryDoc] && !("error" in $[libraryDoc]))
      .map(($) => {
        // We know `$[libraryDoc]` is a valid `LibraryDoc` here.
        const doc = $[libraryDoc] as LibraryDoc;
        return {
          ...$,
          [libraryId]: doc._id, // Create the new `libraryId` binding.
        };
      });
  },
  then: actions(
    // The action now receives `user` and `document` from the `when` clause,
    // and `libraryId` from the `where` clause. We map `libraryId` to the
    // `library` parameter required by `startSession`.
    [FocusStats.startSession, { user, document, library: libraryId }],
  ),
});

/**
 * When a user closes a document, this synchronization finds the corresponding
 * active focus session and marks it as ended.
 */
export const EndFocusOnClose: Sync = ({ user, document, sessionDoc }) => ({
  when: actions(
    // Trigger when a document is successfully closed.
    [Library.closeDocument, { user, document }, { document }],
  ),
  where: async (frames) => {
    // First, get all focus sessions for the user.
    frames = await frames.query(
      FocusStats._getSessions,
      { user },
      // The query returns an array of `{ focusSession: FocusSessionDocument }`.
      // We bind the inner `FocusSessionDocument` object to our `sessionDoc` variable.
      { focusSession: sessionDoc },
    );

    // Next, filter these frames to find the single active session for the specific document.
    return frames.filter(($) => {
      const doc = $[sessionDoc] as FocusSessionDocument;
      // We must check that `doc` exists, is not an error object from the query,
      // matches the document from the `when` clause, and is still active (`endTime` is null).
      return doc && !("error" in doc) && doc.document === $[document] &&
        doc.endTime === null;
    });
  },
  // The `then` clause can be a function that receives a frame and returns an `ActionList`.
  // An ActionList is an array of `[Action, Input]` tuples.
  then: (frame) => {
    // We are guaranteed that `frame` is one of the frames that passed the `where` filter.
    const activeSession = frame[sessionDoc] as FocusSessionDocument;
    return [
      [
        FocusStats.endSession,
        { focusSession: activeSession._id },
      ],
    ];
  },
});
```
