---
timestamp: 'Mon Nov 10 2025 12:10:55 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_121055.4cda2a0d.md]]'
content_id: f95dd78bdbfd99a2d7f4ea75347ca519ae0f0a97c3202606a4eb92146af9a30f
---

# Prompt: it seems like you are trying to bind another variable in the then clause (the document)? I don't think you can do that. I think you may need multiple syncs (one triggered by the initial createDocument, which causes createDocument to run in the then clause, and then another triggered by createDocument running, which causes the document to be registered)
