---
timestamp: 'Mon Nov 10 2025 07:41:01 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_074101.0e5bb11d.md]]'
content_id: 73b66512d430a5f20fbe8b3d444302add6337e6dab9098644346a58ae881acbd
---

# API Specification: FocusStats Concept

**Purpose:** track and aggregate users' reading statistics

***

## API Endpoints

### POST /api/FocusStats/startSession

**Description:** Records the beginning of a user's reading session on a document.

**Requirements:**

* The user must have the document in their library (external check, assumed true).
* The user must have a FocusStats object initialized.

**Effects:**

* Creates a new FocusSession record with the user, document, current start time, and a null end time.
* Returns the ID of the newly created FocusSession.

**Request Body:**

```json
{
  "user": "ID",
  "document": "ID",
  "library": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "focusSession": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FocusStats/endSession

**Description:** Marks the completion of an active reading session.

**Requirements:**

* The specified focusSession must exist.
* The focusSession's end time must currently be null (i.e., it is an active session).

**Effects:**

* Sets the focusSession's end time to the current time.
* Adds the ID of the ended focusSession to the corresponding user's FocusStats object.
* Returns the ID of the updated FocusSession.

**Request Body:**

```json
{
  "focusSession": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "focusSession": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/FocusStats/removeSession

**Description:** Permanently deletes a specific reading session record.

**Requirements:**

* The specified focusSession must exist.

**Effects:**

* Removes the focusSession from the set of FocusSessions.
* Removes the reference to this focusSession ID from the user's FocusStats object.

**Request Body:**

```json
{
  "focusSession": "ID"
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

### POST /api/FocusStats/\_viewStats

**Description:** Retrieves a high-level overview of a user's reading statistics.

**Requirements:**

* The user must be associated with a FocusStats object.

**Effects:**

* Returns an array containing the FocusStats object for the given user, including its ID, user ID, and an array of referenced FocusSession IDs.

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
    "focusStats": {
      "id": "ID",
      "user": "ID",
      "focusSessionIds": ["ID"]
    }
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

### POST /api/FocusStats/\_getSessions

**Description:** Retrieves detailed information for all individual reading sessions of a specific user.

**Requirements:**

* The user must be associated with a FocusStats object (implying valid user for sessions).

**Effects:**

* Returns an array containing all FocusSession documents belonging to the given user.

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
    "focusSession": {
      "_id": "ID",
      "user": "ID",
      "document": "ID",
      "startTime": "Date",
      "endTime": "Date | null"
    }
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
