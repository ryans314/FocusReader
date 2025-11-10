---
timestamp: 'Mon Nov 10 2025 07:36:58 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_073658.8b3595fb.md]]'
content_id: 35522ad9e81171bffa533aeadf40baa30a58108a2e7895e120d707d5c8deefd5
---

# API Specification: FocusStats Concept

**Purpose:** track and aggregate users' reading statistics

***

## API Endpoints

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

* The user must be associated with a FocusStats object.

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

***
