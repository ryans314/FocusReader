---
timestamp: 'Mon Nov 10 2025 08:52:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_085238.5ef3543f.md]]'
content_id: a5485a7e6bf54e55ad4526d93614cad4225616a8d5f966dbbeee7263a284c3d5
---

# response:

Okay, you've hit on a critical point: having a `Sessioning` concept is great, and a sync using it is good, but how does the **frontend** actually *initiate* a session or get a session ID to use?

Currently, your `SessioningConcept` exists, and your `CreateDocumentRequest` sync uses `Sessioning._getUser`. However, there's no way for the frontend to:

1. **Log in** (authenticate a user with `Profile` and *then* create a `Session`).
2. **Log out** (delete a `Session`).
3. **Create an account** (using `Profile.createAccount` and then setting up the initial related concepts like `Library`, `FocusStats`, `TextSettings`).
4. **Get a user's library ID** after login, which is needed for `CreateDocumentRequest`.

We need to create a **login/logout/account creation flow** using synchronizations, and then tell the frontend how to call these flows.

Here's a step-by-step guide to integrate the `Sessioning` concept into your application's user flow:

***

### Step 1: Create New Synchronizations for User Authentication, Session Management, and Account Creation

We'll put these in a new sync file, e.g., `src/syncs/auth.sync.ts`.

**file: src/syncs/auth.sync.ts**

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Profile, Sessioning, Library, FocusStats, TextSettings } from "@concepts";
import { ID } from "@utils/types.ts";

// --- Login / Session Creation Flow ---

/**
 * Sync: HandleLoginRequest
 * Triggers Profile.authenticate when a login request comes in.
 * Input from frontend: username, password
 * Path: /auth/login
 */
export const HandleLoginRequest: Sync = (
  { request, username, password, user: authenticatedUser },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login", username, password }, { request }],
  ),
  then: actions(
    // Attempt to authenticate the user using the Profile concept
    [Profile.authenticate, { username, password }, { user: authenticatedUser }],
  ),
});

/**
 * Sync: CreateSessionOnSuccessfulAuthentication
 * When Profile.authenticate succeeds, create a new Session and respond to the original request.
 * Output to frontend: user ID, session ID, message
 */
export const CreateSessionOnSuccessfulAuthentication: Sync = (
  { request, user: authenticatedUser, session: newSessionId },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login" }, { request: request }], // Match the original login request
    [Profile.authenticate, {}, { user: authenticatedUser }], // Match successful authentication
  ),
  then: actions(
    // Create a new session for the authenticated user
    [Sessioning.create, { user: authenticatedUser }, { session: newSessionId }],
    // Respond to the frontend with the user and new session ID
    [
      Requesting.respond,
      {
        request: request,
        user: authenticatedUser,
        session: newSessionId,
        message: "Login successful",
      },
    ],
  ),
});

/**
 * Sync: RespondToFailedAuthentication
 * When Profile.authenticate fails, respond with the error message.
 * Output to frontend: error message
 */
export const RespondToFailedAuthentication: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login" }, { request: request }],
    [Profile.authenticate, {}, { error: error }], // Match failed authentication
  ),
  then: actions(
    [Requesting.respond, { request: request, error: error }],
  ),
});

// --- Logout Flow ---

/**
 * Sync: HandleLogoutRequest
 * Deletes a user's session when a logout request comes in.
 * Input from frontend: session ID
 * Path: /auth/logout
 */
export const HandleLogoutRequest: Sync = (
  { request, session },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/logout", session }, { request }],
  ),
  then: actions(
    // Delete the specified session
    [Sessioning.delete, { session: session }, {}],
    // Respond to the frontend
    [Requesting.respond, { request: request, message: "Logged out successfully" }],
  ),
});

/**
 * Sync: RespondToFailedLogout
 * Catches errors from Sessioning.delete (e.g., session not found) and responds.
 */
export const RespondToFailedLogout: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/logout" }, { request: request }],
    [Sessioning.delete, {}, { error: error }], // Match failed session deletion
  ),
  then: actions(
    [Requesting.respond, { request: request, error: error }],
  ),
});

// --- Account Creation Flow ---

/**
 * Sync: CreateUserAccountRequest
 * Handles the creation of a new user account and initializes related concepts.
 * Input from frontend: username, password
 * Path: /auth/createAccount
 */
export const CreateUserAccountRequest: Sync = (
  { request, username, password, user, library, focusStats, textSettings },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/createAccount", username, password }, { request }],
  ),
  then: actions(
    // 1. Create the user account in the Profile concept
    [Profile.createAccount, { username, password }, { user }],
    // 2. Create a library for the new user
    [Library.createLibrary, { user: user }, { library }],
    // 3. Initialize FocusStats for the new user
    [FocusStats.initUser, { user: user }, { focusStats }],
    // 4. Create default text settings for the new user
    [
      TextSettings.createUserSettings,
      { user: user, font: "sans-serif", fontSize: 16, lineHeight: 24 }, // sensible defaults
      { settings: textSettings },
    ],
    // 5. Respond to the original request
    [
      Requesting.respond,
      { request: request, user: user, message: "Account created successfully." },
    ],
  ),
});

/**
 * Sync: CreateUserAccountResponseError
 * Catches errors from Profile.createAccount (e.g., username exists) and responds.
 */
export const CreateUserAccountResponseError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/createAccount" }, { request: request }],
    [Profile.createAccount, {}, { error: error }],
  ),
  then: actions(
    [Requesting.respond, { request: request, error: error }],
  ),
});

// Add more granular error handling for Library.createLibrary, FocusStats.initUser, TextSettings.createUserSettings
// if you want to distinguish specific failures in the account creation process.
// For example, if Library.createLibrary fails, you might want to respond with a specific error,
// possibly after deleting the Profile entry that was already created (compensatory action).
// For this general enablement, we'll keep the error handling primarily focused on Profile.createAccount.
```

***

### Step 2: Update `src/concepts/Requesting/passthrough.ts`

Now that your syncs are handling the full authentication and account creation flows, you need to **exclude** the underlying concept actions from direct passthrough access. This ensures that all login/logout/account creation attempts go through your orchestrating synchronizations, which include session management and authorization.

**Action:** Edit `src/concepts/Requesting/passthrough.ts` and add (or adjust) the following:

```typescript
// file: src/concepts/Requesting/passthrough.ts

export const inclusions: Record<string, string> = {
  // ... (keep your existing justified inclusions)
  // Example for fetching library after login, often still a query:
  "/api/Library/_getLibraryByUser": "allow anyone to view their own library after authenticated login",
  "/api/Profile/_getUserDetails": "allow authenticated user to get their own details", // If you want to allow this directly with session validation via a sync, you'd exclude it here and create a sync. For now, assuming you might make a sync later for it.
  "/api/TextSettings/_getUserDefaultSettings": "allow authenticated user to get their default settings",
  "/api/TextSettings/_getDocumentCurrentSettings": "allow anyone to get their own document text settings",

  // ... (your other justified inclusions)
};

export const exclusions: Array<string> = [
  // ... (keep your existing exclusions)

  // NEW EXCLUSIONS FOR AUTHENTICATION & SESSIONING
  "/api/Profile/authenticate",       // Handled by HandleLoginRequest sync
  "/api/Profile/createAccount",      // Handled by CreateUserAccountRequest sync
  "/api/Profile/deleteAccount",      // Needs a sync for authorization (e.g., must match authenticated user)
  "/api/Profile/changePassword",     // Needs a sync for authorization
  "/api/Profile/_getUserDetails",    // Exclude to force a sync for authorization (check session)
  "/api/Sessioning/create",          // Called internally by syncs (e.g., CreateSessionOnSuccessfulAuthentication)
  "/api/Sessioning/delete",          // Called internally by syncs (e.g., HandleLogoutRequest)

  // Initial concept setup calls - generally not exposed to frontend directly
  "/api/Library/createLibrary",      // Handled by CreateUserAccountRequest sync
  "/api/FocusStats/initUser",        // Handled by CreateUserAccountRequest sync
  "/api/TextSettings/createUserSettings", // Handled by CreateUserAccountRequest sync

  // Document creation flow (as established in your library_document.sync.ts)
  "/api/Library/createDocument",
  "/api/Annotation/registerDocument",
  "/api/TextSettings/createDocumentSettings",

  // Other exclusions
  "/api/Annotation/createTag",
  "/api/Annotation/_deleteDocumentView",
  "/api/FocusStats/startSession", // Will need a sync if you want to manage sessions for reading
  "/api/FocusStats/endSession",   // Will need a sync
  "/api/Library/openDocument",    // Will need a sync
  "/api/Library/closeDocument",   // Will need a sync
  "/api/Profile/clearCollections",
  "/api/Profile/_getAllUsers",
  "/api/TextSettings/clearCollections",
  "/api/TextSettings/isValidFont",
  "/api/TextSettings/isValidFontSize",
  "/api/TextSettings/isValidLineHeight",
  "/api/TextSettings/editSettings",
  "/api/TextSettings/_getTextSettings",

  // ... (your other exclusions)
];
```

**Explanation:**

* By excluding `Profile.authenticate` and `Profile.createAccount`, direct calls to these concept actions are prevented. Instead, HTTP requests to `/api/auth/login` or `/api/auth/createAccount` will trigger `Requesting.request`, which your new syncs will then catch.
* `Sessioning.create` and `Sessioning.delete` are excluded because they are internal to your authentication syncs and should not be called directly by the frontend.
* Other concept initializers (like `Library.createLibrary`, `FocusStats.initUser`, `TextSettings.createUserSettings`) are also excluded as they are part of the orchestrated `CreateUserAccountRequest` flow.

***

### Step 3: Frontend Implementation Guidance

Now, your frontend needs to be updated to interact with these new API endpoints and manage the session ID.

**1. Login Component:**

* **Endpoint:** `POST /api/auth/login`
* **Request Body:** `{"username": "user123", "password": "securePassword"}`
* **Expected Success Response:** `{"request": "reqId", "user": "userId123", "session": "sessionId456", "message": "Login successful"}`
* **Expected Error Response:** `{"request": "reqId", "error": "Invalid username or password."}`
* **Frontend Action:** On successful login, **store the `session` ID and `user` ID** (e.g., in `localStorage` or `sessionStorage`). You'll need to retrieve these for subsequent authenticated requests.

**2. Account Creation Component:**

* **Endpoint:** `POST /api/auth/createAccount`
* **Request Body:** `{"username": "newuser", "password": "newSecurePassword"}`
* **Expected Success Response:** `{"request": "reqId", "user": "newUserId", "message": "Account created successfully."}`
* **Expected Error Response:** `{"request": "reqId", "error": "Username 'newuser' already exists."}`
* **Frontend Action:** Inform the user of success/failure, perhaps redirect to the login page on success.

**3. Logout Component:**

* **Endpoint:** `POST /api/auth/logout`
* **Request Body:** `{"session": "sessionId456"}` (retrieve this from storage)
* **Expected Success Response:** `{"request": "reqId", "message": "Logged out successfully"}`
* **Expected Error Response:** `{"request": "reqId", "error": "Session with id sessionId456 not found"}`
* **Frontend Action:** **Remove the `session` ID and `user` ID** from client-side storage.

**4. Authenticated Requests (like `createDocument`):**

* For any request that requires authentication (like creating a document, updating settings, etc.), you *must* include the **`session` ID** in the request body.
* **Example for `createDocument`:**
  \`\`\`javascript
  async function createDocument(name, epubContent, libraryId) {
  const session = localStorage.getItem('session'); // Get session from storage
  const user = localStorage.getItem('user'); // Get user from storage

  if (!session || !user) {
  alert('You must be logged in to create a document.');
  return;
  }

  // Before calling createDocument, you might need to fetch the user's library ID
  // (assuming a user typically has one library). This could be done once after login.
  // For example, make a POST /api/Library/\_getLibraryByUser { user: user }
  // and store the returned library ID in localStorage as well.
  const userLibraryId = localStorage.getItem('libraryIdForCurrentUser');
  if (!userLibraryId) {
  // Handle error: user's library ID not found or not setup
  return;
  }

  const response = await fetch('/api/Library/createDocument', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
  name: name,
  epubContent: epubContent,
  session: session, // This is key for authentication
  library: userLibraryId // The library ID belonging to the user
  })
  });
  const data = await response.json();
  // ... handle response
  }
  \`\`\`

***

### Step 4: Rebuild and Restart

After making changes to `passthrough.ts` and adding new sync files, you **must** rebuild and restart your Deno server.

1. Open your terminal in the project root.
2. Run `deno run build`.
3. Stop your server (if it's running).
4. Run `deno run start`.

You should now see logs indicating that the new login/logout/account creation paths are being handled by your `Requesting` concept, and the respective passthrough routes for `Profile.authenticate`, `Profile.createAccount`, etc., are excluded.

This comprehensive setup enables your frontend to manage user sessions and account creation, allowing authenticated interactions with your application's concepts.
