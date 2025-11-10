---
timestamp: 'Mon Nov 10 2025 08:21:52 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_082152.ac072499.md]]'
content_id: fa51598e5477d82dd0516ddb8596ffa76a9f88d16bdb08fb30096d0dd92d7b2f
---

# file: src/concepts/Requesting/passthrough.ts

```typescript
/**
 * The Requesting concept exposes passthrough routes by default,
 * which allow POSTs to the route:
 *
 * /{REQUESTING_BASE_URL}/{Concept name}/{action or query}
 *
 * to passthrough directly to the concept action or query.
 * This is a convenient and natural way to expose concepts to
 * the world, but should only be done intentionally for public
 * actions and queries.
 *
 * This file allows you to explicitly set inclusions and exclusions
 * for passthrough routes:
 * - inclusions: those that you can justify their inclusion
 * - exclusions: those to exclude, using Requesting routes instead
 */

/**
 * INCLUSIONS
 *
 * Each inclusion must include a justification for why you think
 * the passthrough is appropriate (e.g. public query).
 *
 * inclusions = {"route": "justification"}
 */

export const inclusions: Record<string, string> = {
  // Feel free to delete these example inclusions
  "/api/LikertSurvey/_getSurveyQuestions": "this is a public query",
  "/api/LikertSurvey/_getSurveyResponses": "responses are public",
  "/api/LikertSurvey/_getRespondentAnswers": "answers are visible",
  "/api/LikertSurvey/submitResponse": "allow anyone to submit response",
  "/api/LikertSurvey/updateResponse": "allow anyone to update their response",
  // Annotation inclusions
  "/api/Annotation/createAnnotation":
    "allow anyone to create annotations on their own documents",
  "/api/Annotation/updateAnnotation":
    "allow anyone to update their own annotations",
  "/api/Annotation/deleteAnnotation":
    "allow anyone to delete their own annotations",
  "/api/Annotation/search":
    "allow anyone to search for the annotations on their own document",
  // FocusStats inclusions
  "/api/FocusStats/removeSession": "allow anyone to remove their own sessions",
  "/api/FocusStats/_viewStats": "allow anyone to view their own stats",
  "/api/FocusStats/_getSessions": "allow anyone to view their own sessions",
  // Library inclusions
  "/api/Library/removeDocument": "allow anyone to remove their own documents",
  "/api/Library/renameDocument": "allow anyone to rename their own documents",
  "/api/Library/_getLibraryByUser": "allow anyone to view their own library",
  "/api/Library/_getDocumentsInLibrary":
    "allow anyone to view the documents in their own library",
  "/api/Library/_getDocumentDetails":
    "allow anyone to view their own document details",
  // Profile inclusions
  "/api/Profile/authenticate": "want anyone to be able to authenticate",
  // TextSettings inclusions
  "/api/TextSettings/_getUserDefaultSettings":
    "allow anyone to get their own text settings",
  "/api/TextSettings/_getDocumentCurrentSettings":
    "allow anyone to get their own document text settings",
};

/**
 * EXCLUSIONS
 *
 * Excluded routes fall back to the Requesting concept, and will
 * instead trigger the normal Requesting.request action. As this
 * is the intended behavior, no justification is necessary.
 *
 * exclusions = ["route"]
 */

export const exclusions: Array<string> = [
  // Feel free to delete these example exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",
  // Not used by the front end
  "/api/Annotation/createTag",
  "/api/Annotation/_deleteDocumentView",
  "/api/Profile/clearCollections",
  "/api/Profile/_getAllUsers",
  "/api/TextSettings/clearCollections",
  "/api/TextSettings/isValidFont",
  "/api/TextSettings/isValidFontSize",
  "/api/TextSettings/isValidLineHeight",
  "/api/TextSettings/_getTextSettings",

  // Create User flow exclusions
  "/api/Profile/createAccount",
  "/api/Library/createLibrary",
  "/api/FocusStats/initUser",
  "/api/TextSettings/createUserSettings",
];

```
