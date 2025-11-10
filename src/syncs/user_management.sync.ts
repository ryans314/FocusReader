import { actions, Sync } from "@engine";
import {
  FocusStats,
  Library,
  Profile,
  Requesting,
  TextSettings,
} from "@concepts"; // All relevant concepts for user creation

// Define constants for default settings
const DEFAULT_FONT = '"Times New Roman", Times, serif';
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_LINE_HEIGHT = 24;

// Define the path for the orchestrated user creation endpoint
const DEFAULT_CREATE_USER_PATH = "/Profile/createAccount"; // <--- CHANGED THIS PATH

/**
 * Synchronization: CreateUserRequest
 * Purpose: Catches an incoming HTTP request to create a user and triggers the Profile.createAccount action.
 *
 * When: A Requesting.request action occurs with the path "/Profile/createAccount",
 *       providing username and password. The text settings are now implicit and hardcoded.
 * Then: Triggers the Profile.createAccount action with the provided username and password.
 */
export const CreateUserRequest: Sync = (
  { request, username, password },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: DEFAULT_CREATE_USER_PATH, username, password }, // <--- UPDATED PATH
      { request },
    ],
  ),
  then: actions(
    [Profile.createAccount, { username, password }, {}],
  ),
});

/**
 * Synchronization: HandleProfileCreateSuccessAndContinue
 * Purpose: Handles successful Profile.createAccount and proceeds to create associated resources
 *          (Library, FocusStats, TextSettings) for the new user.
 *
 * When: The original Requesting.request for "/Profile/createAccount" occurred,
 *       AND Profile.createAccount successfully returned a 'user' ID.
 * Then: Triggers:
 *       1. Library.createLibrary for the new user.
 *       2. FocusStats.initUser for the new user.
 *       3. TextSettings.createUserSettings for the new user with **hardcoded default settings**.
 */
export const HandleProfileCreateSuccessAndContinue: Sync = (
  { request, user, username, password },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: DEFAULT_CREATE_USER_PATH, username, password }, // <--- UPDATED PATH
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }],
  ),
  then: actions(
    [Library.createLibrary, { user }, {}],
    [FocusStats.initUser, { user }, {}],
    [
      TextSettings.createUserSettings,
      {
        font: DEFAULT_FONT,
        fontSize: DEFAULT_FONT_SIZE,
        lineHeight: DEFAULT_LINE_HEIGHT,
        user,
      },
      {},
    ],
  ),
});

/**
 * Synchronization: HandleProfileCreateErrorAndRespond
 * Purpose: Responds to the original request if Profile.createAccount fails.
 *
 * When: The original Requesting.request for "/Profile/createAccount" occurred,
 *       AND Profile.createAccount failed (returned an 'error').
 * Then: Responds to the original request with the error message.
 */
export const HandleProfileCreateErrorAndRespond: Sync = (
  { request, username, password, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: DEFAULT_CREATE_USER_PATH, username, password }, // <--- UPDATED PATH
      { request },
    ],
    [Profile.createAccount, { username, password }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Synchronization: HandleAllSubsequentCreatesSuccessAndRespond
 * Purpose: Finalizes the user creation process by responding successfully to the original request
 *          once all associated resources (Profile, Library, FocusStats, TextSettings) have been created.
 *
 * When: The original Requesting.request for "/Profile/createAccount" occurred,
 *       AND Profile.createAccount succeeded (returned 'user'),
 *       AND Library.createLibrary succeeded (returned 'library'),
 *       AND FocusStats.initUser succeeded (returned 'focusStats'),
 *       AND TextSettings.createUserSettings succeeded (returned 'settings').
 * Then: Responds to the original request with the IDs of the newly created user and their associated resources.
 */
export const HandleAllSubsequentCreatesSuccessAndRespond: Sync = (
  { request, user, username, password, library, focusStats, settings },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: DEFAULT_CREATE_USER_PATH, username, password }, // <--- UPDATED PATH
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }],
    [Library.createLibrary, { user }, { library }],
    [FocusStats.initUser, { user }, { focusStats }],
    [
      TextSettings.createUserSettings,
      {
        font: DEFAULT_FONT,
        fontSize: DEFAULT_FONT_SIZE,
        lineHeight: DEFAULT_LINE_HEIGHT,
        user,
      },
      { settings },
    ],
  ),
  then: actions(
    [Requesting.respond, { request, user, library, focusStats, settings }],
  ),
});

/**
 * Synchronization: HandleLibraryCreateErrorAndRespond
 * Purpose: Catches errors from Library.createLibrary and responds to the original request.
 *
 * When: The original Requesting.request for "/Profile/createAccount" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND Library.createLibrary failed.
 * Then: Responds to the original request with the error message from Library.createLibrary.
 */
export const HandleLibraryCreateErrorAndRespond: Sync = (
  { request, user, username, password, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: DEFAULT_CREATE_USER_PATH, username, password }, // <--- UPDATED PATH
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }],
    [Library.createLibrary, { user }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Synchronization: HandleFocusStatsInitErrorAndRespond
 * Purpose: Catches errors from FocusStats.initUser and responds to the original request.
 *
 * When: The original Requesting.request for "/Profile/createAccount" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND FocusStats.initUser failed.
 * Then: Responds to the original request with the error message from FocusStats.initUser.
 */
export const HandleFocusStatsInitErrorAndRespond: Sync = (
  { request, user, username, password, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: DEFAULT_CREATE_USER_PATH, username, password }, // <--- UPDATED PATH
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }],
    [FocusStats.initUser, { user }, { error }],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Synchronization: HandleTextSettingsCreateErrorAndRespond
 * Purpose: Catches errors from TextSettings.createUserSettings and responds to the original request.
 *
 * When: The original Requesting.request for "/Profile/createAccount" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND TextSettings.createUserSettings failed.
 * Then: Responds to the original request with the error message from TextSettings.createUserSettings.
 */
export const HandleTextSettingsCreateErrorAndRespond: Sync = (
  { request, user, username, password, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: DEFAULT_CREATE_USER_PATH, username, password }, // <--- UPDATED PATH
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }],
    [
      TextSettings.createUserSettings,
      {
        font: DEFAULT_FONT,
        fontSize: DEFAULT_FONT_SIZE,
        lineHeight: DEFAULT_LINE_HEIGHT,
        user,
      },
      { error },
    ],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
