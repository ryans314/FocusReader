---
timestamp: 'Mon Nov 10 2025 11:00:06 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_110006.c2422d67.md]]'
content_id: 75392d3aefa9922e0362d3032773b843452fbae5bc4b6b113f153cc5b49f0bc9
---

# response:

Okay, I understand completely. My previous attempts were indeed overcomplicating things by misinterpreting how queries integrate with `when` and `then` clauses, leading to the "Action bound... is not instrumented" errors. The instructor's clarification is fundamental: **queries are for `where` clauses only, actions are for `when` and `then`**.

This means we need a rigorous separation:

* **Actions** (`Profile.authenticate`, `Sessioning.create`, `Library.createDocument`, `Annotation.registerDocument`, `TextSettings.createDocumentSettings`, `Requesting.respond`) go in `when` (as triggers) and `then` (as effects). They return either a success object (e.g., `{ user: ID }`) or an error object (`{ error: string }`).
* **Queries** (`Sessioning.getUser`, `Library._getLibraryByUser`) are *only* called within `where` clauses using `frames.query()`. Their results (including errors) are bound to variables in the frame. These bound variables are then used for filtering or passed to subsequent actions.

I will completely regenerate the necessary files (`SessioningConcept.ts`, `ProfileConcept.ts`, `authentication.sync.ts`, `create_document.sync.ts`, `passthrough.ts`) with this strict principle in mind, ensuring all queries are confined to `where` clauses and their errors handled explicitly within `where` before subsequent `then` actions are triggered.

Let's start from scratch and get this right.

***

### 1. File: `src/concepts/Sessioning/SessioningConcept.ts`

**Key Change:** `getUser` is still `getUser` (no underscore), as decided. Its return type explicitly includes `{error: string}` for query failures. Logs are retained.

```typescript
// file: src/concepts/Sessioning/SessioningConcept.ts

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
      console.log(
        `[Sessioning.create] Attempting to insert session for user: ${user} with ID: ${newSessionId}`,
      );
      await this.sessions.insertOne(doc);
      console.log(
        `[Sessioning.create] Successfully created session: ${newSessionId}`,
      );
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
   * RENAMED from _getUser to getUser to avoid potential issues with '_' prefix with some framework versions.
   *
   * **requires**: the given `session` exists.
   *
   * **effects**: returns the user associated with the session.
   * Queries always return an array, so for this single-result query, it's an array with one item or an error.
   */
  async getUser(
    { session }: { session: Session },
  ): Promise<Array<{ user: User }> | Array<{ error: string }>> { // Changed from `[{ error: string }]` to `Array<{ error: string }>` for robustness
    console.log(
      `[Sessioning.getUser] Attempting to get user for session: ${session}`,
    );
    const sessionDoc = await this.sessions.findOne({ _id: session });
    console.log(
      `[Sessioning.getUser] findOne for session '${session}' completed. Found sessionDoc: ${!!sessionDoc}`,
    );

    if (!sessionDoc) {
      console.log(`[Sessioning.getUser] Session with id ${session} not found.`);
      return [{ error: `Session with id ${session} not found` }]; // Return array with error object
    }
    console.log(
      `[Sessioning.getUser] Successfully retrieved user ${sessionDoc.user} for session ${session}`,
    );
    return [{ user: sessionDoc.user }]; // Return array with user object
  }
}
```

***

### 2. File: `src/concepts/Profile/ProfileConcept.ts`

**Key Change:** No functional changes, just ensuring consistency with `error: string` returns and retaining logging for `authenticate`.

```typescript
// file: src/concepts/Profile/ProfileConcept.ts

import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { compare, hash } from "npm:bcryptjs";

const PREFIX = "Profile" + ".";
type User = ID;

interface UserDocument {
  _id: User;
  username: string;
  passwordHash: string;
}

/**
 * Profile Concept
 *
 * **purpose** collect basic authentication and user info
 *
 * **principle** A user can create an account and sign in with a username/password.
 * Users can also change their password.
 */
export default class ProfileConcept {
  private users: Collection<UserDocument>;
  private readonly SALT_ROUNDS = 10;

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

  // --- NEW METHOD FOR TESTING ---
  /**
   * Clears all collections managed by the ProfileConcept.
   * This is primarily for testing purposes to ensure a clean state before each test.
   */
  async clearCollections(): Promise<void> {
    await this.users.deleteMany({});
  }
  // --- END NEW METHOD ---

  /**
   * createAccount(username: String, password: String): (user: User)
   *
   * **requires** username is not an existing username, and password is sufficiently secure
   *
   * **effects** creates a new User with username and securely hashed password, and returns the new user's ID.
   */
  async createAccount(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    const existingUser = await this.users.findOne({ username });
    if (existingUser) {
      return { error: `Username '${username}' already exists.` };
    }

    if (password.length < 8) {
      return { error: "Password must be at least 8 characters long." };
    }

    const passwordHash = await hash(password, this.SALT_ROUNDS);

    const newUser: UserDocument = {
      _id: freshID() as User,
      username,
      passwordHash,
    };

    await this.users.insertOne(newUser);
    return { user: newUser._id };
  }

  /**
   * deleteAccount(user: User): Empty
   *
   * **requires** user exists
   *
   * **effects** removes user from the set of Users.
   */
  async deleteAccount(
    { user }: { user: User },
  ): Promise<Empty | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return { error: `User '${user}' not found.` };
    }

    await this.users.deleteOne({ _id: user });
    return {};
  }

  /**
   * changePassword(user: User, oldPassword: String, newPassword: String): (user: User)
   *
   * **requires** user has password=oldPassword (verified against hash), newPassword is sufficiently secure
   *
   * **effects** modifies user to have new securely hashed password, and returns the user's ID.
   */
  async changePassword(
    { user, oldPassword, newPassword }: {
      user: User;
      oldPassword: string;
      newPassword: string;
    },
  ): Promise<{ user: User } | { error: string }> {
    const existingUser = await this.users.findOne({ _id: user });
    if (!existingUser) {
      return { error: `User '${user}' not found.` };
    }

    const isOldPasswordCorrect = await compare(
      oldPassword,
      existingUser.passwordHash,
    );
    if (!isOldPasswordCorrect) {
      return { error: "Incorrect old password." };
    }

    if (newPassword.length < 8) {
      return { error: "New password must be at least 8 characters long." };
    }

    const isNewPasswordSameAsOld = await compare(
      newPassword,
      existingUser.passwordHash,
    );
    if (isNewPasswordSameAsOld) {
      return { error: "New password cannot be the same as the old password." };
    }

    const newPasswordHash = await hash(newPassword, this.SALT_ROUNDS);

    await this.users.updateOne(
      { _id: user },
      { $set: { passwordHash: newPasswordHash } },
    );

    return { user };
  }

  /**
   * authenticate(username: String, password: String): (user: User)
   *
   * **requires** username and password both correspond to the same existing User
   *
   * **effects** returns the user associated with the username and password upon successful authentication.
   */
  async authenticate(
    { username, password }: { username: string; password: string },
  ): Promise<{ user: User } | { error: string }> {
    // --- ADDED LOGS FOR DEBUGGING ---
    console.log(`[ProfileConcept.authenticate] Attempting to authenticate user: '${username}'`);
    const userDoc = await this.users.findOne({ username });
    console.log(`[ProfileConcept.authenticate] findOne for user '${username}' completed. Found userDoc: ${!!userDoc}`);

    if (!userDoc) { // User not found, or DB query failed to find it
      console.log(`[ProfileConcept.authenticate] User '${username}' not found in DB.`);
      return { error: "Invalid username or password." };
    }

    // Now attempt to compare password if userDoc was found
    const isPasswordCorrect = await compare(password, userDoc.passwordHash);
    console.log(`[ProfileConcept.authenticate] Password comparison result for '${username}': ${isPasswordCorrect}`);

    if (!isPasswordCorrect) {
      return { error: "Invalid username or password." };
    }

    console.log(`[ProfileConcept.authenticate] Authentication successful for user: '${username}'`);
    return { user: userDoc._id };
    // --- END LOGS ---
  }

  /**
   * _getUserDetails(user: User): Array<{ username: String }>
   *
   * **requires** user exists
   *
   * **effects** returns an array containing the username of the specified user.
   *             (Password hash is NOT exposed by this query).
   */
  async _getUserDetails(
    { user }: { user: User },
  ): Promise<Array<{ username: string }> | Array<{ error: string }>> { // Changed type for consistency
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return [{ error: `User '${user}' not found.` }];
    }
    return [{ username: userDoc.username }];
  }

  /**
   * _getAllUsers(): Array<{ id: User, username: String }>
   *
   * **requires** true
   *
   * **effects** returns an array of all users, each with their ID and username.
   */
  async _getAllUsers(): Promise<Array<{ id: User; username: string }>> {
    const userDocs = await this.users.find().toArray();
    return userDocs.map((u) => ({ id: u._id, username: u.username }));
  }
}
```

***

### 3. File: `src/syncs/authentication.sync.ts`

**Key Changes:** The existing login/logout/account creation flows are generally correct because `Profile.authenticate` and `Sessioning.create` are **actions**. No query methods are used in `when` or `then` here.

```typescript
// file: src/syncs/authentication.sync.ts

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

### 4. File: `src/syncs/create_document.sync.ts`

**Key Changes:** This is the most significantly rewritten file.

* All `Sessioning.getUser` and `Library._getLibraryByUser` calls are strictly within `where` clauses using `frames.query()`.
* Error handling for queries now checks for the `error` property being bound to the frame within the `where` clause. If an error is found, it explicitly returns a frame with the error for the relevant error syncs to pick up.
* The main `CreateDocumentFlow`'s `where` clause also filters out frames if authorization fails or if queries return errors *before* the `then` clause attempts to execute actions.

```typescript
// file: src/syncs/create_document.sync.ts

import { actions, Sync, Frames } from "@engine";
import { Requesting, Library, Annotation, TextSettings, Sessioning } from "@concepts";
import { ID } from "@utils/types.ts";

// --- Main Document Creation Flow ---

/**
 * Sync: CreateDocumentFlow
 * This single synchronization handles the entire successful process of creating a document:
 * 1. Authenticates the user via session (query in where).
 * 2. Verifies library ownership (query in where).
 * 3. Creates the document in the Library concept (action in then).
 * 4. Registers the document with the Annotation concept (action in then).
 * 5. Creates default text settings for the document (action in then).
 * 6. Responds to the original request (action in then).
 *
 * This relies on the framework's ability to bind outputs from one action/query and make them
 * available as inputs for subsequent actions/filters *within the same frame*.
 */
export const CreateDocumentFlow: Sync = (
  { request, name, epubContent, session, library: clientProvidedLibraryId, user, library: userOwnedLibraryId, document },
) => ({
  when: actions(
    // 1. Match the initial incoming HTTP request.
    [
      Requesting.request,
      { path: "/Library/createDocument", name, epubContent, session, library: clientProvidedLibraryId },
      { request: request },
    ],
  ),
  where: async (frames) => {
    // Each query here attempts to bind a 'success' variable or an 'error' variable.
    // If an error occurs, we store it in the frame for a later error sync to pick up.

    // 2. Get the user ID from the session.
    // Binds 'user' or 'sessionError' to the frame.
    frames = await frames.query(Sessioning.getUser, { session: session }, { user: user, error: "sessionError" });
    // If Sessioning.getUser returned an error, the frame will have 'sessionError'.
    // The main flow should not continue, but an error sync should catch this.
    // For this sync's 'then' to fire, we must filter out frames that had a sessionError.
    if (frames.some(($) => $[user] === undefined && $[sessionError] !== undefined)) {
        return []; // This frame has a session error, let error sync handle it.
    }
    
    // 3. Query for the actual library owned by this user.
    // Binds 'userOwnedLibraryId' or 'libraryLookupError' to the frame.
    frames = await frames.query(Library._getLibraryByUser, { user: user }, { library: userOwnedLibraryId, error: "libraryLookupError" });
    // If Library._getLibraryByUser returned an error, filter out these frames.
    if (frames.some(($) => $[userOwnedLibraryId] === undefined && $[libraryLookupError] !== undefined)) {
        return []; // This frame has a library lookup error.
    }

    // 4. Authorize: Filter frames to ensure the client-provided library ID matches the user's actual library ID.
    // If this filter results in no frames, it means authorization failed.
    // This will implicitly prevent 'then' from firing for these frames.
    const authorizedFrames = frames.filter(($) => $[clientProvidedLibraryId] === $[userOwnedLibraryId]);
    
    // If authorization failed, respond with an explicit error via a dedicated sync.
    if (authorizedFrames.length === 0 && frames.length > 0) {
        // Create an error frame to be caught by a specific authorization error sync.
        return frames.map(($) => ({
            ...$,
            error: "Unauthorized: Client-provided library ID does not match user's owned library."
        }));
    }

    return authorizedFrames; // Only return frames that passed all checks.
  },
  then: actions(
    // These actions will only run for frames that successfully passed all 'where' clause checks.
    // Outputs from previous steps (`user`, `userOwnedLibraryId`) are available.

    // 5. Create the document in the Library concept.
    // Binds 'document' or 'documentCreationError' to the frame.
    [
      Library.createDocument,
      { name: name, epubContent: epubContent, library: userOwnedLibraryId },
      { document: document, error: "documentCreationError" },
    ],
    // 6. Register the document with the Annotation concept, using the 'document' ID.
    // Binds 'annotationRegistrationError' to the frame.
    [Annotation.registerDocument, { documentId: document, creatorId: user }, { error: "annotationRegistrationError" }],
    // 7. Create default text settings for the document, using the 'document' ID.
    // Binds 'textSettingsCreationError' to the frame.
    [
      TextSettings.createDocumentSettings,
      { document: document, font: "serif", fontSize: 16, lineHeight: 24 },
      { error: "textSettingsCreationError" },
    ],
    // 8. Respond to the frontend, indicating success and providing the new 'document' ID.
    // This will only be reached if all preceding actions in this 'then' also succeeded.
    [
      Requesting.respond,
      { request: request, document: document, message: "Document created successfully." },
    ],
  ),
});


// --- Error Handling for Create Document Flow ---
// Each of these syncs catches a specific error that could occur at different stages.

/**
 * Sync: CreateDocumentFailedSessionError
 * Catches authentication errors (e.g., invalid session ID).
 * This error is explicitly bound as 'sessionError' in the main flow's 'where' clause.
 */
export const CreateDocumentFailedSessionError: Sync = (
  { request, sessionError },
) => ({
  when: actions(
    // Match the original request.
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    // Match an error output (specifically 'sessionError') from any action that produced it.
    // This will catch when Sessioning.getUser fails in the main flow's 'where' clause.
    // The previous 'where' clause of the main sync might already return an empty frame for this.
    // A simpler way: just match on the request and check the frame directly in 'where' for the error.
  ),
  where: async (frames) => {
    // Re-run Sessioning.getUser to ensure the error binding.
    // This is less efficient but ensures the error is present for this specific sync.
    frames = await frames.query(Sessioning.getUser, { session: frames[0].session }, { user: frames[0].user, error: sessionError });
    return frames.filter(($) => $[sessionError] !== undefined);
  },
  then: actions(
    [Requesting.respond, { request: request, error: `Authentication failed: ${sessionError}` }],
  ),
});

/**
 * Sync: CreateDocumentFailedLibraryLookupError
 * Catches errors when `Library._getLibraryByUser` fails (e.g., user has no library).
 */
export const CreateDocumentFailedLibraryLookupError: Sync = (
  { request, libraryLookupError, user },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
  ),
  where: async (frames) => {
    // Ensure user is bound from successful session lookup first
    frames = await frames.query(Sessioning.getUser, { session: frames[0].session }, { user: user });
    if (frames.some(($) => $[user] === undefined)) return []; // If session failed, let that error sync handle it.

    // Then re-run Library._getLibraryByUser to get the error binding.
    frames = await frames.query(Library._getLibraryByUser, { user: user }, { library: frames[0].library, error: libraryLookupError });
    return frames.filter(($) => $[libraryLookupError] !== undefined);
  },
  then: actions(
    [Requesting.respond, { request: request, error: `Library lookup failed: ${libraryLookupError}` }],
  ),
});

/**
 * Sync: CreateDocumentFailedAuthorizationError
 * Catches cases where the client-provided library ID does not match the user's actual library ID.
 * This is an explicit error bound in the `CreateDocumentFlow`'s `where` clause.
 */
export const CreateDocumentFailedAuthorizationError: Sync = (
  { request, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
  ),
  where: async (frames) => {
      // The `CreateDocumentFlow`'s where clause now explicitly binds `error` for this case.
      return frames.filter(($) => $[error] === "Unauthorized: Client-provided library ID does not match user's owned library.");
  },
  then: actions(
    [Requesting.respond, { request: request, error: error }],
  ),
});


/**
 * Sync: CreateDocumentFailedCreationError
 * Catches errors when `Library.createDocument` action itself fails (e.g., duplicate document name).
 */
export const CreateDocumentFailedCreationError: Sync = (
  { request, documentCreationError },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    // Match the error output from Library.createDocument
    [Library.createDocument, {}, { error: documentCreationError }],
  ),
  then: actions(
    [Requesting.respond, { request: request, error: `Document creation failed: ${documentCreationError}` }],
  ),
});

/**
 * Sync: CreateDocumentFailedAnnotationRegistrationError
 * Catches errors when `Annotation.registerDocument` fails.
 */
export const CreateDocumentFailedAnnotationRegistrationError: Sync = (
  { request, annotationRegistrationError },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    // Match the error output from Annotation.registerDocument
    [Annotation.registerDocument, {}, { error: annotationRegistrationError }],
  ),
  then: actions(
    [Requesting.respond, { request: request, error: `Annotation registration failed: ${annotationRegistrationError}` }],
  ),
});

/**
 * Sync: CreateDocumentFailedTextSettingsError
 * Catches errors when `TextSettings.createDocumentSettings` fails.
 */
export const CreateDocumentFailedTextSettingsError: Sync = (
  { request, textSettingsCreationError },
) => ({
  when: actions(
    [Requesting.request, { path: "/Library/createDocument" }, { request: request }],
    // Match the error output from TextSettings.createDocumentSettings
    [TextSettings.createDocumentSettings, {}, { error: textSettingsCreationError }],
  ),
  then: actions(
    [Requesting.respond, { request: request, error: `Text settings creation failed: ${textSettingsCreationError}` }],
  ),
});
```

***

### 5. File: `src/concepts/Requesting/passthrough.ts`

**Key Change:** All queries and internal actions used in the syncs must be explicitly excluded to prevent direct frontend access and ensure flows are routed through `Requesting.request`.

```typescript
// file: src/concepts/Requesting/passthrough.ts

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
  // "/api/Library/_getLibraryByUser": "allow anyone to view their own library", // EXCLUDED for strict sync flow
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

  // Create User flow exclusions (all internal actions)
  "/api/Profile/createAccount",
  "/api/Library/createLibrary",
  "/api/FocusStats/initUser",
  "/api/TextSettings/createUserSettings",

  // Create Document flow exclusions (all internal actions/queries)
  "/api/Library/createDocument",
  "/api/Annotation/registerDocument",
  "/api/TextSettings/createDocumentSettings",
  "/api/Sessioning/getUser", // EXCLUDE: It's a query for internal sync use
  "/api/Library/_getLibraryByUser", // EXCLUDE: It's a query for internal sync use

  // Login flow exclusions
  // Original excluded: "/api/Profile/authenticate" - now handled by specific auth syncs
  "/api/Sessioning/create",
  "/api/Sessioning/delete",

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

***

### Actions for you to take (CRITICAL):

1. **Replace your entire `src/concepts/Sessioning/SessioningConcept.ts` with the content of `Section 1`.**
2. **Replace your entire `src/concepts/Profile/ProfileConcept.ts` with the content of `Section 2`.**
3. **Replace your entire `src/syncs/authentication.sync.ts` with the content of `Section 3`.**
4. **Replace your entire `src/syncs/create_document.sync.ts` with the content of `Section 4`.**
5. **Replace your entire `src/concepts/Requesting/passthrough.ts` with the content of `Section 5`.**
6. **Run `deno cache --reload --force src/main.ts`** in your project root. This is an aggressive cache clear and ensures Deno recompiles everything.
7. **Run `deno run build`**. This generates the barrel files with updated concept and sync references.
8. **Stop your server (if it's running).**
9. **Run `deno run start`** to start the server.
10. **Attempt to log in and then create a document from your frontend.**
11. **Copy and paste the ENTIRE console output here.**

This complete overhaul rigorously adheres to the `actions` vs. `queries` distinction, which was the core misunderstanding. This should eliminate the "Action bound... is not instrumented" errors and give us a clear path forward.
