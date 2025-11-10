---
timestamp: 'Mon Nov 10 2025 07:36:58 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_073658.8b3595fb.md]]'
content_id: 3b1445cd1a9889d3416fde43b4d8218bcf2e27501cb51468f8d68e9893b24c41
---

# API Specification: Library Concept

**Purpose:** allow users to add, remove, view, and access their uploaded documents

***

## API Endpoints

### POST /api/Library/removeDocument

**Description:** Removes a document from a user's library and deletes the document record.

**Requirements:**

* The library must exist.
* The document must be present in the specified library.

**Effects:**

* Removes the document's ID from the library's documents set.
* Deletes the document record from the set of all documents.

**Request Body:**

```json
{
  "library": "ID",
  "document": "ID"
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

### POST /api/Library/renameDocument

**Description:** Changes the name of an existing document within a user's library.

**Requirements:**

* The document must exist.
* The document must be associated with a library owned by the specified user.
* The newName must not be the name of an existing document within that user's library (excluding the document being renamed).

**Effects:**

* Changes the specified document's name to the newName.
* Returns the ID of the updated document.

**Request Body:**

```json
{
  "user": "ID",
  "newName": "string",
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

### POST /api/Library/\_getLibraryByUser

**Description:** Retrieves the library document associated with a specific user.

**Requirements:**

* The user must exist and have a library.

**Effects:**

* Returns the full library document for the specified user.

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
    "library": {
      "_id": "ID",
      "user": "ID",
      "documents": ["ID"]
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

### POST /api/Library/\_getDocumentsInLibrary

**Description:** Retrieves all documents (including their content) that are part of a given library.

**Requirements:**

* The library must exist.

**Effects:**

* Returns an array of document objects, each containing its ID, name, and epub content, for all documents in the specified library.

**Request Body:**

```json
{
  "library": "ID"
}
```

**Success Response Body (Query):**

```json
[
  {
    "document": {
      "_id": "ID",
      "name": "string",
      "epubContent": "string"
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

### POST /api/Library/\_getDocumentDetails

**Description:** Retrieves the full details (name, epubContent) of a specific document.

**Requirements:**

* The document must exist.

**Effects:**

* Returns the document object containing its ID, name, and epub content.

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
    "document": {
      "_id": "ID",
      "name": "string",
      "epubContent": "string"
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
