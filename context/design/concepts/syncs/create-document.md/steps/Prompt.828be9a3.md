---
timestamp: 'Mon Nov 10 2025 09:31:35 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_093135.a18ef340.md]]'
content_id: 828be9a32d481cc6b6ac0b783699325634e29f5677c83dc66151c1fb19ce95a3
---

# Prompt: Here are all of the console outputs from when I ran deno run build to the actual testing of it:

```
 deno run build
Task build deno run import
Task import deno run --allow-read --allow-write --allow-env src/utils/generate_imports.ts
Scanning for concepts in 'src/concepts'...
  -> Found concept: Annotation
  -> Found concept: FocusStats
  -> Found concept: Library
  -> Found concept: LikertSurvey
  -> Found concept: Profile
  -> Found concept: Requesting
  -> Found concept: Sessioning
  -> Found concept: TextSettings
✅ Generated production barrel file: src\concepts\concepts.ts
✅ Generated test barrel file: src\concepts\test_concepts.ts

Scanning for syncs in 'src/syncs'...
  -> Found sync file: auth.sync.ts
  -> Found sync file: create_document.sync.ts
  -> Found sync file: sample.sync.ts
  -> Found sync file: user_management.sync.ts
✅ Generated syncs barrel file: src\syncs\syncs.ts

Ryan@ryans314-lap MINGW64 ~/OneDrive/Documents/MIT/F25 Classes/6.1040/FocusReader (main)
$ deno run start
Task start deno run --allow-net --allow-write --allow-read --allow-sys --allow-env src/main.ts

Requesting concept initialized with a timeout of 10000ms.
--- DEBUGGING AUTH SYNC ---
Sessioning concept imported: true
Sessioning.create is a function: true
--- END DEBUGGING AUTH SYNC ---

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
  -> /api/TextSettings/_getUserDefaultSettings
  -> /api/TextSettings/_getDocumentCurrentSettings
FIX: Please verify routes in: ./src/concepts/Requesting/passthrough.ts

🚀 Requesting server listening for POST requests at base path of /api/*
Listening on http://localhost:8000/ (http://localhost:8000/)
[Requesting] Received request for path: /auth/login

Requesting.request { username: 'bob', password: '1234567890', path: '/auth/login' } => { request: '019a6e2c-7bbb-7d1d-ae1e-ab87f4c56d07' }


Profile.authenticate { username: 'bob', password: '1234567890' } => { user: '019a4aa7-4575-7b22-8019-0eab1665c0e7' }

[Requesting] Error processing request: Missing binding: Symbol(session) in frame: [object Object]
```
