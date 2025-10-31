---
timestamp: 'Fri Oct 24 2025 19:48:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_194833.5ffe9980.md]]'
content_id: feb56d8fee38512a61f21d8e119c03667208f18fc5fa770d2275e723822d43be
---

# response:

You've hit on an absolutely critical point, and you are absolutely right to call it out! Storing plaintext passwords, as shown in the previous example, is a **severe security vulnerability** and would never be acceptable in a real-world application. My apologies for that oversight in the demonstration – it was simplified for brevity in illustrating the concept structure, but it implicitly introduced a bad practice.

Let's clarify:

1. **MongoDB's Role**: MongoDB, like most databases, is primarily for data storage and retrieval. It doesn't inherently provide features for secure password hashing or authentication logic. The responsibility for securing passwords lies with the application layer (your `ProfileConcept` in this case) before the data ever reaches the database. MongoDB simply stores whatever value you provide for the password field.

2. **Secure Password Storage**: The industry standard for securely storing passwords involves **hashing and salting**.
   * **Hashing**: Instead of storing the password directly, you store a one-way cryptographic hash of the password. This means you can compute the hash from a given password, but you cannot reverse the hash to get the original password.
   * **Salting**: A unique, random string (the "salt") is added to each user's password *before* hashing. This prevents "rainbow table" attacks and ensures that even if two users choose the same password, their stored hashes will be different.

3. **Common Libraries**: Libraries like `bcrypt`, `scrypt`, or `argon2` are specifically designed to perform strong, slow hashing and salting, making it computationally expensive for attackers to crack passwords even if they gain access to the hashed passwords. `bcrypt` is a very common and robust choice.

## Corrected `ProfileConcept` Implementation for Secure Passwords

Let's update the `ProfileConcept` to use `bcryptjs` (a pure JavaScript implementation of bcrypt, suitable for Deno) for secure password handling.

### Required Imports & Type Updates

First, we'll need to import `hash` and `compare` from `bcryptjs`. Also, the `password` in `UserDocument` will now store the *hashed* password.

```typescript
// src/concepts/ProfileConcept.ts (updated)
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";
import { hash, compare } from "npm:bcryptjs"; // Import bcrypt functions

const PREFIX = "Profile" + ".";
type User = ID;

interface UserDocument {
  _id: User;
  username: string;
  passwordHash: string; // Changed to store the hash, not plaintext
  // Removed 'password' field, replaced with 'passwordHash'
}

// ... rest of the class structure
```

### Updated Actions

Now, let's modify the actions to correctly handle hashed passwords.

```typescript
// src/concepts/ProfileConcept.ts (continued, actions updated)

// ... (imports and interface as above)

export default class ProfileConcept {
  private users: Collection<UserDocument>;
  private readonly SALT_ROUNDS = 10; // Recommended salt rounds for bcrypt

  constructor(private readonly db: Db) {
    this.users = this.db.collection(PREFIX + "users");
  }

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

    // Hash the password before storing it
    const passwordHash = await hash(password, this.SALT_ROUNDS);

    const newUser: UserDocument = {
      _id: freshID() as User,
      username,
      passwordHash, // Store the hash
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

    // Verify oldPassword against the stored hash
    const isOldPasswordCorrect = await compare(oldPassword, existingUser.passwordHash);
    if (!isOldPasswordCorrect) {
      return { error: "Incorrect old password." };
    }

    if (newPassword.length < 8) {
      return { error: "New password must be at least 8 characters long." };
    }

    // Check if new password is the same as old password (after hashing the new one)
    const isNewPasswordSameAsOld = await compare(newPassword, existingUser.passwordHash);
    if (isNewPasswordSameAsOld) {
        return { error: "New password cannot be the same as the old password." };
    }

    // Hash the new password before updating
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
    // Find user by username first
    const userDoc = await this.users.findOne({ username });

    // If user not found, or password hash doesn't match, return error
    if (!userDoc || !(await compare(password, userDoc.passwordHash))) {
      return { error: "Invalid username or password." };
    }

    return { user: userDoc._id };
  }

  // --- Queries (updated to exclude sensitive password hash) ---

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
    // Only return non-sensitive details
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
    // Only return non-sensitive details
    return userDocs.map((u) => ({ id: u._id, username: u.username }));
  }
}
```

This revised implementation is significantly more secure regarding password storage. Thank you for raising this crucial point! It underscores the importance of not just functional correctness but also adherence to security best practices.
