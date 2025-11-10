---
timestamp: 'Mon Nov 10 2025 16:23:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_162338.2bb10eb4.md]]'
content_id: 99b04fbfd6b62d776dc2d5d173ec06f909eb575c17b36b9c81985bcbb742abba
---

# API Specification Addendum: Library Concept

**Purpose:** allow users to add, remove, view, and access their uploaded documents

***

## API Endpoints

### POST /api/Library/openDocument

**Description:** Confirms a document is accessible to a user and begins tracking their reading time for that document.

**Requirements:**

* The user must be in a library that contains the specified document.

**Effects:**

* Confirms the document is accessible to the user (no state change explicitly tracked by this concept for "open" status).
* Returns the ID of the document.

**Side Effects (via Synchronization):**

* **Triggers `FocusStats.startSession`:** This action automatically starts a new focus session in the `FocusStats` concept, effectively starting a timer to track the user's reading time for this document.

**Request Body:**

```json
{
  "user": "ID",
  "document": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "document": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Library/closeDocument

**Description:** Confirms a document is no longer actively being accessed by a user and stops tracking their reading time.

**Requirements:**

* The user must be in a library that contains the specified document.

**Effects:**

* Confirms the document is no longer actively being accessed by the user (no state change explicitly tracked by this concept for "close" status).
* Returns the ID of the document.

**Side Effects (via Synchronization):**

* **Triggers `FocusStats.endSession`:** This action automatically finds the active focus session for the user and document and sets its end time, effectively stopping the reading timer and saving the session duration.

**Request Body:**

```json
{
  "user": "ID",
  "document": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "document": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```
