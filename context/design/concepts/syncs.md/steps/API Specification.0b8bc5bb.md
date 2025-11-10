---
timestamp: 'Mon Nov 10 2025 07:36:58 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_073658.8b3595fb.md]]'
content_id: 0b8bc5bbdf5ef1792d679419a1d2936f0ea5e6573ed22c7d5304d42779559dca
---

# API Specification: Profile Concept

**Purpose:** collect basic authentication and user info

***

## API Endpoints

### POST /api/Profile/createAccount

**Description:** Creates a new user account, initializing their profile, library, focus statistics, and default text settings in a single, orchestrated backend operation.

**Requirements:**

* The `username` must not be an existing username.
* The `password` must be sufficiently secure (e.g., at least 8 characters long).
* Default text settings (Font: '"Times New Roman", Times, serif', FontSize: 16, LineHeight: 24) are automatically applied by the backend.

**Effects:**

* Creates a new user record with the provided username and a securely hashed password.
* Creates a new library for the user.
* Initializes a FocusStats object for the user.
* Creates and associates default TextSettings for the user.
* Returns the IDs of the newly created user, their library, focus stats, and default text settings upon successful completion of all steps.

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

* The provided `username` and `password` must both correspond to the same existing user (after password hashing verification).

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

***
