---
timestamp: 'Mon Nov 10 2025 07:43:23 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_074323.875ea1d1.md]]'
content_id: 5a401c4be28267bbcee9c486e7d638dff4c393dbb68756e11e6a1c31bfe379c4
---

# API Specification: Profile Concept

**Purpose:** collect basic authentication and user info

***

## API Endpoints

### POST /api/Profile/createAccount

**Description:** Initiates the complete user account creation process, including establishing a user profile, creating a default library, initializing focus statistics, and setting up default text display preferences. This endpoint orchestrates multiple backend concepts.

**Requirements:**

* The `username` must not be an existing username.
* The `password` must be sufficiently secure (e.g., at least 8 characters long).

**Effects:**

* Creates a new user profile with the provided username and a securely hashed password.
* Creates a new library associated with the user.
* Initializes focus statistics for the user.
* Creates and associates default text display settings for the user using hardcoded values.
* Returns the IDs of the newly created user, library, focus statistics record, and default text settings.

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
