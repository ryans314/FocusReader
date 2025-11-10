---
timestamp: 'Mon Nov 10 2025 10:50:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_105038.479c6f8c.md]]'
content_id: 0a758498527f7a608eea5a2770fe121cd82588811cc7b661f7d6331907ab9aa5
---

# Prompt: it is not even building. Fix this now.

```
$ deno run start
Task start deno run --allow-net --allow-write --allow-read --allow-sys --allow-env src/main.ts
[LibraryConcept.constructor] Initialized collections:
[LibraryConcept.constructor]   - Libraries: Library.libraries
[LibraryConcept.constructor]   - Documents: Library.documents

Requesting concept initialized with a timeout of 10000ms.
--- DEBUGGING AUTH SYNC (STARTUP) ---
Sessioning concept imported: true
Sessioning.create is a function: true
--- END DEBUGGING AUTH SYNC (STARTUP) ---
error: Uncaught (in promise) Error: Action bound _getLibraryByUser is not instrumented.
      throw new Error(`Action ${action.name} is not instrumented.`);
            ^
    at file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/engine/sync.ts:32:13
    at Array.map (<anonymous>)
    at actions (file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/engine/sync.ts:29:18)
    at CreateDocumentFailedLibraryLookupError (file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/syncs/create_document.sync.ts:134:9)
    at SyncConcept.register (file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/engine/sync.ts:65:31)
    at file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/main.ts:25:8
    at eventLoopTick (ext:core/01_core.js:179:7)
```
