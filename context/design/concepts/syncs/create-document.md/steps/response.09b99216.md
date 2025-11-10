---
timestamp: 'Mon Nov 10 2025 10:39:07 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_103907.8a0d26d9.md]]'
content_id: 09b9921642b775e33606885daad48658344079128c0e6802de1a3557186505c9
---

# response:

Understood. Here are the complete, updated files you need to copy and paste.

***

**1. File: `src/concepts/Sessioning/SessioningConcept.ts`**

```typescript
import { Collection, Db } from "npm:mongodb";
import { freshID } from "@utils/database.ts";
import { Empty, ID } from "@utils/types.ts";

// Define generic types for the concept
type User = ID;
type Session = ID;

// Define the shape of the document in the 'sessions' collection
/**
 * a set of `Session`s with
 *   a `user` User
 */
interface SessionDoc {
  _id: Session;
  user: User;
}

const PREFIX = "Sessioning" + ".";

/**
 * @concept Sessioning
 * @purpose To maintain a user's logged-in state across multiple requests without re-sending credentials.
 */
export default class SessioningConcept {
  public readonly sessions: Collection<SessionDoc>;

  constructor(private readonly db: Db) {
    this.sessions = this.db.collection<SessionDoc>(PREFIX + "sessions");
  }

  /**
   * create (user: User): (session: Session)
   *
   * **requires**: true.
   *
   * **effects**: creates a new Session `s`; associates it with the given `user`; returns `s` as `session`.
   */
  async create(
    { user }: { user: User },
  ): Promise<{ session: Session } | { error: string }> {
    try {
      const newSessionId = freshID() as Session;
      const doc: SessionDoc = {
        _id: newSessionId,
        user: user,
      };
      // --- IMPORTANT: These console logs should appear if the method is called ---
      console.log(
        `[Sessioning.create] Attempting to insert session for user: ${user} with ID: ${newSessionId}`,
      );
      await this.sessions.insertOne(doc);
      console.log(
        `[Sessioning.create] Successfully created session: ${newSessionId}`,
      );
      // --- END IMPORTANT ---
      return { session: newSessionId };
    } catch (e) {
      console.error(
        `[Sessioning.create] Error creating session for user ${user}:`,
        e,
      );
      return {
        error: `Failed to create session: ${
          e instanceof Error ? e.message : "unknown error"
        }`,
      };
    }
  }
  /**
   * delete (session: Session): ()
   *
   * **requires**: the given `session` exists.
   *
   * **effects**: removes the session `s`.
   */
  async delete(
    { session }: { session: Session },
  ): Promise<Empty | { error: string }> {
    const result = await this.sessions.deleteOne({ _id: session });

    if (result.deletedCount === 0) {
      return { error: `Session with id ${session} not found` };
    }

    return {};
  }

  /**
   * getUser (session: Session): (user: User)
   * RENAMED from _getUser to getUser to avoid potential issues with '_' prefix
   *
   * **requires**: the given `session` exists.
   *
   * **effects**: returns the user associated with the session.
   */
  async getUser( // RENAMED: removed '_'
    { session }: { session: Session },
  ): Promise<Array<{ user: User }> | [{ error: string }]> {
    // --- ADDED LOGS FOR DEBUGGING ---
    console.log(
      `[Sessioning.getUser] Attempting to get user for session: ${session}`,
    );
    const sessionDoc = await this.sessions.findOne({ _id: session });
    console.log(
      `[Sessioning.getUser] findOne for session '${session}' completed. Found sessionDoc: ${!!sessionDoc}`,
    );

    if (!sessionDoc) {
      console.log(`[Sessioning.getUser] Session with id ${session} not found.`);
      return [{ error: `Session with id ${session} not found` }];
    }
    console.log(
      `[Sessioning.getUser] Successfully retrieved user ${sessionDoc.user} for session ${session}`,
    );
    return [{ user: sessionDoc.user }];
  }
}
```

***

**2. File: `src/syncs/create_document.sync.ts`**

```typescript
import { actions, Sync, Frames } from "@engine";
import { Requesting, Library, Annotation, TextSettings, Sessioning } from "@concepts";
import { ID } from "@utils/types.ts";

// --- Main Document Creation Flow ---

/**
 * Sync: HandleCreateDocumentRequest
 * Catches the initial HTTP request to create a document.
 * Authenticates the user by resolving the session to a user ID.
 */
export const HandleCreateDocumentRequest: Sync = (
  { request, name, epubContent, session, library: clientProvidedLibraryId, user },
) => ({
  when: actions(
    // Match the incoming HTTP request.
    [
      Requesting.request,
      { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId },
      { request: request },
    ],
  ),
  then: actions(
    // Attempt to get the user ID from the session using the RENAMED getUser.
    // This action will return { user: ID } on success, or { error: string } on failure.
    [Sessioning.getUser, { session: session }, { user: user }], // RENAMED: from _getUser to getUser
  ),
});

/**
 * Sync: ValidateLibraryAndCreateDocument
 * Fires after a user is successfully authenticated.
 * Verifies library ownership and then creates the document in the Library concept.
 */
export const ValidateLibraryAndCreateDocument: Sync = (
  { request, name, epubContent, session, library: clientProvidedLibraryId, user, library: userOwnedLibraryId, document },
) => ({
  when: actions(
    // Match the original request context.
    [
      Requesting.request,
      { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId },
      { request: request },
    ],
    // Match successful user retrieval from session (using the RENAMED getUser).
    [Sessioning.getUser, { session: session }, { user: user }], // RENAMED: from _getUser to getUser
  ),
  where: async (frames) => {
    // Query for the actual library owned by this user.
    // If the user has no library, this query will return an empty frame.
    frames = await frames.query(Library._getLibraryByUser, { user: user }, { library: userOwnedLibraryId });

    // Filter frames to ensure the client-provided library ID matches the user's actual library ID.
    // This is an important authorization check.
    return frames.filter(($) => $[clientProvidedLibraryId] === $[userOwnedLibraryId]);
  },
  then: actions(
    // Create the document using the validated user-owned library ID.
    // This action will return { document: ID } on success, or { error: string } on failure.
    [
      Library.createDocument,
      { name: name, epubContent: epubContent, library: userOwnedLibraryId },
      { document: document },
    ],
  ),
});

/**
 * Sync: RegisterDocumentWithAnnotation
 * Fires after a document is successfully created in the Library concept.
 * Registers the document with the Annotation concept.
 */
export const RegisterDocumentWithAnnotation: Sync = (
  { request, name, epubContent, session, library: clientProvidedLibraryId, user, library: userOwnedLibraryId, document },
) => ({
  when: actions(
    // Match the original request context.
    [
      Requesting.request,
      { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId },
      { request: request },
    ],
    // Match successful user retrieval.
    [Sessioning.getUser, { session: session }, { user: user }], // RENAMED: from _getUser to getUser
    // Match successful library ownership validation and document creation.
    [
      Library.createDocument,
      { name: name, epubContent: epubContent, library: userOwnedLibraryId },
      { document: document },
    ],
  ),
  then: actions(
    // Register the document with the Annotation concept.
    // This action will return Empty on success, or { error: string } on failure.
    [Annotation.registerDocument, { documentId: document, creatorId: user }, {}],
  ),
});

/**
 * Sync: CreateDocumentTextSettings
 * Fires after a document is registered with the Annotation concept.
 * Creates default text settings for the new document.
 */
export const CreateDocumentTextSettings: Sync = (
  { request, name, epubContent, session, library: clientProvidedLibraryId, user, library: userOwnedLibraryId, document },
) => ({
  when: actions(
    // Match the original request context.
    [
      Requesting.request,
      { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId },
      { request: request },
    ],
    // Match successful user retrieval.
    [Sessioning.getUser, { session: session }, { user: user }], // RENAMED: from _getUser to getUser
    // Match successful library ownership validation and document creation.
    [
      Library.createDocument,
      { name: name, epubContent: epubContent, library: userOwnedLibraryId },
      { document: document },
    ],
    // Match successful document registration with Annotation.
    [Annotation.registerDocument, { documentId: document, creatorId: user }, {}],
  ),
  then: actions(
    // Create default text settings for the new document.
    // This action will return { settings: ID } on success, or { error: string } on failure.
    [
      TextSettings.createDocumentSettings,
      { document: document, font: "serif", fontSize: 16, lineHeight: 24 },
      {}, // Output binding for `settings` from TextSettings.createDocumentSettings is not explicitly needed for the final response
    ],
  ),
});

/**
 * Sync: CreateDocumentSuccessResponse
 * Fires after all sub-actions (document creation, annotation registration, text settings) are successful.
 * Responds to the frontend with a success message and the new document ID.
 */
export const CreateDocumentSuccessResponse: Sync = (
  { request, document },
) => ({
  when: actions(
    // Match the successful completion of the entire chain.
    // We only need 'request' and 'document' for the final response.
    // The previous sync (CreateDocumentTextSettings) implicitly implies successful upstream actions.
    [TextSettings.createDocumentSettings, {}, {}], // Just need any action from the chain to succeed.
    // It's more robust to match the Requesting.request again to ensure context.
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    // We need the document ID. Instead of chaining from TextSettings,
    // let's grab it directly from Library.createDocument's success.
    [Library.createDocument, {}, { document: document }],
  ),
  then: actions(
    // Respond to the frontend.
    [
      Requesting.respond,
      { request: request, document: document, message: "Document created successfully." },
    ],
  ),
});


// --- Error Handling for Create Document Flow ---

/**
 * Sync: CreateDocumentFailedAuthError
 * Catches errors when session resolution or user authentication fails.
 */
export const CreateDocumentFailedAuthError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    [Sessioning.getUser, {}, { error: error }], // RENAMED: from _getUser to getUser
  ),
  then: actions(
    [Requesting.respond, { request: request, error: `Authentication failed: ${error}` }],
  ),
});

/**
 * Sync: CreateDocumentFailedLibraryAuthError
 * Catches errors when library ownership validation fails (either no library found for user, or client-provided ID mismatch).
 * This also needs to implicitly catch when `Library._getLibraryByUser` returns no frames.
 */
export const CreateDocumentFailedLibraryAuthError: Sync = (
  { request, name, epubContent, session, library: clientProvidedLibraryId, user, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId },
      { request: request },
    ],
    [Sessioning.getUser, { session: session }, { user: user }], // RENAMED: from _getUser to getUser
    // Match the explicit error from Library._getLibraryByUser, or the implicit failure of the filter in ValidateLibraryAndCreateDocument.
    // The sync engine typically only passes frames that meet all 'when' and 'where' conditions.
    // If the 'where' filter in ValidateLibraryAndCreateDocument results in no frames, this error sync won't directly catch it as an 'action error'.
    // We need to catch explicit errors returned by the concept's query.
    [Library._getLibraryByUser, { user: user }, { error: error }], // Catch explicit errors from query
  ),
  then: actions(
    [Requesting.respond, { request: request, error: `Library authorization failed: ${error}` }],
  ),
});

/**
 * Sync: CreateDocumentFailedLibraryActionError
 * Catches errors when Library.createDocument itself fails (e.g., duplicate document name).
 */
export const CreateDocumentFailedLibraryActionError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    [Library.createDocument, {}, { error: error }], // Catch error from Library.createDocument
  ),
  then: actions(
    [Requesting.respond, { request: request, error: `Document creation failed: ${error}` }],
  ),
});

/**
 * Sync: CreateDocumentFailedAnnotationRegistrationError
 * Catches errors when Annotation.registerDocument fails.
 */
export const CreateDocumentFailedAnnotationRegistrationError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    [Annotation.registerDocument, {}, { error: error }], // Catch error from Annotation.registerDocument
  ),
  then: actions(
    [Requesting.respond, { request: request, error: `Annotation registration failed: ${error}` }],
  ),
});

/**
 * Sync: CreateDocumentFailedTextSettingsError
 * Catches errors when TextSettings.createDocumentSettings fails.
 */
export const CreateDocumentFailedTextSettingsError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    [TextSettings.createDocumentSettings, {}, { error: error }], // Catch error from TextSettings.createDocumentSettings
  ),
  then: actions(
    [Requesting.respond, { request: request, error: `Text settings creation failed: ${error}` }],
  ),
});
```

***

**3. File: `src/syncs/authentication.sync.ts`**

```typescript
import { actions, Sync } from "@engine";
import { Requesting, Profile, Sessioning, Library, FocusStats, TextSettings } from "@concepts";
import { ID } from "@utils/types.ts";

// --- DEBUGGING AUTH SYNC (STARTUP) logs are good, keep them ---
console.log("--- DEBUGGING AUTH SYNC (STARTUP) ---");
console.log("Sessioning concept imported:", !!Sessioning);
console.log("Sessioning.create is a function:", typeof Sessioning.create === 'function');
console.log("--- END DEBUGGING AUTH SYNC (STARTUP) ---");
// --- END LOGS ---

// --- Login Flow ---

/**
 * Sync: HandleLoginRequest
 * Catches the initial HTTP login request and attempts to authenticate the user.
 * This is the first step of the login process.
 */
export const HandleLoginRequest: Sync = (
  { request, username, password },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/login", username, password }, { request: request }],
  ),
  then: actions(
    // Attempt authentication with the Profile concept.
    // This action will either return { user: ID } on success or { error: string } on failure.
    [Profile.authenticate, { username, password }, { user: username /* output user for potential later use, but Profile returns its ID */ }],
  ),
});

/**
 * Sync: LoginSuccessAndCreateSession
 * Fires when Profile.authenticate successfully returns a user.
 * Proceeds to create a new session for this authenticated user.
 */
export const LoginSuccessAndCreateSession: Sync = (
  { request, username, user: authenticatedUserId /* from Profile.authenticate */, session: newSessionId },
) => ({
  when: actions(
    // Match the original login request context.
    [Requesting.request, { path: "/auth/login", username }, { request: request }],
    // Match the successful authentication.
    [Profile.authenticate, { username }, { user: authenticatedUserId }],
  ),
  then: actions(
    // Create a session for the authenticated user.
    // This action will either return { session: ID } on success or { error: string } on failure.
    [Sessioning.create, { user: authenticatedUserId }, { session: newSessionId }],
  ),
});

/**
 * Sync: LoginSuccessRespond
 * Fires when a session has been successfully created after authentication.
 * Responds to the frontend with the user ID and new session ID.
 */
export const LoginSuccessRespond: Sync = (
  { request, username, user: authenticatedUserId, session: newSessionId },
) => ({
  when: actions(
    // Match the original login request context.
    [Requesting.request, { path: "/auth/login", username }, { request: request }],
    // Match the successful authentication context.
    [Profile.authenticate, { username }, { user: authenticatedUserId }],
    // Match the successful session creation.
    [Sessioning.create, { user: authenticatedUserId }, { session: newSessionId }],
  ),
  then: actions(
    // Respond to the frontend.
    [
      Requesting.respond,
      {
        request: request,
        user: authenticatedUserId,
        session: newSessionId,
        message: "Login successful",
      },
    ],
  ),
});

/**
 * Sync: LoginFailedProfileError
 * Catches authentication errors specifically from Profile.authenticate and responds.
 */
export const LoginFailedProfileError: Sync = (
  { request, username, error },
) => ({
  when: actions(
    // Match the original login request context.
    [Requesting.request, { path: "/auth/login", username }, { request: request }],
    // Match the authentication failure.
    [Profile.authenticate, { username }, { error: error }],
  ),
  then: actions(
    // Respond to the frontend with the error.
    [Requesting.respond, { request: request, error: error }],
  ),
});

/**
 * Sync: LoginFailedSessionCreationError
 * Catches errors specifically from Sessioning.create and responds.
 * This covers cases where authentication succeeds but session creation fails.
 */
export const LoginFailedSessionCreationError: Sync = (
  { request, username, user: authenticatedUserId, error },
) => ({
  when: actions(
    // Match the original login request context.
    [Requesting.request, { path: "/auth/login", username }, { request: request }],
    // Match the successful authentication.
    [Profile.authenticate, { username }, { user: authenticatedUserId }],
    // Match the session creation failure.
    [Sessioning.create, { user: authenticatedUserId }, { error: error }],
  ),
  then: actions(
    // Respond to the frontend with the error.
    [Requesting.respond, { request: request, error: error }],
  ),
});

// --- Logout Flow ---

/**
 * Sync: HandleLogoutRequest
 * Catches the initial HTTP logout request and attempts to delete the user's session.
 */
export const HandleLogoutRequest: Sync = (
  { request, session: sessionIdToDelete },
) => ({
  when: actions(
    [Requesting.request, { path: "/auth/logout", session: sessionIdToDelete }, { request: request }],
  ),
  then: actions(
    // Attempt to delete the session.
    // This action will either return Empty on success or { error: string } on failure.
    [Sessioning.delete, { session: sessionIdToDelete }, {}],
  ),
});

/**
 * Sync: LogoutSuccessRespond
 * Fires when Sessioning.delete successfully completes (returns Empty).
 * Responds to the frontend with a success message.
 */
export const LogoutSuccessRespond: Sync = (
  { request, session: sessionIdToDelete },
) => ({
  when: actions(
    // Match the original logout request context.
    [Requesting.request, { path: "/auth/logout", session: sessionIdToDelete }, { request: request }],
    // Match the successful session deletion (which returns an empty object).
    [Sessioning.delete, { session: sessionIdToDelete }, {}],
  ),
  then: actions(
    // Respond to the frontend.
    [Requesting.respond, { request: request, message: "Logged out successfully" }],
  ),
});

/**
 * Sync: LogoutFailedError
 * Catches errors specifically from Sessioning.delete and responds.
 */
export const LogoutFailedError: Sync = (
  { request, session: sessionIdToDelete, error },
) => ({
  when: actions(
    // Match the original logout request context.
    [Requesting.request, { path: "/auth/logout", session: sessionIdToDelete }, { request: request }],
    // Match the session deletion failure.
    [Sessioning.delete, { session: sessionIdToDelete }, { error: error }],
  ),
  then: actions(
    // Respond to the frontend with the error.
    [Requesting.respond, { request: request, error: error }],
  ),
});

// --- Account Creation Flow ---
// Keeping the account creation sync as it was defined, as it sets up initial user state across concepts.

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
    [Requesting.request, { path: "/auth/createAccount", username, password }, { request: request }],
  ),
  then: actions(
    // 1. Create the user account in the Profile concept
    [Profile.createAccount, { username, password }, { user: user }],
    // 2. Create a library for the new user
    [Library.createLibrary, { user: user }, { library: library }],
    // 3. Initialize FocusStats for the new user
    [FocusStats.initUser, { user: user }, { focusStats: focusStats }],
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
```

***

**4. File: `src/concepts/Requesting/passthrough.ts`**

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

  // Create Document flow exclusions
  "/api/Library/createDocument",
  "/api/Annotation/registerDocument",
  "/api/TextSettings/createDocumentSettings",

  // Login flow exclusions
  // Original excluded: "/api/Profile/authenticate" - now handled by specific auth syncs
  "/api/Sessioning/create",
  "/api/Sessioning/delete",
  // RENAMED query for Sessioning
  "/api/Sessioning/getUser", // ADDED: Excluding the new getUser method from passthrough

  // Specific concept actions that are part of multi-step sync flows
  "/api/FocusStats/startSession",
  "/api/FocusStats/endSession",
  "/api/Library/openDocument",
  "/api/Library/closeDocument",
  "/api/Profile/deleteAccount",
  "/api/Profile/changePassword",
  "/api/Profile/_getUserDetails",
  "/api/TextSettings/editSettings",
];
```
