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



# Prompt: Please update the above testing suite to use check and x emojis when each test passes or fails
# response:

You're looking to add visual indicators for your test results directly within your console output, which is a great way to make test runs more scannable.

Deno's `Deno.test` framework inherently reports whether a test or `test.step` passes or fails. To add custom emojis, we can wrap the content of each `test.step` in a `try...catch` block. If the `try` block completes, it means all assertions within it passed, so we print a `✅`. If an error (e.g., a failed assertion) occurs, the `catch` block will run, and we print a `❌` before re-throwing the error to ensure Deno still marks the step as failed.

Here's the updated `ProfileConcept.test.ts` file with `✅` and `❌` emojis for each step:

```typescript
// src/concepts/Profile/ProfileConcept.test.ts
import { assertEquals, assertExists } from "jsr:@std/assert";
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

  await test.step("Action: createAccount - Successful creation", async () => {
    const stepName = "Action: createAccount - Successful creation";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "alice";
      const password = "securePassword123";

      const result = await profileConcept.createAccount({ username, password });
      assertExists((result as { user: ID }).user, "User ID should be returned on successful creation.");

      const users = await profileConcept._getAllUsers();
      assertEquals(users.length, 1, "There should be one user in the database.");
      assertEquals(users[0].username, username, "The created user's username should match.");

      const userDetails = await profileConcept._getUserDetails({ user: (result as { user: ID }).user });
      assertExists(userDetails, "User details should be retrievable.");
      assertEquals((userDetails as Array<{ username: string }>)[0].username, username, "Retrieved username should match.");

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e; // Re-throw to make the Deno test fail
    }
  });

  await test.step("Action: createAccount - Duplicate username", async () => {
    const stepName = "Action: createAccount - Duplicate username";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "bob";
      const password = "bobPassword123";

      await profileConcept.createAccount({ username, password }); // Create first account

      const result = await profileConcept.createAccount({ username, password }); // Attempt duplicate
      assertExists((result as { error: string }).error, "An error should be returned for duplicate username.");
      assertEquals(
        (result as { error: string }).error,
        `Username '${username}' already exists.`,
        "Error message should indicate duplicate username.",
      );

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Action: createAccount - Insecure password", async () => {
    const stepName = "Action: createAccount - Insecure password";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "charlie";
      const password = "short"; // Insecure password

      const result = await profileConcept.createAccount({ username, password });
      assertExists((result as { error: string }).error, "An error should be returned for insecure password.");
      assertEquals(
        (result as { error: string }).error,
        "Password must be at least 8 characters long.",
        "Error message should indicate insecure password.",
      );

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Action: authenticate - Successful authentication", async () => {
    const stepName = "Action: authenticate - Successful authentication";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "david";
      const password = "davidPassword123";
      const { user: userId } = (await profileConcept.createAccount({ username, password })) as { user: ID };

      const result = await profileConcept.authenticate({ username, password });
      assertExists((result as { user: ID }).user, "User ID should be returned on successful authentication.");
      assertEquals(
        (result as { user: ID }).user,
        userId,
        "Authenticated user ID should match the created user's ID.",
      );

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Action: authenticate - Invalid username", async () => {
    const stepName = "Action: authenticate - Invalid username";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "nonExistent";
      const password = "anyPassword123";

      const result = await profileConcept.authenticate({ username, password });
      assertExists((result as { error: string }).error, "An error should be returned for invalid username.");
      assertEquals(
        (result as { error: string }).error,
        "Invalid username or password.",
        "Error message should indicate invalid credentials.",
      );

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Action: authenticate - Incorrect password", async () => {
    const stepName = "Action: authenticate - Incorrect password";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "eve";
      const password = "evePassword123";
      await profileConcept.createAccount({ username, password });

      const result = await profileConcept.authenticate({ username, password: "wrongPassword" });
      assertExists((result as { error: string }).error, "An error should be returned for incorrect password.");
      assertEquals(
        (result as { error: string }).error,
        "Invalid username or password.",
        "Error message should indicate invalid credentials.",
      );

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Action: changePassword - Successful password change", async () => {
    const stepName = "Action: changePassword - Successful password change";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "frank";
      const oldPassword = "frankPassword123";
      const newPassword = "newFrankPassword456";
      const { user: userId } = (await profileConcept.createAccount({ username, password: oldPassword })) as { user: ID };

      const authOld = await profileConcept.authenticate({ username, password: oldPassword });
      assertExists((authOld as { user: ID }).user, "Should authenticate with old password successfully.");

      const result = await profileConcept.changePassword({ user: userId, oldPassword, newPassword });
      assertExists((result as { user: ID }).user, "User ID should be returned on successful password change.");
      assertEquals((result as { user: ID }).user, userId, "Returned user ID should match.");

      const authFailed = await profileConcept.authenticate({ username, password: oldPassword });
      assertExists((authFailed as { error: string }).error, "Old password should no longer work.");

      const authSuccess = await profileConcept.authenticate({ username, password: newPassword });
      assertExists((authSuccess as { user: ID }).user, "New password should work.");
      assertEquals((authSuccess as { user: ID }).user, userId, "Authenticated with new password successfully.");

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Action: changePassword - Incorrect old password", async () => {
    const stepName = "Action: changePassword - Incorrect old password";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "grace";
      const oldPassword = "gracePassword123";
      const newPassword = "newGracePassword456";
      const { user: userId } = (await profileConcept.createAccount({ username, password: oldPassword })) as { user: ID };

      const result = await profileConcept.changePassword({ user: userId, oldPassword: "wrongOldPassword", newPassword });
      assertExists((result as { error: string }).error, "An error should be returned for incorrect old password.");
      assertEquals(
        (result as { error: string }).error,
        "Incorrect old password.",
        "Error message should indicate incorrect old password.",
      );

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Action: changePassword - Insecure new password", async () => {
    const stepName = "Action: changePassword - Insecure new password";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "heidi";
      const oldPassword = "heidiPassword123";
      const newPassword = "short";
      const { user: userId } = (await profileConcept.createAccount({ username, password: oldPassword })) as { user: ID };

      const result = await profileConcept.changePassword({ user: userId, oldPassword, newPassword });
      assertExists((result as { error: string }).error, "An error should be returned for insecure new password.");
      assertEquals(
        (result as { error: string }).error,
        "New password must be at least 8 characters long.",
        "Error message should indicate insecure new password.",
      );

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Action: changePassword - New password same as old", async () => {
    const stepName = "Action: changePassword - New password same as old";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "ivan";
      const password = "ivanPassword123";
      const { user: userId } = (await profileConcept.createAccount({ username, password })) as { user: ID };

      const result = await profileConcept.changePassword({ user: userId, oldPassword: password, newPassword: password });
      assertExists((result as { error: string }).error, "An error should be returned when new password is same as old.");
      assertEquals(
        (result as { error: string }).error,
        "New password cannot be the same as the old password.",
        "Error message should indicate new password is same as old.",
      );

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Action: changePassword - User not found", async () => {
    const stepName = "Action: changePassword - User not found";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const nonExistentUser = "user:nonExistent" as ID;
      const oldPassword = "anyOldPassword";
      const newPassword = "anyNewPassword123";

      const result = await profileConcept.changePassword({ user: nonExistentUser, oldPassword, newPassword });
      assertExists((result as { error: string }).error, "An error should be returned for a non-existent user.");
      assertEquals(
        (result as { error: string }).error,
        `User '${nonExistentUser}' not found.`,
        "Error message should indicate user not found.",
      );

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Action: deleteAccount - Successful deletion", async () => {
    const stepName = "Action: deleteAccount - Successful deletion";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "john";
      const password = "johnPassword123";
      const { user: userId } = (await profileConcept.createAccount({ username, password })) as { user: ID };

      let users = await profileConcept._getAllUsers();
      assertEquals(users.length, 1, "Initially, there should be one user.");

      const result = await profileConcept.deleteAccount({ user: userId });
      assertEquals(result, {}, "Empty object should be returned on successful deletion.");

      users = await profileConcept._getAllUsers();
      assertEquals(users.length, 0, "After deletion, there should be no users.");

      const authResult = await profileConcept.authenticate({ username, password });
      assertExists((authResult as { error: string }).error, "Deleted user should not be able to authenticate.");

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Action: deleteAccount - User not found", async () => {
    const stepName = "Action: deleteAccount - User not found";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const nonExistentUser = "user:nonExistent" as ID;

      const result = await profileConcept.deleteAccount({ user: nonExistentUser });
      assertExists((result as { error: string }).error, "An error should be returned for a non-existent user.");
      assertEquals(
        (result as { error: string }).error,
        `User '${nonExistentUser}' not found.`,
        "Error message should indicate user not found.",
      );

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Query: _getUserDetails - Retrieve user details", async () => {
    const stepName = "Query: _getUserDetails - Retrieve user details";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "karen";
      const password = "karenPassword123";
      const { user: userId } = (await profileConcept.createAccount({ username, password })) as { user: ID };

      const userDetails = await profileConcept._getUserDetails({ user: userId });
      assertExists(userDetails, "User details should be returned.");
      assertEquals(
        (userDetails as Array<{ username: string }>)[0].username,
        username,
        "Retrieved username should match.",
      );
      assertEquals(Object.keys((userDetails as Array<{ username: string }>)[0]).includes("passwordHash"), false, "Password hash should NOT be returned by _getUserDetails.");

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Query: _getUserDetails - User not found", async () => {
    const stepName = "Query: _getUserDetails - User not found";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const nonExistentUser = "user:nonExistent" as ID;

      const result = await profileConcept._getUserDetails({ user: nonExistentUser });
      assertExists((result as { error: string }).error, "An error should be returned for a non-existent user.");
      assertEquals(
        (result as { error: string }).error,
        `User '${nonExistentUser}' not found.`,
        "Error message should indicate user not found.",
      );

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Query: _getAllUsers - Retrieve all users", async () => {
    const stepName = "Query: _getAllUsers - Retrieve all users";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      await profileConcept.createAccount({ username: "user1", password: "pass1234" });
      await profileConcept.createAccount({ username: "user2", password: "pass5678" });

      const users = await profileConcept._getAllUsers();
      assertEquals(users.length, 2, "Should retrieve all two created users.");
      const usernames = users.map((u) => u.username).sort();
      assertEquals(usernames, ["user1", "user2"], "Retrieved usernames should match.");

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });

  await test.step("Principle: A user can create an account and sign in with a username/password. Users can also change their password.", async () => {
    const stepName = "Principle: A user can create an account and sign in with a username/password. Users can also change their password.";
    try {
      // --- Per-step setup for isolation ---
      const profileConcept = new ProfileConcept(dbInstance);
      await profileConcept.clearCollections();
      // --- End per-step setup ---

      const username = "principleUser";
      const initialPassword = "initialSecurePassword123";
      const newPassword = "newSecurePassword456";

      // 1. Create Account
      const createResult = await profileConcept.createAccount({ username, password: initialPassword });
      assertExists((createResult as { user: ID }).user, "Account creation should be successful.");
      const userId = (createResult as { user: ID }).user;

      // 2. Authenticate with initial password
      const authInitialResult = await profileConcept.authenticate({ username, password: initialPassword });
      assertExists((authInitialResult as { user: ID }).user, "Authentication with initial password should succeed.");
      assertEquals((authInitialResult as { user: ID }).user, userId, "Authenticated user ID should match.");

      // 3. Change Password
      const changePasswordResult = await profileConcept.changePassword({
        user: userId,
        oldPassword: initialPassword,
        newPassword: newPassword,
      });
      assertExists((changePasswordResult as { user: ID }).user, "Password change should be successful.");
      assertEquals((changePasswordResult as { user: ID }).user, userId, "Changed password for correct user ID.");

      // 4. Attempt authentication with old password (Expected failure)
      const authOldPasswordResult = await profileConcept.authenticate({ username, password: initialPassword });
      assertExists((authOldPasswordResult as { error: string }).error, "Authentication with old password should fail.");

      // 5. Authenticate with new password (Expected success)
      const authNewPasswordResult = await profileConcept.authenticate({ username, password: newPassword });
      assertExists((authNewPasswordResult as { user: ID }).user, "Authentication with new password should succeed.");
      assertEquals((authNewPasswordResult as { user: ID }).user, userId, "Authenticated user ID should match.");

      console.log(`✅ ${stepName}`);
    } catch (e) {
      console.log(`❌ ${stepName}`);
      throw e;
    }
  });
});
```