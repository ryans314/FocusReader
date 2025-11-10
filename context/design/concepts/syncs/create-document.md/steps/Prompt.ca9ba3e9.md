---
timestamp: 'Mon Nov 10 2025 14:49:11 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_144911.8b48d824.md]]'
content_id: ca9ba3e930885485daf71d327350b4e010b13bd42c4e9f8694a2d0c2bef44bc9
---

# Prompt: The code for create\_document is still giving the following error: `[Requesting] Error processing request: Missing binding: Symbol(document) in frame: [object Object]`. I suspect the issue is in CreateDocumentSuccessFlow. I do not believe that you can bind additional variables in the then clause. You need multiple syncs, one to react to the initial createDocument trigger, which will call Library.createDocument; and then another to react to Library.createDocument finishing, which will then register the document and create the necessary textSettings.
