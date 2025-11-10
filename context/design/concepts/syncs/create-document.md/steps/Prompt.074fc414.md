---
timestamp: 'Mon Nov 10 2025 10:36:03 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_103603.7107f88a.md]]'
content_id: 074fc414600890afdcc37fd31be2bdb35dce94256e3ab4e449b336d5776a4e95
---

# Prompt: fix bug

```
error: Uncaught (in promise) Error: Action bound _getUser is not instrumented.
      throw new Error(`Action ${action.name} is not instrumented.`);
            ^
    at file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/engine/sync.ts:32:13
    at Array.map (<anonymous>)
    at actions (file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/engine/sync.ts:29:18)
    at CreateDocumentFailedAuthError (file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/syncs/create_document.sync.ts:255:9)
    at SyncConcept.register (file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/engine/sync.ts:65:31)
    at file:///C:/Users/Ryan/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader/src/main.ts:25:8
    at eventLoopTick (ext:core/01_core.js:179:7)
```
