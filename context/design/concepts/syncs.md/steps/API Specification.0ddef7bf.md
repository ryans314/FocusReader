---
timestamp: 'Mon Nov 10 2025 07:43:23 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_074323.875ea1d1.md]]'
content_id: 0ddef7bf86f144a0a3763f584c3e02545d01f3d6db2f56697711e7b31d62320a
---

# API Specification: Annotation Concept

**Purpose:** allow users to create annotations within documents and search amongst their annotations

***

## API Endpoints

### POST /api/Annotation/createAnnotation

**Description:** Creates a new annotation within a document for a user.

**Requirements:**

* The document must exist (in Annotation concept's view), and its creator must match the provided creator.
* The location must exist and be a well-defined CFI string (validation is assumed by external caller).
* The color (if provided) must be a valid HTML color.
* At least one of color or content must not be omitted.

**Effects:**

* Creates and adds a new annotation with the specified creator, document, color, content, location, and tags to the set of Annotations.
* Adds the new annotation's ID to the document's set of annotations (within the Annotation concept's view).
* Returns the ID of the newly created annotation.

**Request Body:**

```json
{
  "creator": "ID",
  "document": "ID",
  "color": "string",
  "content": "string",
  "location": "string",
  "tags": ["ID"]
}
```

**Success Response Body (Action):**

```json
{
  "annotation": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Annotation/deleteAnnotation

**Description:** Deletes an existing annotation.

**Requirements:**

* The annotation must exist.
* The user must be the creator of the annotation.

**Effects:**

* Removes the annotation from all sets of Annotations.
* Removes the annotation's ID from the associated document's set of annotations.

**Request Body:**

```json
{
  "user": "ID",
  "annotation": "ID"
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

### POST /api/Annotation/updateAnnotation

**Description:** Modifies the properties of an existing annotation.

**Requirements:**

* The annotation must exist and its creator must match the provided user.
* The newColor (if provided) must be a valid HTML color.
* Any of newColor, newContent, newLocation, and newTags may be omitted for partial updates.

**Effects:**

* Modifies the specified annotation to have the provided newColor, newContent, newLocation, and newTags for each attribute that is not omitted.
* Returns the ID of the updated annotation.

**Request Body:**

```json
{
  "user": "ID",
  "annotation": "ID",
  "newColor": "string",
  "newContent": "string",
  "newLocation": "string",
  "newTags": ["ID"]
}
```

**Success Response Body (Action):**

```json
{
  "annotation": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

### POST /api/Annotation/search

**Description:** Searches for annotations within a document that match specific criteria.

**Requirements:**

* The document must exist (in Annotation concept's view).
* User must be the creator of the document (in this concept's view).

**Effects:**

* Returns a list of annotations created by the user within the specified document that have content or tags matching the criteria.

**Request Body:**

```json
{
  "user": "ID",
  "document": "ID",
  "criteria": "string"
}
```

**Success Response Body (Query):**

```json
[
  {
    "annotations": [
      {
        "_id": "ID",
        "creator": "ID",
        "document": "ID",
        "color": "string",
        "content": "string",
        "location": "string",
        "tags": ["ID"]
      }
    ]
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

### POST /api/Annotation/registerDocument

**Description:** Registers a document in the Annotation concept's view. This is a temporary, unsecured helper so front-end clients (or scripts) can make the Annotation concept aware of a document created elsewhere (for example, by the Library concept) until a backend sync is implemented.

**Requirements:**

* None (this helper does not perform authentication or additional validation beyond existence in the concept's collection).

**Effects:**

* Inserts a document view record for the provided document ID and creator ID. If the document is already registered, an error is returned by the current implementation.

**Request Body:**

```json
{
  "documentId": "ID",
  "creatorId": "ID"
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
