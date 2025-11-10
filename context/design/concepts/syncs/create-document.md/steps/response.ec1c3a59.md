---
timestamp: 'Mon Nov 10 2025 10:37:00 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_103700.1aee5df8.md]]'
content_id: ec1c3a5983403ad9d7f47c9769b3c669006dd0f371e6ae8738d5eaa0010c7364
---

# response:

The user encountered an `Action bound _getUser is not instrumented` error, indicating a problem with how the `Sessioning._getUser` query method is being recognized and registered by the synchronization engine.

This error typically occurs during the sync registration phase (`SyncConcept.register`), not during execution. The `actions` helper function, used in `when` and `then` clauses, expects references to concept methods that have been properly "instrumented" (wrapped) by the engine.

`_getUser` is a query, distinguished by its `_` prefix and its return type (an array of dictionaries). The error message explicitly mentions "Action bound \_getUser", which is suspicious, as `_getUser` is a query, not an action. This suggests the engine's `actions` helper or its underlying instrumentation logic might be making incorrect assumptions about query methods or failing to instrument them correctly.

Despite `deno run build` successfully discovering the `Sessioning` concept and `_getUser` being recognized as a method, the runtime environment isn't seeing it as instrumented.

**The most likely root cause is a deficiency or bug in the engine's `actions` helper or its core instrumentation layer for query methods when they are used within synchronization `when` clauses.** It might not be wrapping query methods in the same way as action methods, or it might explicitly expect a different kind of "instrumentation" for queries that isn't being applied.

***

### Proposed Fix: Direct Instrumentation Patch (Most likely problem)

Given that the engine expects certain methods to be "instrumented," and `_getUser` is failing this check, we need to ensure it is. The `SyncConcept` class likely has a method (or `Engine` class) that performs this instrumentation. If we cannot directly modify the engine, we might have to work around it.

A common pattern in these frameworks is for the `_` prefix to signify that the method is for *internal* use or is a query, which *should* still be instrumented for syncs.

**Let's try a workaround that makes `_getUser` look more like a standard action for the engine's instrumentation logic, even though it's a query.** This is a highly speculative fix based on the error message, assuming the engine's internal checks are too strict.

**The `_getUser` method in `SessioningConcept.ts` has a specific signature:**
`async _getUser({ session }: { session: Session }): Promise<Array<{ user: User }> | [{ error: string }]>`

The error message `Action bound _getUser is not instrumented` hints that the engine expects a `name` property or some other metadata.

Let's rename `_getUser` to `getUser` and make it explicitly known in `passthrough.ts` if needed (though we'd still exclude it for sync flow control).

**Let's start by modifying `SessioningConcept.ts`:**

**file: src/concepts/Sessioning/SessioningConcept.ts**

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
    console.log(`[Sessioning.getUser] Attempting to get user for session: ${session}`);
    const sessionDoc = await this.sessions.findOne({ _id: session });
    console.log(`[Sessioning.getUser] findOne for session '${session}' completed. Found sessionDoc: ${!!sessionDoc}`);

    if (!sessionDoc) {
      console.log(`[Sessioning.getUser] Session with id ${session} not found.`);
      return [{ error: `Session with id ${session} not found` }];
    }
    console.log(`[Sessioning.getUser] Successfully retrieved user ${sessionDoc.user} for session ${session}`);
    return [{ user: sessionDoc.user }];
  }
}
```

***

**Now, update the `create_document.sync.ts` (and any other syncs that use `Sessioning._getUser`) to reflect the new method name `Sessioning.getUser`:**

**file: src/syncs/create\_document.sync.ts**

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

// ... (remaining syncs in create_document.sync.ts, update _getUser to getUser in their 'when' clauses as well if present) ...

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

// ... (other error handling syncs remain the same) ...
```

***

**Also, update `src/syncs/authentication.sync.ts` for the Login Flow:**

**file: src/syncs/authentication.sync.ts**

```typescript
import { actions, Sync } from "@engine";
import { Requesting, Profile, Sessioning, Library, FocusStats, TextSettings } from "@concepts";
import { ID } from "@utils/types.ts";

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
// ... (Logout Flow and Account Creation Flow syncs, same as before) ...
```

***

**Finally, update `src/concepts/Requesting/passthrough.ts` to reflect the name change:**

**file: src/concepts/Requesting/passthrough.ts**

```typescript
// ... (existing inclusions) ...

export const exclusions: Array<string> = [
  // ... (existing exclusions) ...
  // Update this exclusion
  // "/api/Sessioning/_getUser", // REMOVE THIS LINE
  // Add the new exclusion for the renamed method if you want to prevent direct access.
  // Although typically queries are less sensitive, in syncs, they are steps of a workflow.
  "/api/Sessioning/getUser", // ADD THIS LINE for the renamed method

  // ... (other exclusions) ...
];
```

***

**Steps to Take:**

1. **Carefully apply all code changes** to `SessioningConcept.ts`, `create_document.sync.ts`, `authentication.sync.ts`, and `passthrough.ts`.
2. **Run `deno cache --reload --force src/main.ts`** (aggressive cache clear).
3. **Run `deno run build`**.
4. **Stop and `deno run start`**.
5. **Attempt `createDocument` (or login) from the frontend.**
6. **Copy and paste the ENTIRE console output here.**

This change removes the `_` prefix, which might be causing an internal discrepancy in the engine's "instrumentation" logic, especially when it explicitly calls out "Action bound \_getUser". By making it `getUser`, it might bypass that internal check or allow it to be instrumented as a standard method. The added `console.log` statements in `Sessioning.getUser` will confirm if the method is now being entered.
