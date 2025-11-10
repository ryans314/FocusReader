---
timestamp: 'Mon Nov 10 2025 10:26:14 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_102614.38786b1e.md]]'
content_id: 616b3d89093c3f23c178683625e04143beae71e0a451e3f1dc54bc2fd2b5c3c4
---

# Prompt: bug when starting up the thing:

```
$ deno run start
Task start deno run --allow-net --allow-write --allow-read --allow-sys --allow-env src/main.ts
[LibraryConcept.constructor] Initialized collections:
[LibraryConcept.constructor]   - Libraries: Library.libraries
[LibraryConcept.constructor]   - Documents: Library.documents

Requesting concept initialized with a timeout of 10000ms.
--- DEBUGGING DOCUMENT CREATION SYNC (STARTUP) ---     
Library concept imported: true
Library.createDocument is a function: true
Annotation concept imported: true
Annotation.registerDocument is a function: true        
TextSettings concept imported: true
TextSettings.createDocumentSettings is a function: true
--- END DEBUGGING DOCUMENT CREATION SYNC (STARTUP) --- 
error: Uncaught (in promise) Error: Action bound instrumented is not instrumented.
      throw new Error(`Action ${action.name} is not instrumented.`);
            ^
    at file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/engine/sync.ts:32:13   
    at Array.map (<anonymous>)
    at actions (file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/engine/sync.ts:29:18)
    at DocumentCreationFailedAnnotationError (file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/syncs/create_document.sync.ts:324:9)   
    at SyncConcept.register (file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/engine/sync.ts:65:31)
    at file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/main.ts:25:8
    at eventLoopTick (ext:core/01_core.js:179:7)  
```
