---
timestamp: 'Mon Nov 10 2025 17:01:04 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_170104.403e3cdb.md]]'
content_id: 4bd595f3af250190e46849d332d9d5f55ae15000090c812844525b471b6c121c
---

# API Specification: Profile Concept

**Purpose:** collect basic authentication and user info

***

## API Endpoints

### POST /api/Profile/createAccount

**Description:** Creates a new user account with a username and password.

**Requirements:**

* The username must not be an existing username.

* The password must be sufficiently secure (e.g., at least 8 characters long).

**Effects:**

* Creates a new user record with the provided username and a securely hashed password.

* Returns the ID of the newly created user.

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

***

### POST /api/Profile/deleteAccount

**Description:** Deletes an existing user account.

**Requirements:**

* The user must exist.

**Effects:**

* Removes the user record from the set of Users.

**Request Body:**

```json

{

  "user": "ID"

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

### POST /api/Profile/changePassword

**Description:** Allows a user to change their account password.

**Requirements:**

* The user must exist.

* The provided oldPassword must match the user's current password (verified against its hash).

* The newPassword must be sufficiently secure (e.g., at least 8 characters long).

* The newPassword must not be the same as the old password.

**Effects:**

* Modifies the user's record to have the new, securely hashed password.

* Returns the ID of the updated user.

**Request Body:**

```json

{

  "user": "ID",

  "oldPassword": "string",

  "newPassword": "string"

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

***

### POST /api/Profile/authenticate

**Description:** Authenticates a user with their username and password.

**Requirements:**

* The provided username and password must both correspond to the same existing user (after password hashing verification).

**Effects:**

* Returns the ID of the user associated with the successfully authenticated username and password.

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

***

### POST /api/Profile/\_getUserDetails

**Description:** Retrieves the username for a specific user.

**Requirements:**

* The user must exist.

**Effects:**

* Returns an array containing an object with the username of the specified user.

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

    "username": "string"

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

### POST /api/Profile/\_getAllUsers

**Description:** Retrieves a list of all registered users.

**Requirements:**

* None (always executable).

**Effects:**

* Returns an array of objects, each containing the ID and username of a user.

**Request Body:**

```json

{}

```

**Success Response Body (Query):**

```json

[

  {

    "id": "ID",

    "username": "string"

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
