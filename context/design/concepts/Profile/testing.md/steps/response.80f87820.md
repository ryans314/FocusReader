---
timestamp: 'Thu Oct 23 2025 03:34:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_033452.92767b38.md]]'
content_id: 80f87820ce3b4315c4352fa0dd0c316784c26ab0ec280cb73dd4a9da1f727a6e
---

# response:

You've pinpointed the exact issue, and your understanding of Deno's test hooks is keen!

You are absolutely correct:

* `Deno.test.beforeAll()` runs once before the entire test file. Your `testDb()` function, when called in `beforeAll`, creates a *new, uniquely named database* and drops it **once**. This database (`dbInstance`) then persists for the lifetime of all `test.step`s in that file.
* `Deno.test.beforeEach()` *does* run before each `test.step()`. However, the line `profileConcept = new ProfileConcept(dbInstance);` only creates a **new instance of your `ProfileConcept` class**. It does *not* clear the underlying MongoDB database (`dbInstance`) that `profileConcept` interacts with.

As a result, each `test.step` starts with the database state accumulated from all *previous* `test.step`s. The `_getAllUsers` test, which creates two users, finds an additional 10 users (total 12) left over from previous tests.

### The Solution: Clear Collections in `beforeEach`

To ensure a clean slate for each `test.step`, you need to explicitly clear the collections managed by your `ProfileConcept` within the `Deno.test.beforeEach()` hook.

Here's how to implement the fix:

1. **Add a `clearCollections()` method to `ProfileConcept.ts`:** This method will be responsible for emptying the relevant MongoDB collections.

2. **Call `profileConcept.clearCollections()` in `Deno.test.beforeEach()`:** This ensures that before every `test.step`, the collections are empty.

***

### **1. Update `src/concepts/Profile/ProfileConcept.ts`**

Add a `clearCollections` method to your `ProfileConcept` class:

```typescript
// src/concepts/Profile/ProfileConcept.ts (updated)
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { hash, compare } from "npm:bcryptjs";

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
  async deleteAccount({ user }: { user: User }): Promise<Empty | { error: string }> {
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

    const isOldPasswordCorrect = await compare(oldPassword, existingUser.passwordHash);
    if (!isOldPasswordCorrect) {
      return { error: "Incorrect old password." };
    }

    if (newPassword.length < 8) {
      return { error: "New password must be at least 8 characters long." };
    }

    const isNewPasswordSameAsOld = await compare(newPassword, existingUser.passwordHash);
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
    const userDoc = await this.users.findOne({ username });

    if (!userDoc || !(await compare(password, userDoc.passwordHash))) {
      return { error: "Invalid username or password." };
    }

    return { user: userDoc._id };
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
  ): Promise<Array<{ username: string }> | { error: string }> {
    const userDoc = await this.users.findOne({ _id: user });
    if (!userDoc) {
      return { error: `User '${user}' not found.` };
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

### **2. Update `src/concepts/Profile/ProfileConcept.test.ts`**

Modify the `Deno.test.beforeEach()` hook to call `clearCollections()`:

```typescript
// src/concepts/Profile/ProfileConcept.test.ts (updated)
import { assertEquals, assertNotEquals, assertExists } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import ProfileConcept from "./ProfileConcept.ts";
import { ID } from "@utils/types.ts";
import { Db, MongoClient } from "npm:mongodb";

// Declare shared variables that will be used across all tests in this file.
let dbInstance: Db;
let clientInstance: MongoClient;
let profileConcept: ProfileConcept;

// --- Global Hooks for the entire test file ---

Deno.test.beforeAll(async () => {
  [dbInstance, clientInstance] = await testDb();
  console.log("--- Initialized test database for Profile Concept Tests ---");
});

Deno.test.beforeEach(async () => { // Make beforeEach async as we'll do DB operations
  profileConcept = new ProfileConcept(dbInstance);
  // --- FIX START ---
  // Clear all collections managed by the ProfileConcept before each test step
  console.log("  Clearing ProfileConcept collections before test step...");
  await profileConcept.clearCollections();
  // --- FIX END ---
});

Deno.test.afterAll(async () => {
  if (clientInstance) {
    console.log("--- Closing MongoDB client after Profile Concept Tests ---");
    await clientInstance.close();
  }
});

// --- Main Test Suite ---
Deno.test("Profile Concept Tests Suite", {
  sanitizeResources: false,
  sanitizeOps: false,
}, async (test) => {
  // ... (all your existing test.step calls remain the same) ...

  await test.step("Action: createAccount - Successful creation", async () => {
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
    console.log("--- Test: createAccount - Duplicate username ---");
    const username = "bob";
    const password = "bobPassword123";

    await profileConcept.createAccount({ username, password });
    console.log(`  Created account for ${username}.`);

    const result = await profileConcept.createAccount({ username, password });
    console.log(`  Attempted duplicate account for ${username}. Result: ${JSON.stringify(result)}`);

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
    const password = "short";

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
    // These users are created within this specific test step,
    // and the beforeEach hook ensures the DB was empty before this step began.
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
});
```

With these changes, each `test.step` will start with an empty `Profile` collection in your database, resolving the issue of accumulated state and ensuring that your tests are truly isolated and reliable.
