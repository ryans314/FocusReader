[@Profile](Profile.md)

[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

[@chosen-testing-implementation](/context/design/concepts/Profile/testing.md/steps/response.8e1ca84d.md)

# Test: Profile

# Chosen testing file:
This is the code I used:, from your response here
```
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ProfileConcept from "./ProfileConcept.ts";
import { ID } from "@utils/types.ts";
import { Db, MongoClient } from "npm:mongodb";

// Declare shared variables for the database and client.
// These will be initialized once for the entire test file.
let dbInstance: Db;
let clientInstance: MongoClient;

// --- Global Hooks for the entire test file ---

// Hook to run ONCE before ALL tests (and test steps) in this file.
Deno.test.beforeAll(async () => {
  [dbInstance, clientInstance] = await testDb(); // This creates a new DB and drops it ONCE per file.
  console.log("--- Initialized test database for Profile Concept Tests ---");
});

// Hook to run ONCE after ALL tests (and test steps) in this file have completed.
Deno.test.afterAll(async () => {
  if (clientInstance) {
    console.log("--- Closing MongoDB client after Profile Concept Tests ---");
    await clientInstance.close();
  }
});

// --- Main Test Suite ---
Deno.test("Profile Concept Tests Suite", {
  sanitizeResources: false, // Often useful for DB tests that manage external resources
  sanitizeOps: false,       // Often useful for DB tests with async DB operations
}, async (test) => {

  // IMPORTANT: The `beforeEach` hook is removed.
  // Each `test.step` will now explicitly set up its own ProfileConcept instance
  // and clear its state to ensure true isolation.

  await test.step("Action: createAccount - Successful creation", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: createAccount - Successful creation ---");
    const username = "alice";
    const password = "securePassword123";

    const result = await profileConcept.createAccount({ username, password });
    console.log(`  Attempted to create account for ${username}. Result: ${JSON.stringify(result)}`);

    assertExists((result as { user: ID }).user, "User ID should be returned on successful creation.");

    const users = await profileConcept._getAllUsers();
    console.log(`  Current users: ${JSON.stringify(users)}`);
    assertEquals(users.length, 1, "There should be one user in the database.");
    assertEquals(users[0].username, username, "The created user's username should match.");

    const userDetails = await profileConcept._getUserDetails({ user: (result as { user: ID }).user });
    console.log(`  Details for created user: ${JSON.stringify(userDetails)}`);
    assertExists(userDetails, "User details should be retrievable.");
    assertEquals((userDetails as Array<{ username: string }>)[0].username, username, "Retrieved username should match.");
  });

  await test.step("Action: createAccount - Duplicate username", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: createAccount - Duplicate username ---");
    const username = "bob";
    const password = "bobPassword123";

    await profileConcept.createAccount({ username, password }); // Create first account
    console.log(`  Created account for ${username}.`);

    const result = await profileConcept.createAccount({ username, password }); // Attempt duplicate
    console.log(`  Attempted duplicate account for ${username}. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for duplicate username.");
    assertEquals(
      (result as { error: string }).error,
      `Username '${username}' already exists.`,
      "Error message should indicate duplicate username.",
    );
  });

  await test.step("Action: createAccount - Insecure password", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: createAccount - Insecure password ---");
    const username = "charlie";
    const password = "short"; // Insecure password

    const result = await profileConcept.createAccount({ username, password });
    console.log(`  Attempted to create account for ${username} with insecure password. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for insecure password.");
    assertEquals(
      (result as { error: string }).error,
      "Password must be at least 8 characters long.",
      "Error message should indicate insecure password.",
    );
  });

  await test.step("Action: authenticate - Successful authentication", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: authenticate - Successful authentication ---");
    const username = "david";
    const password = "davidPassword123";
    const { user: userId } = (await profileConcept.createAccount({ username, password })) as { user: ID };
    console.log(`  Created account for ${username} with ID ${userId}.`);

    const result = await profileConcept.authenticate({ username, password });
    console.log(`  Attempted to authenticate ${username}. Result: ${JSON.stringify(result)}`);

    assertExists((result as { user: ID }).user, "User ID should be returned on successful authentication.");
    assertEquals(
      (result as { user: ID }).user,
      userId,
      "Authenticated user ID should match the created user's ID.",
    );
  });

  await test.step("Action: authenticate - Invalid username", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: authenticate - Invalid username ---");
    const username = "nonExistent";
    const password = "anyPassword123";

    const result = await profileConcept.authenticate({ username, password });
    console.log(`  Attempted to authenticate non-existent user ${username}. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for invalid username.");
    assertEquals(
      (result as { error: string }).error,
      "Invalid username or password.",
      "Error message should indicate invalid credentials.",
    );
  });

  await test.step("Action: authenticate - Incorrect password", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: authenticate - Incorrect password ---");
    const username = "eve";
    const password = "evePassword123";
    await profileConcept.createAccount({ username, password });
    console.log(`  Created account for ${username}.`);

    const result = await profileConcept.authenticate({ username, password: "wrongPassword" });
    console.log(`  Attempted to authenticate ${username} with wrong password. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for incorrect password.");
    assertEquals(
      (result as { error: string }).error,
      "Invalid username or password.",
      "Error message should indicate invalid credentials.",
    );
  });

  await test.step("Action: changePassword - Successful password change", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: changePassword - Successful password change ---");
    const username = "frank";
    const oldPassword = "frankPassword123";
    const newPassword = "newFrankPassword456";
    const { user: userId } = (await profileConcept.createAccount({ username, password: oldPassword })) as { user: ID };
    console.log(`  Created account for ${username} with ID ${userId}.`);

    const authOld = await profileConcept.authenticate({ username, password: oldPassword });
    assertExists((authOld as { user: ID }).user, "Should authenticate with old password successfully.");
    console.log(`  Authenticated with old password.`);

    const result = await profileConcept.changePassword({ user: userId, oldPassword, newPassword });
    console.log(`  Attempted to change password for ${username}. Result: ${JSON.stringify(result)}`);

    assertExists((result as { user: ID }).user, "User ID should be returned on successful password change.");
    assertEquals((result as { user: ID }).user, userId, "Returned user ID should match.");

    const authFailed = await profileConcept.authenticate({ username, password: oldPassword });
    assertExists((authFailed as { error: string }).error, "Old password should no longer work.");
    console.log(`  Attempt to authenticate with old password (expected failure): ${JSON.stringify(authFailed)}`);

    const authSuccess = await profileConcept.authenticate({ username, password: newPassword });
    assertExists((authSuccess as { user: ID }).user, "New password should work.");
    assertEquals((authSuccess as { user: ID }).user, userId, "Authenticated with new password successfully.");
    console.log(`  Authenticated with new password.`);
  });

  await test.step("Action: changePassword - Incorrect old password", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: changePassword - Incorrect old password ---");
    const username = "grace";
    const oldPassword = "gracePassword123";
    const newPassword = "newGracePassword456";
    const { user: userId } = (await profileConcept.createAccount({ username, password: oldPassword })) as { user: ID };
    console.log(`  Created account for ${username} with ID ${userId}.`);

    const result = await profileConcept.changePassword({ user: userId, oldPassword: "wrongOldPassword", newPassword });
    console.log(`  Attempted to change password for ${username} with incorrect old password. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for incorrect old password.");
    assertEquals(
      (result as { error: string }).error,
      "Incorrect old password.",
      "Error message should indicate incorrect old password.",
    );
  });

  await test.step("Action: changePassword - Insecure new password", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: changePassword - Insecure new password ---");
    const username = "heidi";
    const oldPassword = "heidiPassword123";
    const newPassword = "short";
    const { user: userId } = (await profileConcept.createAccount({ username, password: oldPassword })) as { user: ID };
    console.log(`  Created account for ${username} with ID ${userId}.`);

    const result = await profileConcept.changePassword({ user: userId, oldPassword, newPassword });
    console.log(`  Attempted to change password for ${username} with insecure new password. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for insecure new password.");
    assertEquals(
      (result as { error: string }).error,
      "New password must be at least 8 characters long.",
      "Error message should indicate insecure new password.",
    );
  });

  await test.step("Action: changePassword - New password same as old", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: changePassword - New password same as old ---");
    const username = "ivan";
    const password = "ivanPassword123";
    const { user: userId } = (await profileConcept.createAccount({ username, password })) as { user: ID };
    console.log(`  Created account for ${username} with ID ${userId}.`);

    const result = await profileConcept.changePassword({ user: userId, oldPassword: password, newPassword: password });
    console.log(`  Attempted to change password for ${username} to the same password. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned when new password is same as old.");
    assertEquals(
      (result as { error: string }).error,
      "New password cannot be the same as the old password.",
      "Error message should indicate new password is same as old.",
    );
  });

  await test.step("Action: changePassword - User not found", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: changePassword - User not found ---");
    const nonExistentUser = "user:nonExistent" as ID;
    const oldPassword = "anyOldPassword";
    const newPassword = "anyNewPassword123";

    const result = await profileConcept.changePassword({ user: nonExistentUser, oldPassword, newPassword });
    console.log(`  Attempted to change password for non-existent user. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for a non-existent user.");
    assertEquals(
      (result as { error: string }).error,
      `User '${nonExistentUser}' not found.`,
      "Error message should indicate user not found.",
    );
  });

  await test.step("Action: deleteAccount - Successful deletion", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: deleteAccount - Successful deletion ---");
    const username = "john";
    const password = "johnPassword123";
    const { user: userId } = (await profileConcept.createAccount({ username, password })) as { user: ID };
    console.log(`  Created account for ${username} with ID ${userId}.`);

    let users = await profileConcept._getAllUsers();
    assertEquals(users.length, 1, "Initially, there should be one user.");

    const result = await profileConcept.deleteAccount({ user: userId });
    console.log(`  Attempted to delete account for ${username}. Result: ${JSON.stringify(result)}`);

    assertEquals(result, {}, "Empty object should be returned on successful deletion.");

    users = await profileConcept._getAllUsers();
    assertEquals(users.length, 0, "After deletion, there should be no users.");

    const authResult = await profileConcept.authenticate({ username, password });
    assertExists((authResult as { error: string }).error, "Deleted user should not be able to authenticate.");
    console.log(`  Attempted to authenticate deleted user (expected failure): ${JSON.stringify(authResult)}`);
  });

  await test.step("Action: deleteAccount - User not found", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: deleteAccount - User not found ---");
    const nonExistentUser = "user:nonExistent" as ID;

    const result = await profileConcept.deleteAccount({ user: nonExistentUser });
    console.log(`  Attempted to delete non-existent user. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for a non-existent user.");
    assertEquals(
      (result as { error: string }).error,
      `User '${nonExistentUser}' not found.`,
      "Error message should indicate user not found.",
    );
  });

  await test.step("Query: _getUserDetails - Retrieve user details", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: _getUserDetails - Retrieve user details ---");
    const username = "karen";
    const password = "karenPassword123";
    const { user: userId } = (await profileConcept.createAccount({ username, password })) as { user: ID };
    console.log(`  Created account for ${username} with ID ${userId}.`);

    const userDetails = await profileConcept._getUserDetails({ user: userId });
    console.log(`  Retrieved details for user ${userId}: ${JSON.stringify(userDetails)}`);

    assertExists(userDetails, "User details should be returned.");
    assertEquals(
      (userDetails as Array<{ username: string }>)[0].username,
      username,
      "Retrieved username should match.",
    );
    assertEquals(Object.keys((userDetails as Array<{ username: string }>)[0]).includes("passwordHash"), false, "Password hash should NOT be returned by _getUserDetails.");
  });

  await test.step("Query: _getUserDetails - User not found", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: _getUserDetails - User not found ---");
    const nonExistentUser = "user:nonExistent" as ID;

    const result = await profileConcept._getUserDetails({ user: nonExistentUser });
    console.log(`  Attempted to get details for non-existent user. Result: ${JSON.stringify(result)}`);

    assertExists((result as { error: string }).error, "An error should be returned for a non-existent user.");
    assertEquals(
      (result as { error: string }).error,
      `User '${nonExistentUser}' not found.`,
      "Error message should indicate user not found.",
    );
  });

  await test.step("Query: _getAllUsers - Retrieve all users", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("--- Test: _getAllUsers - Retrieve all users ---");
    await profileConcept.createAccount({ username: "user1", password: "pass1234" });
    await profileConcept.createAccount({ username: "user2", password: "pass5678" });
    console.log(`  Created two accounts: user1, user2.`);

    const users = await profileConcept._getAllUsers();
    console.log(`  All users retrieved: ${JSON.stringify(users)}`);

    assertEquals(users.length, 2, "Should retrieve all two created users.");
    const usernames = users.map((u) => u.username).sort();
    assertEquals(usernames, ["user1", "user2"], "Retrieved usernames should match.");
  });

  await test.step("Principle: A user can create an account and sign in with a username/password. Users can also change their password.", async () => {
    // --- Per-step setup for isolation ---
    const profileConcept = new ProfileConcept(dbInstance);
    await profileConcept.clearCollections();
    console.log("  Clearing ProfileConcept collections before test step...");
    // --- End per-step setup ---

    console.log("\n--- Principle Trace: Create, Authenticate, Change Password, Re-authenticate ---");

    const username = "principleUser";
    const initialPassword = "initialSecurePassword123";
    const newPassword = "newSecurePassword456";

    console.log(`1. Action: createAccount('${username}', '${initialPassword}')`);
    const createResult = await profileConcept.createAccount({ username, password: initialPassword });
    assertExists((createResult as { user: ID }).user, "Account creation should be successful.");
    const userId = (createResult as { user: ID }).user;
    console.log(`   Effect: User '${username}' created with ID: ${userId}`);

    console.log(`2. Action: authenticate('${username}', '${initialPassword}')`);
    const authInitialResult = await profileConcept.authenticate({ username, password: initialPassword });
    assertExists((authInitialResult as { user: ID }).user, "Authentication with initial password should succeed.");
    assertEquals((authInitialResult as { user: ID }).user, userId, "Authenticated user ID should match.");
    console.log(`   Effect: User '${username}' successfully authenticated with initial password.`);

    console.log(`3. Action: changePassword('${userId}', '${initialPassword}', '${newPassword}')`);
    const changePasswordResult = await profileConcept.changePassword({
      user: userId,
      oldPassword: initialPassword,
      newPassword: newPassword,
    });
    assertExists((changePasswordResult as { user: ID }).user, "Password change should be successful.");
    assertEquals((changePasswordResult as { user: ID }).user, userId, "Changed password for correct user ID.");
    console.log(`   Effect: User '${username}' password changed from initial to new password.`);

    console.log(`4. Action: authenticate('${username}', '${initialPassword}') (Expected failure)`);
    const authOldPasswordResult = await profileConcept.authenticate({ username, password: initialPassword });
    assertExists((authOldPasswordResult as { error: string }).error, "Authentication with old password should fail.");
    console.log(`   Effect: Authentication with old password failed as expected: ${JSON.stringify(authOldPasswordResult.error)}`);

    console.log(`5. Action: authenticate('${username}', '${newPassword}') (Expected success)`);
    const authNewPasswordResult = await profileConcept.authenticate({ username, password: newPassword });
    assertExists((authNewPasswordResult as { user: ID }).user, "Authentication with new password should succeed.");
    assertEquals((authNewPasswordResult as { user: ID }).user, userId, "Authenticated user ID should match.");
    console.log(`   Effect: User '${username}' successfully authenticated with new password.`);

    console.log("\nPrinciple fulfilled: User created account, signed in, changed password, and signed in with new password.");
  });
});
```


# Prompt: can you explain what each test in the above testing file does?
# response:

This test file, `src/concepts/Profile/ProfileConcept.test.ts`, systematically verifies the functionality of the `ProfileConcept` as defined in its specification. It uses Deno's built-in testing framework and an isolated MongoDB database instance for each test run.

Here's an explanation of each test step:

### Global Test Setup and Teardown

*   **`Deno.test.beforeAll`**: This hook runs once before all tests (and test steps) in this file begin.
    *   It initializes a shared MongoDB database instance (`dbInstance`) and client (`clientInstance`) using `testDb()`. This ensures that all tests in this file operate against a consistent and isolated database.
    *   `console.log` messages indicate the start of the test suite's database initialization.
*   **`Deno.test.afterAll`**: This hook runs once after all tests (and test steps) in this file have completed.
    *   It safely closes the MongoDB client (`clientInstance`), releasing database resources.
    *   `console.log` messages confirm the client closure.
*   **`Deno.test("Profile Concept Tests Suite", ...)`**: This defines the main test suite that encapsulates all individual test steps.
    *   `sanitizeResources: false` and `sanitizeOps: false` are set. These flags can prevent Deno from reporting unclosed resources or uncaught promise rejections in complex async scenarios like database interactions, making tests more stable if resource management is handled explicitly (as it is here with `beforeAll`/`afterAll`).
    *   **Crucial Pattern for Isolation**: Inside *each* `test.step`, the following lines are executed:
        ```typescript
        const profileConcept = new ProfileConcept(dbInstance);
        await profileConcept.clearCollections();
        console.log("  Clearing ProfileConcept collections before test step...");
        ```
        This is paramount for test isolation. It ensures that every individual `test.step` starts with an empty state for the `ProfileConcept`'s collections (users), preventing data from previous steps from interfering with the current one. This is key to robust unit testing for concepts.

### Individual Test Steps

1.  **"Action: createAccount - Successful creation"**
    *   **Purpose**: To verify that the `createAccount` action successfully creates a new user when all `requires` conditions are met.
    *   **Actions**: Calls `createAccount` with a unique username ("alice") and a password that meets security criteria (length > 8).
    *   **Assertions**:
        *   `assertExists((result as { user: ID }).user)`: Checks that a user ID is returned upon successful creation, fulfilling the `effects` clause.
        *   `profileConcept._getAllUsers()` and `assertEquals(users.length, 1)`: Verifies that exactly one user was added to the database.
        *   `assertEquals(users[0].username, username)`: Confirms the username of the created user matches the input.
        *   `profileConcept._getUserDetails()` and `assertEquals((userDetails as Array<{ username: string }>)[0].username, username)`: Ensures the user's details (specifically the username) can be retrieved correctly using the new user ID.
    *   **Verifies `requires`**: Username is not existing, password is secure.
    *   **Verifies `effects`**: Creates a new user with username and hashed password, returns user ID.

2.  **"Action: createAccount - Duplicate username"**
    *   **Purpose**: To verify that `createAccount` correctly handles the scenario where a username already exists, as specified by its `requires` clause.
    *   **Actions**: Creates an account for "bob", then attempts to create another account with the *same* username.
    *   **Assertions**:
        *   `assertExists((result as { error: string }).error)`: Checks that an error is returned.
        *   `assertEquals((result as { error: string }).error, \`Username '${username}' already exists.\`)`: Verifies the specific error message, confirming the `requires` condition (`username is not an existing username`) was enforced.

3.  **"Action: createAccount - Insecure password"**
    *   **Purpose**: To verify that `createAccount` rejects passwords that do not meet the security criteria, as specified by its `requires` clause.
    *   **Actions**: Attempts to create an account for "charlie" with a short, insecure password ("short").
    *   **Assertions**:
        *   `assertExists((result as { error: string }).error)`: Checks that an error is returned.
        *   `assertEquals((result as { error: string }).error, "Password must be at least 8 characters long.")`: Verifies the specific error message, confirming the `requires` condition (`password is sufficiently secure`) was enforced.

4.  **"Action: authenticate - Successful authentication"**
    *   **Purpose**: To verify that the `authenticate` action correctly authenticates a user with valid credentials.
    *   **Actions**: Creates an account for "david", then attempts to authenticate using "david" and the correct password.
    *   **Assertions**:
        *   `assertExists((result as { user: ID }).user)`: Checks that a user ID is returned.
        *   `assertEquals((result as { user: ID }).user, userId)`: Confirms the returned user ID matches the ID of the created user, fulfilling the `effects` clause.
    *   **Verifies `requires`**: Username and hashed password correspond to an existing user.
    *   **Verifies `effects`**: Returns the associated user.

5.  **"Action: authenticate - Invalid username"**
    *   **Purpose**: To verify that `authenticate` fails when the provided username does not exist.
    *   **Actions**: Attempts to authenticate with a username ("nonExistent") that was never created.
    *   **Assertions**: Checks for an error and verifies the specific error message "Invalid username or password.", confirming the `requires` condition was enforced.

6.  **"Action: authenticate - Incorrect password"**
    *   **Purpose**: To verify that `authenticate` fails when the provided password does not match the stored password hash for the given username.
    *   **Actions**: Creates an account for "eve", then attempts to authenticate with "eve" but an incorrect password ("wrongPassword").
    *   **Assertions**: Checks for an error and verifies the specific error message "Invalid username or password.", confirming the `requires` condition was enforced.

7.  **"Action: changePassword - Successful password change"**
    *   **Purpose**: To verify that `changePassword` successfully updates a user's password, invalidates the old password, and makes the new password effective.
    *   **Actions**:
        1.  Creates an account for "frank".
        2.  Authenticates with the `oldPassword` (expected success).
        3.  Calls `changePassword` with the correct `userId`, `oldPassword`, and a `newPassword`.
        4.  Attempts to authenticate with the `oldPassword` again (expected failure).
        5.  Attempts to authenticate with the `newPassword` (expected success).
    *   **Assertions**: A series of `assertExists` and `assertEquals` calls to confirm successful authentication with the old password initially, then the `changePassword` return, and finally, authentication failure with the old password and success with the new one.
    *   **Verifies `requires`**: User exists, old password matches, new password is secure.
    *   **Verifies `effects`**: User's `passwordHash` is modified, returns user ID.

8.  **"Action: changePassword - Incorrect old password"**
    *   **Purpose**: To verify that `changePassword` fails if the provided `oldPassword` does not match the current password hash.
    *   **Actions**: Creates an account for "grace", then attempts to change its password using an incorrect `oldPassword`.
    *   **Assertions**: Checks for an error and verifies the specific error message "Incorrect old password.", confirming the `requires` condition was enforced.

9.  **"Action: changePassword - Insecure new password"**
    *   **Purpose**: To verify that `changePassword` fails if the `newPassword` provided does not meet security criteria.
    *   **Actions**: Creates an account for "heidi", then attempts to change its password to an insecure `newPassword` ("short").
    *   **Assertions**: Checks for an error and verifies the specific error message "New password must be at least 8 characters long.", confirming the `requires` condition was enforced.

10. **"Action: changePassword - New password same as old"**
    *   **Purpose**: To verify that `changePassword` prevents a user from changing their password to the exact same password they currently use.
    *   **Actions**: Creates an account for "ivan", then attempts to change its password to the *same* password.
    *   **Assertions**: Checks for an error and verifies the specific error message "New password cannot be the same as the old password.", demonstrating good practice beyond the minimal "sufficiently secure" requirement.

11. **"Action: changePassword - User not found"**
    *   **Purpose**: To verify that `changePassword` fails if the target user identified by `userId` does not exist.
    *   **Actions**: Attempts to change the password for a `nonExistentUser`.
    *   **Assertions**: Checks for an error and verifies the specific error message `User '${nonExistentUser}' not found.`, confirming the `requires` condition (`user exists`) was enforced.

12. **"Action: deleteAccount - Successful deletion"**
    *   **Purpose**: To verify that `deleteAccount` successfully removes a user from the system, making them unable to authenticate.
    *   **Actions**:
        1.  Creates an account for "john".
        2.  Verifies one user exists using `_getAllUsers`.
        3.  Calls `deleteAccount` for "john".
        4.  Verifies no users exist using `_getAllUsers`.
        5.  Attempts to authenticate "john" (expected failure).
    *   **Assertions**: Confirms the user count changes from 1 to 0, verifies the empty object return for success, and asserts that authentication for the deleted user fails.
    *   **Verifies `requires`**: User exists (initially).
    *   **Verifies `effects`**: Removes user from the set of Users.

13. **"Action: deleteAccount - User not found"**
    *   **Purpose**: To verify that `deleteAccount` gracefully handles attempts to delete a user that does not exist.
    *   **Actions**: Attempts to delete a `nonExistentUser`.
    *   **Assertions**: Checks for an error and verifies the specific error message `User '${nonExistentUser}' not found.`, confirming the `requires` condition (`user exists`) was enforced.

14. **"Query: _getUserDetails - Retrieve user details"**
    *   **Purpose**: To verify that the `_getUserDetails` query returns the username of an existing user and *does not* expose sensitive information like the password hash.
    *   **Actions**: Creates an account for "karen", then calls `_getUserDetails` for that user.
    *   **Assertions**:
        *   `assertExists(userDetails)` and `assertEquals(userDetails[0].username, username)`: Confirms the username is correctly retrieved.
        *   `assertEquals(Object.keys((userDetails as Array<{ username: string }>)[0]).includes("passwordHash"), false)`: **Crucially**, asserts that the `passwordHash` field is NOT present in the returned user details, adhering to security best practices.
    *   **Verifies `requires`**: User exists.
    *   **Verifies `effects`**: Returns username (and potentially other non-sensitive profile info).

15. **"Query: _getUserDetails - User not found"**
    *   **Purpose**: To verify that `_getUserDetails` returns an error when queried for a user that does not exist.
    *   **Actions**: Calls `_getUserDetails` for a `nonExistentUser`.
    *   **Assertions**: Checks for an error and verifies the specific error message `User '${nonExistentUser}' not found.`, confirming the `requires` condition was enforced.

16. **"Query: _getAllUsers - Retrieve all users"**
    *   **Purpose**: To verify that the `_getAllUsers` query correctly returns a list of all existing users, including their IDs and usernames.
    *   **Actions**: Creates two accounts ("user1", "user2"), then calls `_getAllUsers`.
    *   **Assertions**:
        *   `assertEquals(users.length, 2)`: Confirms that two users are returned.
        *   `assertEquals(usernames, ["user1", "user2"])`: Verifies that the correct usernames are present in the returned list.
    *   **Verifies `requires`**: True (always allowed).
    *   **Verifies `effects`**: Returns an array of user IDs and usernames.

17. **"Principle: A user can create an account and sign in with a username/password. Users can also change their password."**
    *   **Purpose**: This is the principle test, which acts as a narrative integration test. It steps through the core scenario outlined in the concept's `principle` statement to ensure the concept fulfills its main purpose end-to-end.
    *   **Actions (Trace)**:
        1.  `createAccount`: Creates a user "principleUser" with an `initialPassword`.
        2.  `authenticate`: Authenticates the user with the `initialPassword` (expected success).
        3.  `changePassword`: Changes the user's password from `initialPassword` to `newPassword`.
        4.  `authenticate`: Attempts to authenticate with the `initialPassword` (expected failure).
        5.  `authenticate`: Attempts to authenticate with the `newPassword` (expected success).
    *   **Assertions**: At each step, it asserts the expected outcome (successful user creation, authentication, password change, and then the correct invalidation of the old password and validation of the new one).
    *   **Verifies Principle**: This comprehensive sequence of actions and assertions directly demonstrates that "A user can create an account and sign in with a username/password. Users can also change their password." is fully supported by the `ProfileConcept`.