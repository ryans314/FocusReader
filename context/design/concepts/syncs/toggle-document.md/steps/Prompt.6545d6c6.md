---
timestamp: 'Mon Nov 10 2025 16:37:12 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_163712.38d84002.md]]'
content_id: 6545d6c64043e81c0ba9cebd681c47f76947a9161fe4cb52ab80f273b00b712a
---

# Prompt: I want to put the open/closeDocument routes in the Exclude section, so the focus.sync.ts file should handle requests to Request.request() with the right path, not look for calls to Library.open/closeDocument. Here is the request made by the frontend, which you should accomodate:

```
[Requesting] Received request for path: /Library/openDocument

Requesting.request {
  user: '019a4aa7-4575-7b22-8019-0eab1665c0e7',
  document: '019a4aa7-7038-7d17-b0fa-72aac7185da4',
  path: '/Library/openDocument'
} => { request: '019a6fb0-31cb-736a-8d8e-19372886ba97' }

[Requesting] Error processing request: Request 019a6fb0-31cb-736a-8d8e-19372886ba97 timed out after 10000ms
```
