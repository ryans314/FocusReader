---
timestamp: 'Mon Nov 10 2025 09:37:19 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_093719.04eb6e13.md]]'
content_id: c60b43da3fb610a059b05a00ac678f09b37242725b3f56d10453f3e0c2ac78ae
---

# Prompt: it seems like the request is timing out now:

```
$ deno run start
Task start deno run --allow-net --allow-write --allow-read --allow-sys --allow-env src/main.ts

Requesting concept initialized with a timeout of 10000ms.
--- DEBUGGING AUTH SYNC (STARTUP) ---
Sessioning concept imported: true
Sessioning.create is a function: true
--- END DEBUGGING AUTH SYNC (STARTUP) ---

Registering concept passthrough routes.
  -> /api/Annotation/createAnnotation
  -> /api/Annotation/deleteAnnotation
  -> /api/Annotation/updateAnnotation
  -> /api/Annotation/search
WARNING - UNVERIFIED ROUTE: /api/Annotation/_registerDocument
WARNING - UNVERIFIED ROUTE: /api/FocusStats/startSession
WARNING - UNVERIFIED ROUTE: /api/FocusStats/endSession
  -> /api/FocusStats/removeSession
  -> /api/FocusStats/_viewStats
  -> /api/FocusStats/_getSessions
  -> /api/Library/removeDocument
  -> /api/Library/renameDocument
WARNING - UNVERIFIED ROUTE: /api/Library/openDocument
WARNING - UNVERIFIED ROUTE: /api/Library/closeDocument
  -> /api/Library/_getLibraryByUser
  -> /api/Library/_getDocumentsInLibrary
  -> /api/Library/_getDocumentDetails
  -> /api/LikertSurvey/submitResponse
  -> /api/LikertSurvey/updateResponse
  -> /api/LikertSurvey/_getSurveyQuestions
  -> /api/LikertSurvey/_getSurveyResponses
  -> /api/LikertSurvey/_getRespondentAnswers
WARNING - UNVERIFIED ROUTE: /api/Profile/deleteAccount 
WARNING - UNVERIFIED ROUTE: /api/Profile/changePassword
WARNING - UNVERIFIED ROUTE: /api/Profile/_getUserDetails
WARNING - UNVERIFIED ROUTE: /api/Sessioning/_getUser   
WARNING - UNVERIFIED ROUTE: /api/TextSettings/editSettings
  -> /api/TextSettings/_getUserDefaultSettings
  -> /api/TextSettings/_getDocumentCurrentSettings     
FIX: Please verify routes in: ./src/concepts/Requesting/passthrough.ts

🚀 Requesting server listening for POST requests at base path of /api/*
Listening on http://localhost:8000/ (http://localhost:8000/)
[Requesting] Received request for path: /auth/login

Requesting.request { username: 'bob', password: '1234567890', path: '/auth/login' } => { request: '019a6e32-1b9f-7460-9bab-9064813481ad' }

[Requesting] Error processing request: Request 019a6e32-1b9f-7460-9bab-9064813481ad timed out after 10000ms 
```
