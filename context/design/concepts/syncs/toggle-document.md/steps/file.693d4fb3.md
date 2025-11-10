---
timestamp: 'Mon Nov 10 2025 15:46:56 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_154656.3bfbaedd.md]]'
content_id: 693d4fb3e3aeb5c90f160a2ba9bd40f1c9fb22ddc696c2edff80774a08746291
---

# file: src/syncs/focus.sync.ts

```typescript
import { actions, Sync } from "@engine";
import { FocusStats, Library } from "@concepts";
import { LibraryDoc } from "@concepts/Library/LibraryConcept.ts";

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
    const libraryFrames = await frames.query(
      Library._getLibraryByUser,
      { user },
      { library },
    );
    // The query returns the full library document. We need to extract just the ID
    // and re-bind it to the 'library' variable for the 'then' clause.
    return libraryFrames.map(($) => {
      const libDoc = $[library] as { library: LibraryDoc }; // Type assertion for clarity
      return {
        ...$,
        [library]: libDoc.library._id,
      };
    });
  },
  then: actions(
    // With the user, document, and library ID, we can start a new focus session.
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
    // First, get all focus sessions associated with the user.
    const sessionFrames = await frames.query(
      FocusStats._getSessions,
      { user },
      { session },
    );
    // Then, filter these sessions to find the one that is for the correct document
    // and is still active (its `endTime` is null).
    return sessionFrames.filter(($) => {
      const s = $[session].focusSession; // The session object is nested under the 'focusSession' key
      return s.document === $[document] && s.endTime === null;
    });
  },
  then: actions(
    // The 'where' clause provides a frame for each matching active session.
    // We use a function here to dynamically build the 'then' action,
    // extracting the session's ID from the session document found in the frame.
    (frame) => [
      FocusStats.endSession,
      { focusSession: frame[session].focusSession._id },
    ],
  ),
});
```
