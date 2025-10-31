---
timestamp: 'Fri Oct 24 2025 19:52:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_195250.2119a567.md]]'
content_id: 4352f1294c588c3d89ea8912db977f689ebe290c4a9256bb130cbda25df7b3cf
---

# API Specification: Annotation Concept

**Purpose:** allow users to create annotations within documents and search amongst their annotations

***

## API Endpoints

### POST /api/Annotation/createTag

**Description:** Creates a new tag with a given title for a specific user.

**Requirements:**

* A tag with the given user and title must not already exist.

**Effects:**

* Creates a tag with the provided title.
* Returns the ID of the newly created tag.

**Request Body:**

```json
{
  "creator": "ID",
  "title": "string"
}
```

**Success Response Body (Action):**

```json
{
  "tag": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

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
