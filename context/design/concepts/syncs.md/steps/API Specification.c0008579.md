---
timestamp: 'Mon Nov 10 2025 07:43:23 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_074323.875ea1d1.md]]'
content_id: c0008579c1c4715af5287c4553cea32fcccaf42475badf64ce72b23023613c49
---

# API Specification: TextSettings Concept

**Purpose:** allow users to customize and set different text/display settings for each of their documents

***

## API Endpoints

### POST /api/TextSettings/\_getUserDefaultSettings

**Description:** Retrieves the default text settings configuration for a given user.

**Requirements:**

* The user must exist (implicitly handled).

**Effects:**

* Returns an array containing the default TextSettings configuration for the user, if one exists.
* Returns an empty array if no default settings are found for the user.

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
    "settings": {
      "_id": "ID",
      "font": "string",
      "fontSize": "number",
      "lineHeight": "number"
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

### POST /api/TextSettings/\_getDocumentCurrentSettings

**Description:** Retrieves the current text settings configuration for a given document.

**Requirements:**

* The document must exist (implicitly handled).

**Effects:**

* Returns an array containing the current TextSettings configuration for the document, if one exists.
* Returns an empty array if no current settings are found for the document.

**Request Body:**

```json
{
  "document": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "settings": {
      "_id": "ID",
      "font": "string",
      "fontSize": "number",
      "lineHeight": "number"
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
