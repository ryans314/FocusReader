---
timestamp: 'Thu Oct 23 2025 03:24:20 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_032420.a672cbb5.md]]'
content_id: 4762b049a96a78410a2efad7f0f66a88e5ad7833db230e4bf4f82780f8c11468
---

# response:

You're encountering that error because `beforeEach` and `afterAll` are not methods on the `TestContext` object (which is what `test` is when passed to the main `Deno.test` callback). In Deno's test runner, these hooks are either:

1. **Global hooks:** Defined directly on `Deno.test` (e.g., `Deno.test.beforeEach(...)`, `Deno.test.afterAll(...)`) and apply to *all* tests in the file.
2. **Test suite hooks:** Defined as options within the configuration object of a `Deno.test()` call itself, which then apply to all steps/sub-tests within that specific `Deno.test` block.

Your current setup is calling `test.beforeEach` and `test.afterAll` inside the main `Deno.test` callback, which is incorrect.

Given your instructions about `testDb()` (that it drops the database before every test file via `Deno.test.beforeAll`), the most appropriate way to structure your test file is to use the suite-level hooks within the `Deno.test` options object.

Here's the corrected `ProfileConcept.test.ts` file:

**file: src/concepts/Profile/ProfileConcept.test.ts** (corrected)

```typescript
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ProfileConcept from "./ProfileConcept.ts";
import { ID } from "@utils/types.ts";
import { Db, MongoClient } from "npm:mongodb"; // Import Db and MongoClient types

// Declare shared variables for the database and client
// These will be initialized once for this Deno.test block and cleaned up afterwards.
let dbInstance: Db;
let clientInstance: MongoClient;
let profileConcept: ProfileConcept;

Deno.test({
  name: "Profile Concept Tests",
  sanitizeResources: false, // Often useful for DB tests when working with external resources
  sanitizeOps: false,       // Often useful for DB tests when performing async operations

  // This `beforeAll` hook runs ONCE before any `test.step` within this `Deno.test` block.
  // It's the ideal place to set up the shared database and client for the entire test suite.
  async beforeAll() {
    [dbInstance, clientInstance] = await testDb();
    console.log("--- Initialized test database for Profile Concept Tests ---");
  },

  // This `beforeEach` hook runs BEFORE EACH `test.step` within this `Deno.test` block.
  // It ensures `profileConcept` is a fresh instance for each individual test case,
  // preventing state leakage between steps.
  beforeEach() {
    profileConcept = new ProfileConcept(dbInstance);
    // As per the instruction, testDb() drops the database before every test *file*.
    // So, dbInstance is already fresh thanks to beforeAll.
    // We just need a new concept instance to ensure its internal state (if any beyond DB interaction) is clean.
  },

  // This `afterAll` hook runs ONCE after all `test.step`s within this `Deno.test` block have completed.
  // It's the place to clean up the shared client connection.
  async afterAll() {
    if (clientInstance) {
      console.log("--- Closing MongoDB client after Profile Concept Tests ---");
      await clientInstance.close();
    }
  },

  // The main test function where individual steps are defined.
  // The 'test' argument here is a TestContext, but the hooks are defined externally to this function.
  async fn(test) {
    // All `test.step`s defined below will automatically inherit the `beforeAll`, `beforeEach`, and `afterAll`
    // behavior defined in the options object above.

    await test.step("Action: createAccount - Successful creation", async () => {
      console.log("--- Test: createAccount - Successful creation ---");
      const username = "alice";
      const password = "securePassword123";

      const result = await profileConcept.createAccount({ username, password });
      console.log(`  Attempted to create account for ${username}. Result: ${JSON.stringify(result)}`);

      // **effects**: creates a new User with username and hash(password)
      assertExists((result as { user: ID }).user, "User ID should be returned on successful creation.");

      // Verify the user exists and details are correct (excluding hash for security)
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
      console.log("--- Test: createAccount - Duplicate username ---");
      const username = "bob";
      const password = "bobPassword123";

      await profileConcept.createAccount({ username, password }); // Create first account
      console.log(`  Created account for ${username}.`);

      const result = await profileConcept.createAccount({ username, password }); // Attempt duplicate
      console.log(`  Attempted duplicate account for ${username}. Result: ${JSON.stringify(result)}`);

      // **requires**: username is not an existing username
      assertExists((result as { error: string }).error, "An error should be returned for duplicate username.");
      assertEquals(
        (result as { error: string }).error,
        `Username '${username}' already exists.`,
        "Error message should indicate duplicate username.",
      );
    });

    await test.step("Action: createAccount - Insecure password", async () => {
      console.log("--- Test: createAccount - Insecure password ---");
      const username = "charlie";
      const password = "short"; // Insecure password

      const result = await profileConcept.createAccount({ username, password });
      console.log(`  Attempted to create account for ${username} with insecure password. Result: ${JSON.stringify(result)}`);

      // **requires**: password is sufficiently secure
      assertExists((result as { error: string }).error, "An error should be returned for insecure password.");
      assertEquals(
        (result as { error: string }).error,
        "Password must be at least 8 characters long.",
        "Error message should indicate insecure password.",
      );
    });

    await test.step("Action: authenticate - Successful authentication", async () => {
      console.log("--- Test: authenticate - Successful authentication ---");
      const username = "david";
      const password = "davidPassword123";
      const { user: userId } = (await profileConcept.createAccount({ username, password })) as { user: ID };
      console.log(`  Created account for ${username} with ID ${userId}.`);

      const result = await profileConcept.authenticate({ username, password });
      console.log(`  Attempted to authenticate ${username}. Result: ${JSON.stringify(result)}`);

      // **effects**: returns the user associated with the username and password
      assertExists((result as { user: ID }).user, "User ID should be returned on successful authentication.");
      assertEquals(
        (result as { user: ID }).user,
        userId,
        "Authenticated user ID should match the created user's ID.",
      );
    });

    await test.step("Action: authenticate - Invalid username", async () => {
      console.log("--- Test: authenticate - Invalid username ---");
      const username = "nonExistent";
      const password = "anyPassword123";

      const result = await profileConcept.authenticate({ username, password });
      console.log(`  Attempted to authenticate non-existent user ${username}. Result: ${JSON.stringify(result)}`);

      // **requires**: username and hash(password) both correspond to the same existing User
      assertExists((result as { error: string }).error, "An error should be returned for invalid username.");
      assertEquals(
        (result as { error: string }).error,
        "Invalid username or password.",
        "Error message should indicate invalid credentials.",
      );
    });

    await test.step("Action: authenticate - Incorrect password", async () => {
      console.log("--- Test: authenticate - Incorrect password ---");
      const username = "eve";
      const password = "evePassword123";
      await profileConcept.createAccount({ username, password });
      console.log(`  Created account for ${username}.`);

      const result = await profileConcept.authenticate({ username, password: "wrongPassword" });
      console.log(`  Attempted to authenticate ${username} with wrong password. Result: ${JSON.stringify(result)}`);

      // **requires**: username and hash(password) both correspond to the same existing User
      assertExists((result as { error: string }).error, "An error should be returned for incorrect password.");
      assertEquals(
        (result as { error: string }).error,
        "Invalid username or password.",
        "Error message should indicate invalid credentials.",
      );
    });

    await test.step("Action: changePassword - Successful password change", async () => {
      console.log("--- Test: changePassword - Successful password change ---");
      const username = "frank";
      const oldPassword = "frankPassword123";
      const newPassword = "newFrankPassword456";
      const { user: userId } = (await profileConcept.createAccount({ username, password: oldPassword })) as { user: ID };
      console.log(`  Created account for ${username} with ID ${userId}.`);

      // Authenticate with old password
      const authOld = await profileConcept.authenticate({ username, password: oldPassword });
      assertExists((authOld as { user: ID }).user, "Should authenticate with old password successfully.");
      console.log(`  Authenticated with old password.`);

      const result = await profileConcept.changePassword({ user: userId, oldPassword, newPassword });
      console.log(`  Attempted to change password for ${username}. Result: ${JSON.stringify(result)}`);

      // **effects**: modifies user to have hash(newPassword)
      assertExists((result as { user: ID }).user, "User ID should be returned on successful password change.");
      assertEquals((result as { user: ID }).user, userId, "Returned user ID should match.");

      // Verify old password no longer works
      const authFailed = await profileConcept.authenticate({ username, password: oldPassword });
      assertExists((authFailed as { error: string }).error, "Old password should no longer work.");
      console.log(`  Attempt to authenticate with old password (expected failure): ${JSON.stringify(authFailed)}`);

      // Verify new password works
      const authSuccess = await profileConcept.authenticate({ username, password: newPassword });
      assertExists((authSuccess as { user: ID }).user, "New password should work.");
      assertEquals((authSuccess as { user: ID }).user, userId, "Authenticated with new password successfully.");
      console.log(`  Authenticated with new password.`);
    });

    await test.step("Action: changePassword - Incorrect old password", async () => {
      console.log("--- Test: changePassword - Incorrect old password ---");
      const username = "grace";
      const oldPassword = "gracePassword123";
      const newPassword = "newGracePassword456";
      const { user: userId } = (await profileConcept.createAccount({ username, password: oldPassword })) as { user: ID };
      console.log(`  Created account for ${username} with ID ${userId}.`);

      const result = await profileConcept.changePassword({ user: userId, oldPassword: "wrongOldPassword", newPassword });
      console.log(`  Attempted to change password for ${username} with incorrect old password. Result: ${JSON.stringify(result)}`);

      // **requires**: user has hashedPassword=hash(oldPassword)
      assertExists((result as { error: string }).error, "An error should be returned for incorrect old password.");
      assertEquals(
        (result as { error: string }).error,
        "Incorrect old password.",
        "Error message should indicate incorrect old password.",
      );
    });

    await test.step("Action: changePassword - Insecure new password", async () => {
      console.log("--- Test: changePassword - Insecure new password ---");
      const username = "heidi";
      const oldPassword = "heidiPassword123";
      const newPassword = "short"; // Insecure
      const { user: userId } = (await profileConcept.createAccount({ username, password: oldPassword })) as { user: ID };
      console.log(`  Created account for ${username} with ID ${userId}.`);

      const result = await profileConcept.changePassword({ user: userId, oldPassword, newPassword });
      console.log(`  Attempted to change password for ${username} with insecure new password. Result: ${JSON.stringify(result)}`);

      // **requires**: newPassword is sufficiently secure
      assertExists((result as { error: string }).error, "An error should be returned for insecure new password.");
      assertEquals(
        (result as { error: string }).error,
        "New password must be at least 8 characters long.",
        "Error message should indicate insecure new password.",
      );
    });

    await test.step("Action: changePassword - New password same as old", async () => {
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
      console.log("--- Test: deleteAccount - Successful deletion ---");
      const username = "john";
      const password = "johnPassword123";
      const { user: userId } = (await profileConcept.createAccount({ username, password })) as { user: ID };
      console.log(`  Created account for ${username} with ID ${userId}.`);

      let users = await profileConcept._getAllUsers();
      assertEquals(users.length, 1, "Initially, there should be one user.");

      const result = await profileConcept.deleteAccount({ user: userId });
      console.log(`  Attempted to delete account for ${username}. Result: ${JSON.stringify(result)}`);

      // **effects**: removes user from the set of Users
      assertEquals(result, {}, "Empty object should be returned on successful deletion.");

      users = await profileConcept._getAllUsers();
      assertEquals(users.length, 0, "After deletion, there should be no users.");

      const authResult = await profileConcept.authenticate({ username, password });
      assertExists((authResult as { error: string }).error, "Deleted user should not be able to authenticate.");
      console.log(`  Attempted to authenticate deleted user (expected failure): ${JSON.stringify(authResult)}`);
    });

    await test.step("Action: deleteAccount - User not found", async () => {
      console.log("--- Test: deleteAccount - User not found ---");
      const nonExistentUser = "user:nonExistent" as ID;

      const result = await profileConcept.deleteAccount({ user: nonExistentUser });
      console.log(`  Attempted to delete non-existent user. Result: ${JSON.stringify(result)}`);

      // **requires**: user exists
      assertExists((result as { error: string }).error, "An error should be returned for a non-existent user.");
      assertEquals(
        (result as { error: string }).error,
        `User '${nonExistentUser}' not found.`,
        "Error message should indicate user not found.",
      );
    });

    await test.step("Query: _getUserDetails - Retrieve user details", async () => {
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
      // Ensure sensitive info (password hash) is NOT exposed via query
      // _getUserDetails should only return username. Check that passwordHash is not present.
      assertEquals(Object.keys((userDetails as Array<{ username: string }>)[0]).includes("passwordHash"), false, "Password hash should NOT be returned by _getUserDetails.");
    });

    await test.step("Query: _getUserDetails - User not found", async () => {
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
  },
});
```

CONTEXT: ERROR MESSAGE:
with a red squiggly line under "test" in Deno.test({...})

```
No overload matches this call.  
Overload 1 of 6, '(t: TestDefinition): void', gave the following error.  
Object literal may only specify known properties, and 'beforeAll' does not exist in type 'TestDefinition'.  

Overload 2 of 6, '(fn: (t: TestContext) => void | Promise<void>): void', gave the following error.  
Object literal may only specify known properties, and 'name' does not exist in type '(t: TestContext) => void | Promise<void>'.deno-ts(2769)

const Deno.test: Deno.DenoTest  
(t: Deno.TestDefinition) => void (+5 overloads)

Register a test which will be run when `deno test` is used on the command line and the containing module looks like a test module.

`fn` can be async if required.

import { assertEquals } from "jsr:@std/assert";  
  
Deno.test({  
name: "example test",  
fn() {  
assertEquals("world", "world");  
},  
});  
  
Deno.test({  
name: "example ignored test",  
ignore: Deno.build.os === "windows",  
fn() {  
// This test is ignored only on Windows machines  
},  
});  
  
Deno.test({  
name: "example async test",  
async fn() {  
const decoder = new TextDecoder("utf-8");  
const data = await Deno.readFile("hello_world.txt");  
assertEquals(decoder.decode(data), "Hello world");  
}  
});

_@category_ - Testing

```
