
[@sync-background](/design/tools/sync-background.md)

[@FocusReader-background](/design/background/FocusReader-background.md)

[@Journal](/design/journal/Journal.md)

[@api.md](/design/background/api.md)

# Syncs
# Prompt: create a createUser sync. This should call all of the relevant functions (many identified in the "route thoughts:" section of the journal) to create and initialize the user. 
# response:

```typescript
// file: src/syncs/user_management.sync.ts

// These imports help you declare synchronizations and access concept instances
import { actions, Sync } from "@engine";
import {
  Requesting,
  Profile,
  Library,
  FocusStats,
  TextSettings,
} from "@concepts"; // All relevant concepts for user creation

/**
 * Synchronization: CreateUserRequest
 * Purpose: Catches an incoming HTTP request to create a user and triggers the Profile.createAccount action.
 *
 * When: A Requesting.request action occurs with the path "/users/create",
 *       providing username, password, and initial text settings (font, fontSize, lineHeight).
 * Then: Triggers the Profile.createAccount action with the provided username and password.
 */
export const CreateUserRequest: Sync = (
  { request, username, password, font, fontSize, lineHeight },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
  ),
  then: actions(
    [Profile.createAccount, { username, password }, {}], // Outputs will be handled by subsequent syncs
  ),
});

/**
 * Synchronization: HandleProfileCreateSuccessAndContinue
 * Purpose: Handles successful Profile.createAccount and proceeds to create associated resources
 *          (Library, FocusStats, TextSettings) for the new user.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount successfully returned a 'user' ID.
 * Then: Triggers:
 *       1. Library.createLibrary for the new user.
 *       2. FocusStats.initUser for the new user.
 *       3. TextSettings.createUserSettings for the new user with default settings.
 */
export const HandleProfileCreateSuccessAndContinue: Sync = (
  { request, user, username, password, font, fontSize, lineHeight },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Matches successful profile creation
  ),
  then: actions(
    [Library.createLibrary, { user }, {}], // Outputs will be handled by subsequent syncs
    [FocusStats.initUser, { user }, {}],
    [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, {}],
  ),
});

/**
 * Synchronization: HandleProfileCreateErrorAndRespond
 * Purpose: Responds to the original request if Profile.createAccount fails.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount failed (returned an 'error').
 * Then: Responds to the original request with the error message.
 */
export const HandleProfileCreateErrorAndRespond: Sync = (
  { request, username, password, error },
) => ({
  when: actions(
    [Requesting.request, { path: "/users/create", username, password }, { request }],
    [Profile.createAccount, { username, password }, { error }], // Matches failed profile creation
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
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded (returned 'user'),
 *       AND Library.createLibrary succeeded (returned 'library'),
 *       AND FocusStats.initUser succeeded (returned 'focusStats'),
 *       AND TextSettings.createUserSettings succeeded (returned 'settings').
 * Then: Responds to the original request with the IDs of the newly created user and their associated resources.
 */
export const HandleAllSubsequentCreatesSuccessAndRespond: Sync = (
  { request, user, username, password, font, fontSize, lineHeight, library, focusStats, settings },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }],
    [Library.createLibrary, { user }, { library }],
    [FocusStats.initUser, { user }, { focusStats }],
    [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, { settings }],
  ),
  then: actions(
    // Respond with all successfully created IDs
    [Requesting.respond, { request, user, library, focusStats, settings }],
  ),
});

/**
 * Synchronization: HandleSubsequentCreateErrorAndRespond
 * Purpose: Catches errors from any of the subsequent resource creation steps (Library, FocusStats, TextSettings)
 *          and responds to the original request with the encountered error.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded (returned 'user'),
 *       AND any of the following failed (returned an 'error'):
 *       - Library.createLibrary
 *       - FocusStats.initUser
 *       - TextSettings.createUserSettings
 * Then: Responds to the original request with the error message.
 */
export const HandleSubsequentCreateErrorAndRespond: Sync = (
  { request, user, username, password, font, fontSize, lineHeight, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Profile creation must have succeeded
    // Match any of the subsequent actions failing
    [
      [Library.createLibrary, { user }, { error }],
      [FocusStats.initUser, { user }, { error }],
      [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, { error }],
    ],
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```


# Prompt: I get the following error for the following lines in the  HandleSubsequentCreateErrorAndRespond sync:

Lines with errors on it:
```
[

      [Library.createLibrary, { user }, { error }],

      [FocusStats.initUser, { user }, { error }],

      [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, { error }],

    ],
```

Error on the createLibrary line
```
Type '((({ user }: { user: ID; }) => Promise<{ library?: ID | undefined; error?: string | undefined; }>) | { user: symbol; } | { error: symbol; })[]' is missing the following properties from type 'InstrumentedAction': apply, call, bind, prototype, and 5 more.deno-ts(2740)
```

Error on the initUser line:
```
Type '(((input: { user: ID; }) => Promise<{ focusStats: ID; } | { error: string; }>) | { user: symbol; } | { error: symbol; })[]' is not assignable to type 'Mapping'.  
Index signature for type 'string' is missing in type '(((input: { user: ID; }) => Promise<{ focusStats: ID; } | { error: string; }>) | { user: symbol; } | { error: symbol; })[]'.deno-ts(2322)
```

Error on the createUserSettings line:
```
Type '((({ font, fontSize, lineHeight, user }: { font: string; fontSize: number; lineHeight: number; user: ID; }) => Promise<{ settings: ID; } | { error: string; }>) | { font: symbol; fontSize: symbol; lineHeight: symbol; user: symbol; } | { ...; })[]' is not assignable to type 'Mapping'.  
Index signature for type 'string' is missing in type '((({ font, fontSize, lineHeight, user }: { font: string; fontSize: number; lineHeight: number; user: ID; }) => Promise<{ settings: ID; } | { error: string; }>) | { font: symbol; fontSize: symbol; lineHeight: symbol; user: symbol; } | { ...; })[]'.deno-ts(2322)
```
# response:

You've hit a common pattern-matching limitation when trying to express "OR" logic directly within the `when` clause using the provided DSL.

The `actions()` helper expects a flat list of action patterns, where each pattern represents an action that *must* have occurred (a conjunction). It doesn't support nested arrays to mean "this action OR that action".

To handle errors from *any one* of the subsequent creation steps, you need to create **separate synchronizations** for each potential failure point.

Here's how you would refactor `HandleSubsequentCreateErrorAndRespond` into three distinct synchronizations, one for each possible failure:

```typescript
// file: src/syncs/user_management.sync.ts

// These imports help you declare synchronizations and access concept instances
import { actions, Sync } from "@engine";
import {
  Requesting,
  Profile,
  Library,
  FocusStats,
  TextSettings,
} from "@concepts";

// ... (previous syncs: CreateUserRequest, HandleProfileCreateSuccessAndContinue, HandleProfileCreateErrorAndRespond, HandleAllSubsequentCreatesSuccessAndRespond) ...

/**
 * Synchronization: HandleLibraryCreateErrorAndRespond
 * Purpose: Catches errors from Library.createLibrary and responds to the original request.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND Library.createLibrary failed.
 * Then: Responds to the original request with the error message from Library.createLibrary.
 */
export const HandleLibraryCreateErrorAndRespond: Sync = (
  { request, user, username, password, font, fontSize, lineHeight, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Profile creation must have succeeded
    [Library.createLibrary, { user }, { error }], // Library creation failed
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Synchronization: HandleFocusStatsInitErrorAndRespond
 * Purpose: Catches errors from FocusStats.initUser and responds to the original request.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND FocusStats.initUser failed.
 * Then: Responds to the original request with the error message from FocusStats.initUser.
 */
export const HandleFocusStatsInitErrorAndRespond: Sync = (
  { request, user, username, password, font, fontSize, lineHeight, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Profile creation must have succeeded
    [FocusStats.initUser, { user }, { error }], // FocusStats initialization failed
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Synchronization: HandleTextSettingsCreateErrorAndRespond
 * Purpose: Catches errors from TextSettings.createUserSettings and responds to the original request.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND TextSettings.createUserSettings failed.
 * Then: Responds to the original request with the error message from TextSettings.createUserSettings.
 */
export const HandleTextSettingsCreateErrorAndRespond: Sync = (
  { request, user, username, password, font, fontSize, lineHeight, error },
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password, font, fontSize, lineHeight },
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Profile creation must have succeeded
    [TextSettings.createUserSettings, { font, fontSize, lineHeight, user }, { error }], // TextSettings creation failed
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```

**Explanation of the fix:**

*   **No "OR" in `when` clause:** The `when` clause is fundamentally conjunctive. If you list multiple actions, *all* of them must match for the sync to fire. There's no direct syntax for "Action A occurred AND (Action B failed OR Action C failed)".
*   **Separate Syncs for Disjunction:** To achieve "OR" logic (i.e., respond if *any one* of these subsequent steps fails), you create a separate synchronization for each potential failure path. Each new sync `when` clause includes the common preceding actions (`Requesting.request` and successful `Profile.createAccount`) plus the specific action that failed (e.g., `Library.createLibrary` returning an `error`).
*   **Clarity and maintainability:** While it results in more `Sync` definitions, this approach is explicit, clear, and aligns with how the synchronization engine processes events. It makes debugging easier as each sync covers a specific, well-defined scenario.

# prompt: what routes should I exclude for this sync? Is there any additional work that I need to do on the backend to incorporate this sync (e.g. updating the api)?
# response:

Okay, let's break down the implications of your new `createUser` synchronization logic for your backend.

### 1. Routes to Exclude in `passthrough.ts`

Your `createUser` synchronization chain provides a single, orchestrated entry point (`/users/create`) for the entire user creation process. This means that users should **not** be able to directly call the individual concept actions that are part of this orchestration, as doing so would bypass the intended flow and could lead to an inconsistent state (e.g., a user account without a corresponding library or focus stats).

Therefore, you should **add the following routes to the `exclusions` array in `src/concepts/Requesting/passthrough.ts`**:

*   `/api/Profile/createAccount`
*   `(/api/Library/createLibrary)` - *This was already in your journal's "EXCLUDE" list.*
*   `(/api/FocusStats/initUser)` - *This was already in your journal's "EXCLUDE" list.*
*   `(/api/TextSettings/createUserSettings)` - *This was already in your journal's "EXCLUDE" list.*

**Updated `src/concepts/Requesting/passthrough.ts` (showing relevant changes):**

```typescript
// ... (inclusions remain as you have them, with any new ones) ...

export const exclusions: Array<string> = [
  // ... (existing exclusions) ...
  "/api/Profile/createAccount", // Exclude direct access, handled by /users/create sync
  "/api/Library/createLibrary", // Exclude direct access, handled by /users/create sync
  "/api/FocusStats/initUser", // Exclude direct access, handled by /users/create sync
  "/api/TextSettings/createUserSettings", // Exclude direct access, handled by /users/create sync
  // ... (other exclusions from your journal) ...
];
```

By excluding these, any HTTP request attempting to call these individual actions directly via their passthrough route will instead be treated as a `Requesting.request` action for the path (e.g., `/Profile/createAccount`). However, you don't have a specific synchronization catching *those* requests, so they would likely time out. The intention is to funnel all user creation through `/users/create`.

### 2. Additional Backend Work to Incorporate This Sync

The good news is that the Concept Design framework is designed to handle this seamlessly!

*   **No Manual API Route Changes:** You do **not** need to manually define new HTTP routes in a traditional sense (e.g., adding `app.post("/users/create", ...)`). The `Requesting` concept already handles:
    *   Listening for all `POST` requests under its `REQUESTING_BASE_URL` (e.g., `/api/*`).
    *   Translating an incoming `POST /api/users/create` into a `Requesting.request` action with `path: "/users/create"`.
    *   Waiting for a `Requesting.respond` action to be triggered by your syncs and sending that response back to the client.
*   **Sync Discovery:** As long as your `user_management.sync.ts` file is located within the `src/syncs/` directory (or a subdirectory thereof), the Concept Engine will automatically discover and load all the synchronizations defined within it when the application starts.
*   **Concept Instantiation:** Your `Profile`, `Library`, `FocusStats`, and `TextSettings` concepts are already instantiated by the engine. Your syncs will interact with these instances.

**In summary, the primary "additional work" is simply to:**

1.  **Ensure `user_management.sync.ts` is in `src/syncs/`**. (You've already done this by defining the file there).
2.  **Update `passthrough.ts` as described above.** This is a crucial configuration step.
3.  **Run `deno run build`** (always a good idea after adding/modifying concepts or syncs to ensure imports are correctly generated, though strictly, for new syncs referencing existing concepts, it's less about the build and more about `start` picking them up).
4.  **Run `deno run start`** to launch your application with the new user creation flow.

Your synchronization logic elegantly replaces what would traditionally be a complex controller, multiple service calls, and error handling in a more conventional architecture.

# Prompt: When updating the front end (which previously manually called all of these actions), what work would I need to do? 
# response:

This is where the power of concept design and synchronizations truly shines from a front-end perspective!

Your front-end work will become significantly simpler and more robust because the complex orchestration of user creation has been entirely moved to the backend's synchronization layer.

Here's a breakdown of the work needed on the front-end:

### 1. Consolidate API Calls

**Old Front-End Logic (before syncs):**
You would have likely had a sequence of API calls, potentially chained with `await` or `Promise.all` after getting the user ID from `Profile.createAccount`:

```typescript
// Example of old front-end logic
async function registerUser(username, password, font, fontSize, lineHeight) {
  try {
    // 1. Create Profile
    const profileResponse = await fetch("/api/Profile/createAccount", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    const { user: newUserId, error: profileError } = await profileResponse.json();
    if (profileError) throw new Error(profileError);

    // 2. Create Library
    const libraryResponse = await fetch("/api/Library/createLibrary", {
      method: "POST",
      body: JSON.stringify({ user: newUserId }),
    });
    const { library: newLibraryId, error: libraryError } = await libraryResponse.json();
    if (libraryError) throw new Error(libraryError);

    // 3. Init Focus Stats
    const focusStatsResponse = await fetch("/api/FocusStats/initUser", {
      method: "POST",
      body: JSON.stringify({ user: newUserId }),
    });
    const { focusStats: newFocusStatsId, error: focusStatsError } = await focusStatsResponse.json();
    if (focusStatsError) throw new Error(focusStatsError);

    // 4. Create User Text Settings
    const textSettingsResponse = await fetch("/api/TextSettings/createUserSettings", {
      method: "POST",
      body: JSON.stringify({ user: newUserId, font, fontSize, lineHeight }),
    });
    const { settings: newSettingsId, error: textSettingsError } = await textSettingsResponse.json();
    if (textSettingsError) throw new Error(textSettingsError);

    // All successful, update UI
    console.log("User created:", newUserId, newLibraryId, newFocusStatsId, newSettingsId);
    return { user: newUserId, library: newLibraryId, focusStats: newFocusStatsId, settings: newSettingsId };

  } catch (error) {
    console.error("Registration failed:", error.message);
    throw error;
  }
}
```

**New Front-End Logic (with syncs):**
You will replace all those individual calls with a single call to your new orchestrated endpoint:

```typescript
// Example of new front-end logic
async function registerUser(username, password, font, fontSize, lineHeight) {
  try {
    const response = await fetch("/api/users/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
        font,
        fontSize,
        lineHeight,
      }),
    });

    const result = await response.json();

    if (result.error) {
      throw new Error(result.error);
    }

    // On success, the result will contain all IDs
    const { user, library, focusStats, settings } = result;
    console.log("User created:", user, library, focusStats, settings);
    return { user, library, focusStats, settings };

  } catch (error) {
    console.error("Registration failed:", error.message);
    throw error;
  }
}
```

### 2. Update UI Components (e.g., Registration Form)

*   **Input Fields:** Ensure your registration form collects all necessary data upfront: `username`, `password`, `font`, `fontSize`, and `lineHeight`. Previously, some of these (like text settings) might have been configured later or implicitly.
*   **Loading States:** Simplify your loading/pending states. Instead of showing "Creating profile...", then "Creating library...", etc., you'll just have one "Creating account..." state until the single backend request completes.
*   **Error Display:** Your error messages will now come from a single source on the backend (e.g., "Username 'X' already exists.", "Password must be at least 8 characters long.", or "Failed to create user settings due to database error."). This makes displaying user-friendly feedback much more straightforward.

### 3. Simplify State Management

If you're using a state management library (Redux, Zustand, React Context, etc.), the actions you dispatch and the state you update will also simplify:

*   **Old:** You might have dispatched `CREATE_PROFILE_SUCCESS`, then `CREATE_LIBRARY_SUCCESS`, etc.
*   **New:** You'll dispatch a single `CREATE_USER_REQUEST`, then either `CREATE_USER_SUCCESS` (with all the returned IDs) or `CREATE_USER_FAILURE` (with the single error message). This leads to cleaner reducers/state updates.

### 4. Adjust for Backend Timeouts

Since a single front-end request now triggers multiple backend operations, the total time for the backend to respond might increase slightly. Your `Requesting` concept has a `REQUESTING_TIMEOUT`. The front-end's `fetch` API also has its own (often longer) timeout, or you might be using a library like `axios` with configurable timeouts. Be aware that a `504 Gateway Timeout` could occur if the backend takes too long to respond before your syncs can call `Requesting.respond`.

### Key Advantages for the Front-End:

*   **Single Source of Truth:** The backend's synchronizations now explicitly define the atomic "create user" operation. The front-end no longer needs to know the intricate steps.
*   **Reduced Complexity:** Less boilerplate, fewer chained `await`s, and simplified error handling on the client side.
*   **Atomic Operations:** From the client's perspective, user creation is a single, atomic transaction. Either all associated resources are created, or none are, which simplifies UI feedback and ensures data consistency.
*   **Fewer Network Round Trips:** One HTTP request instead of many, potentially improving performance and reducing latency.

In essence, the front-end becomes a "dumb client" that just sends the initial request and receives the final outcome, without needing to understand or orchestrate the complex inter-concept logic.

# Prompt: I actually use the same default textSettings for all newly created users, can you update the sync to put in the values (so the front end doesn't need to)? 

Font: '"Times New Roman", Times, serif'
FontSize: 16
LineHeight: 24
# response:

Okay, this is a great improvement for simplifying the front-end! By embedding the default text settings directly into the user creation flow, the front-end no longer needs to worry about providing them.

Here's the updated `user_management.sync.ts` file with the hardcoded default values for text settings:

```typescript
// file: src/syncs/user_management.sync.ts

// These imports help you declare synchronizations and access concept instances
import { actions, Sync } from "@engine";
import {
  Requesting,
  Profile,
  Library,
  FocusStats,
  TextSettings,
} from "@concepts"; // All relevant concepts for user creation

// Define constants for default settings
const DEFAULT_FONT = '"Times New Roman", Times, serif';
const DEFAULT_FONT_SIZE = 16;
const DEFAULT_LINE_HEIGHT = 24;

/**
 * Synchronization: CreateUserRequest
 * Purpose: Catches an incoming HTTP request to create a user and triggers the Profile.createAccount action.
 *
 * When: A Requesting.request action occurs with the path "/users/create",
 *       providing username and password. The text settings are now implicit and hardcoded.
 * Then: Triggers the Profile.createAccount action with the provided username and password.
 */
export const CreateUserRequest: Sync = (
  { request, username, password }, // font, fontSize, lineHeight removed
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password }, // font, fontSize, lineHeight removed
      { request },
    ],
  ),
  then: actions(
    [Profile.createAccount, { username, password }, {}], // Outputs will be handled by subsequent syncs
  ),
});

/**
 * Synchronization: HandleProfileCreateSuccessAndContinue
 * Purpose: Handles successful Profile.createAccount and proceeds to create associated resources
 *          (Library, FocusStats, TextSettings) for the new user.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount successfully returned a 'user' ID.
 * Then: Triggers:
 *       1. Library.createLibrary for the new user.
 *       2. FocusStats.initUser for the new user.
 *       3. TextSettings.createUserSettings for the new user with **hardcoded default settings**.
 */
export const HandleProfileCreateSuccessAndContinue: Sync = (
  { request, user, username, password }, // font, fontSize, lineHeight removed
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password }, // font, fontSize, lineHeight removed
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Matches successful profile creation
  ),
  then: actions(
    [Library.createLibrary, { user }, {}], // Outputs will be handled by subsequent syncs
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
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount failed (returned an 'error').
 * Then: Responds to the original request with the error message.
 */
export const HandleProfileCreateErrorAndRespond: Sync = (
  { request, username, password, error }, // font, fontSize, lineHeight removed
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password }, // font, fontSize, lineHeight removed
      { request },
    ],
    [Profile.createAccount, { username, password }, { error }], // Matches failed profile creation
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
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded (returned 'user'),
 *       AND Library.createLibrary succeeded (returned 'library'),
 *       AND FocusStats.initUser succeeded (returned 'focusStats'),
 *       AND TextSettings.createUserSettings succeeded (returned 'settings').
 * Then: Responds to the original request with the IDs of the newly created user and their associated resources.
 */
export const HandleAllSubsequentCreatesSuccessAndRespond: Sync = (
  { request, user, username, password, library, focusStats, settings }, // font, fontSize, lineHeight removed
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password }, // font, fontSize, lineHeight removed
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
    // Respond with all successfully created IDs
    [Requesting.respond, { request, user, library, focusStats, settings }],
  ),
});

/**
 * Synchronization: HandleLibraryCreateErrorAndRespond
 * Purpose: Catches errors from Library.createLibrary and responds to the original request.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND Library.createLibrary failed.
 * Then: Responds to the original request with the error message from Library.createLibrary.
 */
export const HandleLibraryCreateErrorAndRespond: Sync = (
  { request, user, username, password, error }, // font, fontSize, lineHeight removed
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password }, // font, fontSize, lineHeight removed
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Profile creation must have succeeded
    [Library.createLibrary, { user }, { error }], // Library creation failed
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Synchronization: HandleFocusStatsInitErrorAndRespond
 * Purpose: Catches errors from FocusStats.initUser and responds to the original request.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND FocusStats.initUser failed.
 * Then: Responds to the original request with the error message from FocusStats.initUser.
 */
export const HandleFocusStatsInitErrorAndRespond: Sync = (
  { request, user, username, password, error }, // font, fontSize, lineHeight removed
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password }, // font, fontSize, lineHeight removed
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Profile creation must have succeeded
    [FocusStats.initUser, { user }, { error }], // FocusStats initialization failed
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});

/**
 * Synchronization: HandleTextSettingsCreateErrorAndRespond
 * Purpose: Catches errors from TextSettings.createUserSettings and responds to the original request.
 *
 * When: The original Requesting.request for "/users/create" occurred,
 *       AND Profile.createAccount succeeded,
 *       AND TextSettings.createUserSettings failed.
 * Then: Responds to the original request with the error message from TextSettings.createUserSettings.
 */
export const HandleTextSettingsCreateErrorAndRespond: Sync = (
  { request, user, username, password, error }, // font, fontSize, lineHeight removed
) => ({
  when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password }, // font, fontSize, lineHeight removed
      { request },
    ],
    [Profile.createAccount, { username, password }, { user }], // Profile creation must have succeeded
    [
      TextSettings.createUserSettings,
      {
        font: DEFAULT_FONT,
        fontSize: DEFAULT_FONT_SIZE,
        lineHeight: DEFAULT_LINE_HEIGHT,
        user,
      },
      { error },
    ], // TextSettings creation failed, matching the hardcoded inputs
  ),
  then: actions(
    [Requesting.respond, { request, error }],
  ),
});
```

# Prompt: I'm getting an error with the request timing out, I think your paths are wrong? Unless I'm supposed to change them. Below is the console output from when the client tried to create an account

```
[Requesting] Received request for path: /Profile/createAccount

Requesting.request {
  username: 'Attempt1',
  password: '1234567890',
  path: '/Profile/createAccount'
} => { request: '019a6db5-bb94-7851-9f49-4049d86cb2c9' }

[Requesting] Error processing request: Request 019a6db5-bb94-7851-9f49-4049d86cb2c9 timed out after 10000ms
```
# response:

You've accurately diagnosed the problem! The issue isn't with your synchronization paths being *wrong* in `user_management.sync.ts`, but rather a mismatch between **where your client is sending the request** and **where your synchronizations are listening**.

Let's break down why this is happening and how to fix it:

**Understanding the Console Output:**

```
[Requesting] Received request for path: /Profile/createAccount
```
This line is key. It tells you that your client-side code is still making a `POST` request to the endpoint `/api/Profile/createAccount`.

**Why Your Syncs Aren't Firing:**

In your `user_management.sync.ts`, all your `createUser` synchronizations (like `CreateUserRequest`, `HandleProfileCreateSuccessAndContinue`, etc.) have a `when` clause that looks like this:

```typescript
when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password }, // <-- This is what your syncs are looking for
      { request },
    ],
    // ... rest of the when clause ...
  ),
```
Because the incoming `Requesting.request` action has `path: "/Profile/createAccount"` (from your client), it *does not match* the `path: "/users/create"` your syncs are expecting. Since the `when` condition isn't met, none of your `createUser` synchronizations fire.

**Why the Timeout:**

The `Requesting` concept intercepts the client's request to `/api/Profile/createAccount`. Because `/api/Profile/createAccount` is in your `passthrough.ts` exclusions, `Requesting` *doesn't* execute `Profile.createAccount` directly. Instead, it generates a `Requesting.request` action with `path: "/Profile/createAccount"` and then calls `_awaitResponse` to wait for a `Requesting.respond` action.

Since no synchronization `when` clause matches the `Requesting.request` for `"/Profile/createAccount"`, no `Requesting.respond` action is ever triggered. The `_awaitResponse` query in `RequestingConcept` then waits for the configured `REQUESTING_TIMEOUT` (10000ms by default) and eventually throws a timeout error.

**The Solution:**

You need to update your **front-end client** to send the `POST` request to the correct, orchestrated endpoint: `/api/users/create`.

**Client-Side Work:**

Update the `fetch` (or `axios`, or whatever HTTP client you're using) call in your front-end.

**Old Client-Side Request (Example):**

```typescript
// Likely in your registration form submission handler
async function registerUser(username, password) {
  const response = await fetch("/api/Profile/createAccount", { // <-- THIS IS THE PROBLEM LINE
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  // ... handle response ...
}
```

**New Client-Side Request (Corrected):**

```typescript
// Update this in your front-end code
async function registerUser(username, password) {
  const response = await fetch("/api/users/create", { // <-- Corrected path!
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      // REMEMBER: font, fontSize, lineHeight are now hardcoded in the sync,
      // so you don't need to send them from the front-end anymore.
    }),
  });

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }
  console.log("User created successfully:", result);
  return result;
}
```

**No Additional Backend API Changes:**

You **do not** need to make any changes to your backend API routes or `Requesting` concept itself. The framework is designed for exactly this. The `Requesting` concept is already listening to `/api/*` requests, and your synchronizations are correctly set up to catch the `Requesting.request` actions with `path: "/users/create"`.

Once you update your client, the request flow will be:

1.  Client `POST` to `/api/users/create`.
2.  `RequestingConcept` intercepts, creates `Requesting.request({ path: "/users/create", username, password })`.
3.  Your `CreateUserRequest` sync matches `path: "/users/create"` and triggers `Profile.createAccount`.
4.  Subsequent syncs handle the flow, and `HandleAllSubsequentCreatesSuccessAndRespond` eventually calls `Requesting.respond`.
5.  `RequestingConcept` sends that response back to your client.

Make this change on your front-end, and it should resolve the timeout!

# Prompt: I would rather you keep the request paths the same as the paths as the initiating action (i.e. use /api/Profile/createAccount, since that is the initiating action). Do you think that would be bad for any reason?
# response:

You've hit on a really important design question in concept-based architectures!

To answer your direct question first:
**No, it would not be "bad" in the sense that it wouldn't work.** The system is flexible enough to handle this. You would just need to update the `path` argument in the `when` clauses of your `createUser` synchronizations.

**However, from a Concept Design and API design perspective, it is generally not the recommended approach, and here's why:**

1.  **Conflation of External API with Internal Concept Action:**
    *   `Profile.createAccount` is an *action belonging to the `Profile` concept*. It's a low-level operation focused solely on managing user profiles (username, password hash).
    *   Your `createUser` synchronization chain (`/users/create`) represents a *high-level, orchestrated business process* that involves multiple concepts (`Profile`, `Library`, `FocusStats`, `TextSettings`).
    *   By using `/Profile/createAccount` as the external API endpoint for this *orchestrated process*, you are blurring the line between a single concept's action and a composite business flow. This can be confusing for API consumers and future developers.

2.  **Misleading Semantics:**
    *   When someone sends a request to `/api/Profile/createAccount`, their natural expectation is that they are only interacting with the `Profile` concept. They wouldn't necessarily expect this single API call to also create a `Library`, initialize `FocusStats`, and set up `TextSettings`.
    *   A path like `/users/create` (or `/accounts/register`, `/onboarding/user`) more accurately conveys that it's a comprehensive operation for establishing a new user identity and their initial ecosystem within your application.

3.  **Reduced API Stability and Increased Coupling:**
    *   If you later decide to rename the `Profile` concept (e.g., `UserIdentity`), or if the `createAccount` action's name changes within the `Profile` concept, your external API endpoint (`/api/Profile/createAccount`) would also have to change.
    *   By having a more abstract endpoint like `/users/create`, your external API surface is more stable and less coupled to the internal naming conventions of specific concepts. The internal orchestration can evolve without necessarily breaking external clients.

4.  **Implications for Error Messages and Debugging:**
    *   If a request to `/api/Profile/createAccount` fails because, for example, `Library.createLibrary` encounters an error ("User already has a library"), the error message might seem out of place given the endpoint name. A high-level endpoint name helps contextualize errors from any part of the orchestration.

**In summary:** While functionally it will work, choosing `/api/Profile/createAccount` for an orchestrated flow goes against the spirit of separating concerns between high-level business processes (handled by syncs and abstract API paths) and low-level concept actions (handled by individual concept methods).

---

### If you still prefer to use `/Profile/createAccount` as the API path:

Here are the changes you would make to your `src/syncs/user_management.sync.ts`. The `DEFAULT_CREATE_USER_PATH` constant is introduced to make it easier to change this in one place if needed.

```typescript
// file: src/syncs/user_management.sync.ts

// These imports help you declare synchronizations and access concept instances
import { actions, Sync } from "@engine";
import {
  Requesting,
  Profile,
  Library,
  FocusStats,
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
```

# Prompt: Consider the following description from the assignment. After reading, does it make more sense why keeping and reusing the same path would be good?

This section explains how the concept server that we’re providing you with works, and how it minimizes the changes you’ll need to make. This action server extends the behavior of the previous concept server to accommodate syncs.

**The previous action server**. For your previous assignment, we gave you a simple server that automatically routed post requests that were sent to `/api/concept_c/action_a` to the action called `action_a` of the concept called `concept_c`. This allowed you to avoid having to define routes explicitly, since they were defined by the concepts and their actions.

**A new action server**. In this assignment, we’re providing you with a similar server, this time embodied in a special concept called _Requesting_. When this concept is instantiated, it starts up a server that takes requests and either passes them through (like the old server) directly to concepts, or turns them into request actions to be used in syncs. By default, requests are passed through (or “included”), so if you use the action server out of the box it will behave exactly like the old action server. For example, an HTTP request coming into the back end with the route `/api/concept_c/action_a` will by default call action `action_a` of concept `concept_c`.

Alternatively you can list an action as “excluded,” and it will then be turned into a request action. For example, if `/api/concept_c/action_a` is excluded, an HTTP request coming into the back end with that route will generate the action `Requesting.request` (that is, the `request` action of the special `Requesting` concept) with an argument (called `path`) set to the string `concept_c/action_a`. You can then write a sync on this action. If you don’t write a sync, there will be no reaction to the request and it will eventually time out and return an error.

You can also list an action as “included,” which doesn’t affect the behavior (since that’s the default) but records the fact that you _intend_ it to be included so it will stop printing a warning message telling you that it’s been included by default.

**Why exclude actions**? Excluding a concept action means that calling `/api/concept_c/action_a` no longer directly causes `Concept_c.action_a` to occur. There are primarily two reasons for wanting this. One is that the action should only be permitted under certain conditions (such as when the user has been authenticated); you would implement this with a sync saying that _when_ the request occurs and _where_ some condition holds, _then_ the action itself occurs. Note that in this case the call to `/api/concept_c/action_a` would likely have to be modified because the request action would include parameters (such as a session token) that the bare concept action does not.

A second reason is that the action is to be handled only by the back end and no longer be available to the front end at all. For example, in a social media app, a notification action might be excluded so that it can be executed automatically in response to a comment being added to a user’s post. Note that in this case the only likely change to the front end (if it was previously executing the notification explicitly) is that some calls are removed.
# response:

Yes, after re-reading that section, it absolutely makes more sense why you might choose to **keep the request path the same as the initiating concept action** (e.g., `/api/Profile/createAccount`) when orchestrating it with synchronizations.

Here's why, drawing directly from the provided documentation:

1.  **Leveraging Default Routing and Minimizing Explicit Route Definition:**
    The documentation states: "This allowed you to avoid having to define routes explicitly, since they were defined by the concepts and their actions." and "By default, requests are passed through (or “included”), so if you use the action server out of the box it will behave exactly like the old action server."
    *   **Good Implication:** By sticking to `/api/ConceptName/actionName`, you're leveraging the *built-in convention* of the `Requesting` concept. You don't have to invent an entirely new, arbitrary path like `/users/create`. The system *already understands* what `/api/Profile/createAccount` is intended to refer to.

2.  **Explicitly Intercepting and Augmenting a Specific Concept Action:**
    The documentation explains: "Alternatively you can list an action as 'excluded,' and it will then be turned into a request action... You can then write a sync on this action." And a reason to exclude: "One is that the action should only be permitted under certain conditions (such as when the user has been authenticated); you would implement this with a sync saying that *when* the request occurs and *where* some condition holds, *then* the action itself occurs."
    *   **Good Implication:** Your scenario (creating a user and *then* initializing related concepts like Library, FocusStats, TextSettings) is an extension of "permitted under certain conditions." You're essentially saying: "When a request for `Profile.createAccount` comes in, I want to intercept it, *add more steps to its fulfillment*, and then ensure it *actually creates the profile* (among other things)." By excluding `/api/Profile/createAccount` and writing syncs for its `Requesting.request` counterpart, you're taking explicit control over *that specific fundamental action's execution flow*, rather than creating a completely new, top-level "orchestration" endpoint.

3.  **Minimizing Client-Side Changes for Backend Enhancements:**
    If your front-end was *already* calling `/api/Profile/createAccount` directly, then by excluding it and writing synchronizations, you achieve a powerful backend change (orchestration) without requiring any change to the client-side URL. The client continues to call the same endpoint, but the backend's behavior behind that endpoint completely transforms.
    *   **Good Implication:** This is a strong benefit for backward compatibility and incremental development. You can significantly alter how an operation is handled on the backend (e.g., adding authentication, logging, or multi-concept orchestration) without forcing a client update.

**In essence, the framework provides `passthrough.ts` and the `Requesting` concept precisely so you can choose between:**

*   **Direct Passthrough (Included):** Let `Concept.action` run directly.
*   **Intercept and Orchestrate (Excluded):** Intercept the `Requesting.request` for `Concept.action` and define its new behavior (which might include calling `Concept.action` later, along with other actions and queries).

So, while my previous advice leaned towards semantic clarity for API paths (e.g., `/users/create` for a composite operation), your choice to reuse `/api/Profile/createAccount` is a perfectly valid and supported pattern within this Concept Design framework, especially if you prioritize:
*   Leveraging the inherent routing convention.
*   Explicitly enhancing the behavior of an existing concept action.
*   Minimizing client-side API path changes.

Therefore, updating your syncs to use `path: "/Profile/createAccount"` is a completely reasonable and well-supported approach.

# Prompt: I've linked the api.md file for the front end. Please update it to be accurate given the changes to our backend API. Please do NOT consider the things described in the Journal, only consider the user_management sync and exclusions in passthrough.ts when removing segments of the api. 
# response:

Okay, I will update the API specifications for the front-end to reflect the changes due to the `user_management` sync and the corresponding `passthrough.ts` exclusions.

The key changes are:
*   The `POST /api/Profile/createAccount` endpoint will now represent the **orchestrated user creation flow**, meaning its description and response bodies will be updated to reflect the successful creation of not just the user profile, but also their associated Library, FocusStats, and TextSettings. The request body for text settings will be removed as it's hardcoded in the sync.
*   The following endpoints are now **excluded from direct client access** and are only invoked internally by the `createUser` sync chain. Therefore, they will be *removed* from the public API specifications:
    *   `POST /api/Library/createLibrary`
    *   `POST /api/FocusStats/initUser`
    *   `POST /api/TextSettings/createUserSettings`
*   Other exclusions mentioned in `passthrough.ts` (e.g., `Profile/deleteAccount`, `Library/createDocument`, etc.) will also lead to their removal from the API specification, as they are no longer directly callable by the client. Only endpoints explicitly "included" in `passthrough.ts` or part of an orchestrated flow (like `/Profile/createAccount` now is) will remain.

Here are the updated API specifications:

---

# API Specification: Annotation Concept

**Purpose:** allow users to create annotations within documents and search amongst their annotations

***

## API Endpoints

### POST /api/Annotation/createAnnotation

**Description:** Creates a new annotation within a document for a user.

**Requirements:**

*   The document must exist (in Annotation concept's view), and its creator must match the provided creator.
*   The location must exist and be a well-defined CFI string (validation is assumed by external caller).
*   The color (if provided) must be a valid HTML color.
*   At least one of color or content must not be omitted.

**Effects:**

*   Creates and adds a new annotation with the specified creator, document, color, content, location, and tags to the set of Annotations.
*   Adds the new annotation's ID to the document's set of annotations (within the Annotation concept's view).
*   Returns the ID of the newly created annotation.

**Request Body:**

```json
{
  "creator": "ID",
  "document": "ID",
  "color": "string",
  "content": "string",
  "location": "string",
  "tags": ["ID"]
}
```

**Success Response Body (Action):**

```json
{
  "annotation": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Annotation/deleteAnnotation

**Description:** Deletes an existing annotation.

**Requirements:**

*   The annotation must exist.
*   The user must be the creator of the annotation.

**Effects:**

*   Removes the annotation from all sets of Annotations.
*   Removes the annotation's ID from the associated document's set of annotations.

**Request Body:**

```json
{
  "user": "ID",
  "annotation": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Annotation/updateAnnotation

**Description:** Modifies the properties of an existing annotation.

**Requirements:**

*   The annotation must exist and its creator must match the provided user.
*   The newColor (if provided) must be a valid HTML color.
*   Any of newColor, newContent, newLocation, and newTags may be omitted for partial updates.

**Effects:**

*   Modifies the specified annotation to have the provided newColor, newContent, newLocation, and newTags for each attribute that is not omitted.
*   Returns the ID of the updated annotation.

**Request Body:**

```json
{
  "user": "ID",
  "annotation": "ID",
  "newColor": "string",
  "newContent": "string",
  "newLocation": "string",
  "newTags": ["ID"]
}
```

**Success Response Body (Action):**

```json
{
  "annotation": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Annotation/search

**Description:** Searches for annotations within a document that match specific criteria.

**Requirements:**

*   The document must exist (in Annotation concept's view).
*   User must be the creator of the document (in this concept's view).

**Effects:**

*   Returns a list of annotations created by the user within the specified document that have content or tags matching the criteria.

**Request Body:**

```json
{
  "user": "ID",
  "document": "ID",
  "criteria": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "annotations": [
      {
        "_id": "ID",
        "creator": "ID",
        "document": "ID",
        "color": "string",
        "content": "string",
        "location": "string",
        "tags": ["ID"]
      }
    ]
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Annotation/registerDocument

**Description:** Registers a document in the Annotation concept's view. This is a temporary, unsecured helper so front-end clients (or scripts) can make the Annotation concept aware of a document created elsewhere (for example, by the Library concept) until a backend sync is implemented.

**Requirements:**

*   None (this helper does not perform authentication or additional validation beyond existence in the concept's collection).

**Effects:**

*   Inserts a document view record for the provided document ID and creator ID. If the document is already registered, an error is returned by the current implementation.

**Request Body:**

```json
{
  "documentId": "ID",
  "creatorId": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

# API Specification: FocusStats Concept

**Purpose:** track and aggregate users' reading statistics

***

## API Endpoints

### POST /api/FocusStats/removeSession

**Description:** Permanently deletes a specific reading session record.

**Requirements:**

*   The specified focusSession must exist.

**Effects:**

*   Removes the focusSession from the set of FocusSessions.
*   Removes the reference to this focusSession ID from the user's FocusStats object.

**Request Body:**

```json
{
  "focusSession": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FocusStats/\_viewStats

**Description:** Retrieves a high-level overview of a user's reading statistics.

**Requirements:**

*   The user must be associated with a FocusStats object.

**Effects:**

*   Returns an array containing the FocusStats object for the given user, including its ID, user ID, and an array of referenced FocusSession IDs.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "focusStats": {
      "id": "ID",
      "user": "ID",
      "focusSessionIds": ["ID"]
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FocusStats/\_getSessions

**Description:** Retrieves detailed information for all individual reading sessions of a specific user.

**Requirements:**

*   The user must be associated with a FocusStats object.

**Effects:**

*   Returns an array containing all FocusSession documents belonging to the given user.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "focusSession": {
      "_id": "ID",
      "user": "ID",
      "document": "ID",
      "startTime": "Date",
      "endTime": "Date | null"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

# API Specification: Library Concept

**Purpose:** allow users to add, remove, view, and access their uploaded documents

***

## API Endpoints

### POST /api/Library/removeDocument

**Description:** Removes a document from a user's library and deletes the document record.

**Requirements:**

*   The library must exist.
*   The document must be present in the specified library.

**Effects:**

*   Removes the document's ID from the library's documents set.
*   Deletes the document record from the set of all documents.

**Request Body:**

```json
{
  "library": "ID",
  "document": "ID"
}
```

**Success Response Body (Action):**

```json
{}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Library/renameDocument

**Description:** Changes the name of an existing document within a user's library.

**Requirements:**

*   The document must exist.
*   The document must be associated with a library owned by the specified user.
*   The newName must not be the name of an existing document within that user's library (excluding the document being renamed).

**Effects:**

*   Changes the specified document's name to the newName.
*   Returns the ID of the updated document.

**Request Body:**

```json
{
  "user": "ID",
  "newName": "string",
  "document": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "document": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Library/\_getLibraryByUser

**Description:** Retrieves the library document associated with a specific user.

**Requirements:**

*   The user must exist and have a library.

**Effects:**

*   Returns the full library document for the specified user.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "library": {
      "_id": "ID",
      "user": "ID",
      "documents": ["ID"]
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Library/\_getDocumentsInLibrary

**Description:** Retrieves all documents (including their content) that are part of a given library.

**Requirements:**

*   The library must exist.

**Effects:**

*   Returns an array of document objects, each containing its ID, name, and epub content, for all documents in the specified library.

**Request Body:**

```json
{
  "library": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "document": {
      "_id": "ID",
      "name": "string",
      "epubContent": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Library/\_getDocumentDetails

**Description:** Retrieves the full details (name, epubContent) of a specific document.

**Requirements:**

*   The document must exist.

**Effects:**

*   Returns the document object containing its ID, name, and epub content.

**Request Body:**

```json
{
  "document": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "document": {
      "_id": "ID",
      "name": "string",
      "epubContent": "string"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

# API Specification: Profile Concept

**Purpose:** collect basic authentication and user info

***

## API Endpoints

### POST /api/Profile/createAccount

**Description:** Initiates the complete user account creation process, including establishing a user profile, creating a default library, initializing focus statistics, and setting up default text display preferences. This endpoint orchestrates multiple backend concepts.

**Requirements:**

*   The `username` must not be an existing username.
*   The `password` must be sufficiently secure (e.g., at least 8 characters long).

**Effects:**

*   Creates a new user profile with the provided username and a securely hashed password.
*   Creates a new library associated with the user.
*   Initializes focus statistics for the user.
*   Creates and associates default text display settings for the user using hardcoded values.
*   Returns the IDs of the newly created user, library, focus statistics record, and default text settings.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "ID",
  "library": "ID",
  "focusStats": "ID",
  "settings": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Profile/authenticate

**Description:** Authenticates a user with their username and password.

**Requirements:**

*   The provided username and password must both correspond to the same existing user (after password hashing verification).

**Effects:**

*   Returns the ID of the user associated with the successfully authenticated username and password.

**Request Body:**

```json
{
  "username": "string",
  "password": "string"
}
```

**Success Response Body (Action):**

```json
{
  "user": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

# API Specification: TextSettings Concept

**Purpose:** allow users to customize and set different text/display settings for each of their documents

***

## API Endpoints

### POST /api/TextSettings/\_getUserDefaultSettings

**Description:** Retrieves the default text settings configuration for a given user.

**Requirements:**

*   The user must exist (implicitly handled).

**Effects:**

*   Returns an array containing the default TextSettings configuration for the user, if one exists.
*   Returns an empty array if no default settings are found for the user.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "settings": {
      "_id": "ID",
      "font": "string",
      "fontSize": "number",
      "lineHeight": "number"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/TextSettings/\_getDocumentCurrentSettings

**Description:** Retrieves the current text settings configuration for a given document.

**Requirements:**

*   The document must exist (implicitly handled).

**Effects:**

*   Returns an array containing the current TextSettings configuration for the document, if one exists.
*   Returns an empty array if no current settings are found for the document.

**Request Body:**

```json
{
  "document": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "settings": {
      "_id": "ID",
      "font": "string",
      "fontSize": "number",
      "lineHeight": "number"
    }
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```