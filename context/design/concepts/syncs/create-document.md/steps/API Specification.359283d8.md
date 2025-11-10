---
timestamp: 'Mon Nov 10 2025 14:32:11 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_143211.c6074a96.md]]'
content_id: 359283d80246540cdc10f1417dbe005d5f401728d61fa455945c8ebd68b476f0
---

# API Specification: Document Management Endpoints

**Purpose:** Manage the creation and lifecycle of user documents within their libraries.

***

## API Endpoints

### POST /api/Library/createDocument

**Description:** Creates a new document, registers it with dependent services (like Annotations and TextSettings), and adds it to a user's library. This is an authenticated endpoint that requires a valid user session.

**Requirements:**

* The user must provide a valid `session` ID obtained from a successful login.
* The provided `library` ID must exist and belong to the authenticated user.
* A document with the given `name` must not already exist in the specified library.

**Effects:**

* If successful:
  * A new document record is created with the provided name and content.
  * The new document's ID is added to the user's library.
  * The document is registered with the Annotation concept, allowing annotations to be created.
  * Default text settings are created and associated with the new document.
  * The ID of the newly created document is returned.
* If any step fails (e.g., invalid session, incorrect library ID, duplicate name), an error message is returned.

**Request Body:**

```json
{
  "name": "string",
  "epubContent": "string",
  "session": "ID",
  "library": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "request": "ID",
  "document": "ID",
  "message": "string"
}
```

**Error Response Body:**

```json
{
  "request": "ID",
  "error": "string"
}
```

***
