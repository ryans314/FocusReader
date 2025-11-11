import { actions, Sync } from "@engine";
import {
  FocusStats,
  Library,
  Profile,
  Requesting,
  Sessioning,
  TextSettings,
} from "@concepts";
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
    [Requesting.request, { path: "/auth/login", username, password }, {
      request: request,
    }],
  ),
  then: actions(
    // Attempt authentication with the Profile concept.
    // This action will either return { user: ID } on success or { error: string } on failure.
    [Profile.authenticate, { username, password }, {
      user:
        username, /* output user for potential later use, but Profile returns its ID */
    }],
  ),
});

/**
 * Sync: LoginSuccessAndCreateSession
 * Fires when Profile.authenticate successfully returns a user.
 * Proceeds to create a new session for this authenticated user.
 */
export const LoginSuccessAndCreateSession: Sync = (
  {
    request,
    username,
    user: authenticatedUserId, /* from Profile.authenticate */
    session: newSessionId,
  },
) => ({
  when: actions(
    // Match the original login request context.
    [Requesting.request, { path: "/auth/login", username }, {
      request: request,
    }],
    // Match the successful authentication.
    [Profile.authenticate, { username }, { user: authenticatedUserId }],
  ),
  then: actions(
    // Create a session for the authenticated user.
    // This action will either return { session: ID } on success or { error: string } on failure.
    [Sessioning.create, { user: authenticatedUserId }, {
      session: newSessionId,
    }],
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
    [Requesting.request, { path: "/auth/login", username }, {
      request: request,
    }],
    // Match the successful authentication context.
    [Profile.authenticate, { username }, { user: authenticatedUserId }],
    // Match the successful session creation.
    [Sessioning.create, { user: authenticatedUserId }, {
      session: newSessionId,
    }],
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
    [Requesting.request, { path: "/auth/login", username }, {
      request: request,
    }],
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
    [Requesting.request, { path: "/auth/login", username }, {
      request: request,
    }],
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
    [Requesting.request, { path: "/auth/logout", session: sessionIdToDelete }, {
      request: request,
    }],
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
    [Requesting.request, { path: "/auth/logout", session: sessionIdToDelete }, {
      request: request,
    }],
    // Match the successful session deletion (which returns an empty object).
    [Sessioning.delete, { session: sessionIdToDelete }, {}],
  ),
  then: actions(
    // Respond to the frontend.
    [Requesting.respond, {
      request: request,
      message: "Logged out successfully",
    }],
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
    [Requesting.request, { path: "/auth/logout", session: sessionIdToDelete }, {
      request: request,
    }],
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
    [Requesting.request, { path: "/auth/createAccount", username, password }, {
      request: request,
    }],
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
      {
        request: request,
        user: user,
        message: "Account created successfully.",
      },
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
