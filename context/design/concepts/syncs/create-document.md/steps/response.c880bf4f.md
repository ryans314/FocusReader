---
timestamp: 'Mon Nov 10 2025 08:46:04 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_084604.a7357b7e.md]]'
content_id: c880bf4f8814fbfe01eccac7f119374fb0b7a78b1f595521f944bd4cb0954999
---

# response:

You've identified the crucial next steps! Implementing a synchronization isn't just about writing the sync file; it involves configuring the system to route requests correctly and updating the client to interact with the new backend logic.

Here's a breakdown of the additional work needed:

***

### 1. Update `src/concepts/Requesting/passthrough.ts`

Since your `CreateDocumentRequest` synchronization now *intercepts* the request for `/Library/createDocument` and handles the entire flow (creating the document, registering with Annotation, setting TextSettings, and responding), you **must exclude** the direct passthrough route for `Library.createDocument`.

Additionally, the `Annotation.registerDocument` and `TextSettings.createDocumentSettings` actions are now being called *internally* by your sync. The frontend should **not** call these directly. Therefore, they should also be excluded (or at least ensured they are not included).

**Action:**
Edit `src/concepts/Requesting/passthrough.ts` as follows:

```typescript
// file: src/concepts/Requesting/passthrough.ts

export const inclusions: Record<string, string> = {
  // ... existing inclusions
  // Annotation inclusions (if you had them, ensure they are still justified or move to exclusions)
  "/api/Annotation/createAnnotation": "allow anyone to create annotations on their own documents",
  "/api/Annotation/updateAnnotation": "allow anyone to update their own annotations",
  "/api/Annotation/deleteAnnotation": "allow anyone to delete their own annotations",
  "/api/Annotation/search": "allow anyone to search for the annotations on their own document",
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
  // ... other justified inclusions
};

export const exclusions: Array<string> = [
  // ... existing exclusions
  "/api/LikertSurvey/createSurvey",
  "/api/LikertSurvey/addQuestion",
  // NEW EXCLUSIONS FOR createDocument SYNC FLOW
  "/api/Library/createDocument", // The sync handles this
  "/api/Annotation/registerDocument", // Called internally by sync
  "/api/TextSettings/createDocumentSettings", // Called internally by sync
  // Annotation exclusions
  "/api/Annotation/createTag",
  "/api/Annotation/_deleteDocumentView",
  // FocusStats exclusions
  "/api/FocusStats/initUser",
  "/api/FocusStats/startSession",
  "/api/FocusStats/endSession",
  // Library exclusions
  "/api/Library/createLibrary",
  // Library actions now covered by syncs
  "/api/Library/openDocument",
  "/api/Library/closeDocument",
  // Profile exclusions
  "/api/Profile/clearCollections",
  "/api/Profile/_getAllUsers",
  "/api/Profile/createAccount",
  "/api/Profile/deleteAccount",
  "/api/Profile/changePassword",
  "/api/Profile/_getUserDetails",
  // TextSettings exclusions
  "/api/TextSettings/clearCollections",
  "/api/TextSettings/isValidFont",
  "/api/TextSettings/isValidFontSize",
  "/api/TextSettings/isValidLineHeight",
  "/api/TextSettings/createUserSettings",
  "/api/TextSettings/editSettings",
  "/api/TextSettings/_getTextSettings",
];
```

**Justification for `"/api/Library/createDocument"` exclusion:**
By adding `/api/Library/createDocument` to `exclusions`, any incoming `POST /api/Library/createDocument` request will no longer directly invoke `LibraryConcept.createDocument`. Instead, it will trigger the `Requesting.request` action, which your `CreateDocumentRequest` sync listens to. This ensures your authorization logic (checking session, verifying library ownership) and cross-concept updates (`Annotation.registerDocument`, `TextSettings.createDocumentSettings`) are executed.

**Justification for `"/api/Annotation/registerDocument"` and `"/api/TextSettings/createDocumentSettings"` exclusions:**
These actions are now part of the controlled flow within `CreateDocumentRequest`. The frontend should not be directly calling them as they require specific context (like the `document` and `creator` IDs generated/verified by the sync).

***

### 2. Frontend Changes

The frontend client needs to be updated to send the request to the new endpoint and handle the expected response.

**Action:**
Modify your frontend code (e.g., in React, Vue, Svelte, or vanilla JS) where you currently create documents.

1. **Endpoint:** The `POST` request should be made to `/api/Library/createDocument`.
   * **Important:** Remember that the `path` parameter for `Requesting.request` in syncs (e.g., `/Library/createDocument`) does *not* include the `/api` base URL prefix. However, external HTTP requests *do* include it.

2. **Request Body:** The JSON body of the `POST` request must include all the necessary inputs for the `Requesting.request` action that your sync listens for:
   ```json
   {
     "name": "My New Ebook",
     "epubContent": "base64EncodedEpubDataOrUrl",
     "session": "user-session-id-from-login",
     "library": "user-library-id" // This is the ID of the specific library the document should be added to
   }
   ```
   * You'll need to ensure the frontend retrieves and passes the `session` ID (from user login) and the `library` ID (e.g., by querying `Library._getLibraryByUser` for the logged-in user).

3. **Response Handling:**
   * **Success:** The sync returns `{ request, document, message }`. Your frontend should expect `document` (the ID of the new document) and potentially `message`.
   * **Error:** The error syncs (`CreateDocumentResponseError`, etc.) return `{ request, error }`. Your frontend should expect an `error` string.

***

### 3. Run `deno run build` and Restart Server

After modifying `passthrough.ts` and any concept files, it's crucial to rebuild and restart your Deno server for the changes to take effect.

**Action:**

1. Run `deno run build` in your terminal. This updates the internal `@concepts` and `@syncs` imports used by the engine.
2. Stop and restart your server: `deno run start`.

You should see logs indicating which passthrough routes are registered and which are now handled by `Requesting`.

***

By following these steps, you will have fully implemented the `CreateDocumentRequest` sync, leveraging the modularity of concepts and the orchestration power of synchronizations for a more robust and organized application flow.
