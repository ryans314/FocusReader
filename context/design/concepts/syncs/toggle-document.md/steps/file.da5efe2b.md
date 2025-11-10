---
timestamp: 'Mon Nov 10 2025 15:56:29 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_155629.f504415c.md]]'
content_id: da5efe2be06b48dfe17262be65dec0197f0e3df0b170e53927c121d196d04765
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
    // The query binds the full result item, e.g., { library: LibraryDoc }, to our 'library' variable.
    frames = await frames.query(
      Library._getLibraryByUser,
      { user },
      { library },
    );

    // Filter for successful queries where the library document exists, then extract the ID.
    return frames
      .filter(($) => $[library] && $[library].library) // Check for the wrapper and the inner doc
      .map(($) => {
        // $[library] is shaped like { library: LibraryDoc }
        const libraryDocWrapper = $[library] as { library: LibraryDoc };
        return {
          ...$,
          [library]: libraryDocWrapper.library._id, // Re-bind the 'library' variable to just the ID
        };
      });
  },
  then: actions(
    // With the 'library' variable now holding the ID, this action will fire correctly.
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
    // BUG FIX (1): This query now type-checks correctly. The output pattern
    // `{ focusSession: session }` destructures the query's result array,
    // binding the inner `FocusSessionDocument` to our `session` variable.
    frames = await frames.query(
      FocusStats._getSessions,
      { user },
      { focusSession: session },
    );

    // Filter these sessions to find the one for the correct document that is still active (endTime is null).
    return frames.filter(($) => {
      const s = $[session] as FocusSessionDocument;
      // Also filter out any error results from the query that didn't get caught by the type system.
      return s && !("error" in s) && s.document === $[document] &&
        s.endTime === null;
    });
  },
  // BUG FIX (2): The 'then' clause can be a function that takes a frame and returns an ActionList.
  // The incorrect actions() wrapper is removed. The return value is `[[Action, Input]]` which is a valid ActionList.
  then: (frame) => [
    [
      FocusStats.endSession,
      { focusSession: (frame[session] as FocusSessionDocument)._id },
    ],
  ],
});
```
