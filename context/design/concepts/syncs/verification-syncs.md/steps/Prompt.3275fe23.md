---
timestamp: 'Mon Nov 10 2025 17:46:51 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_174651.729ea619.md]]'
content_id: 3275fe234f5be0d062c364d1122d086aca76e7cfe37af18fcd6e3e6fd576358a
---

# Prompt: I'm getting an error when I try to view my stats. Here is the console output:

```
[Requesting] Received request for path: /FocusStats/_viewStats

Requesting.request {
  session: '019a6fed-1dda-7746-a061-59d4f5f20a20',
  path: '/FocusStats/_viewStats'
} => { request: '019a6ff2-34e0-70bd-b8bf-8474e5fa2c27' }    

[Sessioning.getUser] Attempting to get user for session: 019a6fed-1dda-7746-a061-59d4f5f20a20
[Sessioning.getUser] findOne for session '019a6fed-1dda-7746-a061-59d4f5f20a20' completed. Found sessionDoc: true       
[Sessioning.getUser] Successfully retrieved user 019a6fed-1bbe-788e-81a1-79a5c4bc3b12 for session 019a6fed-1dda-7746-a061-59d4f5f20a20

Sessioning.getUser { session: '019a6fed-1dda-7746-a061-59d4f5f20a20' } => [ { user: '019a6fed-1bbe-788e-81a1-79a5c4bc3b12' } ]

[Requesting] Error processing request: Missing binding: Symbol(stats) in frame: [object Object]

```
