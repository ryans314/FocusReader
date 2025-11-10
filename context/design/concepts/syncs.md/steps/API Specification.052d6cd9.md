---
timestamp: 'Mon Nov 10 2025 07:41:01 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_074101.0e5bb11d.md]]'
content_id: 052d6cd91dc2c5cfe3739eb9569765fa737dc1f52b43449ca8794151e5ebd5f0
---

# API Specification: Profile Concept

**Purpose:** collect basic authentication and user info

***

## API Endpoints

### POST /api/Profile/createAccount

**Description:** Creates a new user account and initializes all associated user resources (Library, FocusStats, TextSettings) with default values. This is an orchestrated operation.

**Requirements:**

* The `username` must not be an existing username.
* The `password` must be sufficiently secure (e.g., at least 8 characters long).
* The newly created user must not already have a library.
* The newly created user must not already have FocusStats initialized.
* The newly created user must not already have default TextSettings.

**Effects:**

* Creates a new user record in Profile with the provided username and a securely hashed password.
* Creates a new library for the user in the Library concept.
* Initializes a FocusStats object for the user in the FocusStats concept.
* Creates and associates a new default TextSettings configuration for the user in the TextSettings concept, using hardcoded default values for font (`"Times New Roman", Times, serif`), fontSize (`16`), and lineHeight (`24`).
* Returns the IDs of the newly created user and their associated resources (library, focusStats, settings).

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
