
[@api-extraction-from-code](api-extraction-from-code.md)

[@api-extraction-from-spec](api-extraction-from-spec.md)

[@Annotation](/design/concepts/Annotation/implementation.md)

[@FocusStats](/design/concepts/FocusStats/implementation.md)

[@Library](/design/concepts/Library/implementation.md)

[@Profile](/design/concepts/Profile/implementation.md)

[@TextSettings](/design/concepts/TextSettings/implementation.md)

# Prompt: consider the instructions in api-extraction-from-code and api-extraction-from-spec and generate an API using the implementations and concepts for Annotation, FocusStats, Library, Profile, and TextSettings
# response:

Here is the API documentation for the Annotation, FocusStats, Library, Profile, and TextSettings concepts, generated according to your specifications.

---

# API Specification: Annotation Concept

**Purpose:** allow users to create annotations within documents and search amongst their annotations

---

## API Endpoints

### POST /api/Annotation/createTag

**Description:** Creates a new tag with a given title for a specific user.

**Requirements:**
- A tag with the given user and title must not already exist.

**Effects:**
- Creates a tag with the provided title.
- Returns the ID of the newly created tag.

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

---

### POST /api/Annotation/createAnnotation

**Description:** Creates a new annotation within a document for a user.

**Requirements:**
- The document must exist (in Annotation concept's view), and its creator must match the provided creator.
- The location must exist and be a well-defined CFI string (validation is assumed by external caller).
- The color (if provided) must be a valid HTML color.
- At least one of color or content must not be omitted.

**Effects:**
- Creates and adds a new annotation with the specified creator, document, color, content, location, and tags to the set of Annotations.
- Adds the new annotation's ID to the document's set of annotations (within the Annotation concept's view).
- Returns the ID of the newly created annotation.

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

---

### POST /api/Annotation/deleteAnnotation

**Description:** Deletes an existing annotation.

**Requirements:**
- The annotation must exist.
- The user must be the creator of the annotation.

**Effects:**
- Removes the annotation from all sets of Annotations.
- Removes the annotation's ID from the associated document's set of annotations.

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

---

### POST /api/Annotation/updateAnnotation

**Description:** Modifies the properties of an existing annotation.

**Requirements:**
- The annotation must exist and its creator must match the provided user.
- The newColor (if provided) must be a valid HTML color.
- Any of newColor, newContent, newLocation, and newTags may be omitted for partial updates.

**Effects:**
- Modifies the specified annotation to have the provided newColor, newContent, newLocation, and newTags for each attribute that is not omitted.
- Returns the ID of the updated annotation.

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

---

### POST /api/Annotation/search

**Description:** Searches for annotations within a document that match specific criteria.

**Requirements:**
- The document must exist (in Annotation concept's view).

**Effects:**
- Returns a list of annotations created by the user within the specified document that have content or tags matching the criteria.

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

---

### POST /api/Annotation/registerDocument

**Description:** Registers a document in the Annotation concept's view. This is a temporary, unsecured helper so front-end clients (or scripts) can make the Annotation concept aware of a document created elsewhere (for example, by the Library concept) until a backend sync is implemented.

**Requirements:**
- None (this helper does not perform authentication or additional validation beyond existence in the concept's collection).

**Effects:**
- Inserts a document view record for the provided document ID and creator ID. If the document is already registered, an error is returned by the current implementation.

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

---

# API Specification: FocusStats Concept

**Purpose:** track and aggregate users' reading statistics

---

## API Endpoints

### POST /api/FocusStats/initUser

**Description:** Initializes a FocusStats object for a new user.

**Requirements:**
- The user must exist (validation for external ID is assumed).
- The user must not already have a FocusStats object.

**Effects:**
- Creates a new FocusStats record for the user with an empty set of FocusSessions.
- Returns the ID of the newly created FocusStats object.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "focusStats": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/FocusStats/startSession

**Description:** Records the beginning of a user's reading session on a document.

**Requirements:**
- The user must have the document in their library (external check, assumed true).
- The user must have a FocusStats object initialized.

**Effects:**
- Creates a new FocusSession record with the user, document, current start time, and a null end time.
- Returns the ID of the newly created FocusSession.

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

---

### POST /api/FocusStats/endSession

**Description:** Marks the completion of an active reading session.

**Requirements:**
- The specified focusSession must exist.
- The focusSession's end time must currently be null (i.e., it is an active session).

**Effects:**
- Sets the focusSession's end time to the current time.
- Adds the ID of the ended focusSession to the corresponding user's FocusStats object.
- Returns the ID of the updated FocusSession.

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

---

### POST /api/FocusStats/removeSession

**Description:** Permanently deletes a specific reading session record.

**Requirements:**
- The specified focusSession must exist.

**Effects:**
- Removes the focusSession from the set of FocusSessions.
- Removes the reference to this focusSession ID from the user's FocusStats object.

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

---

### POST /api/FocusStats/_viewStats

**Description:** Retrieves a high-level overview of a user's reading statistics.

**Requirements:**
- The user must be associated with a FocusStats object.

**Effects:**
- Returns an array containing the FocusStats object for the given user, including its ID, user ID, and an array of referenced FocusSession IDs.

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

---

### POST /api/FocusStats/_getSessions

**Description:** Retrieves detailed information for all individual reading sessions of a specific user.

**Requirements:**
- The user must be associated with a FocusStats object.

**Effects:**
- Returns an array containing all FocusSession documents belonging to the given user.

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

---

# API Specification: Library Concept

**Purpose:** allow users to add, remove, view, and access their uploaded documents

---

## API Endpoints

### POST /api/Library/createLibrary

**Description:** Creates a new library for a user.

**Requirements:**
- The user must not already be associated with a library.

**Effects:**
- Creates a new library linked to the user with an empty set of documents.
- Returns the ID of the newly created library.

**Request Body:**

```json
{
  "user": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "library": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Library/removeDocument

**Description:** Removes a document from a user's library and deletes the document record.

**Requirements:**
- The library must exist.
- The document must be present in the specified library.

**Effects:**
- Removes the document's ID from the library's documents set.
- Deletes the document record from the set of all documents.

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

---

### POST /api/Library/createDocument

**Description:** Creates a new document and adds it to a user's library.

**Requirements:**
- The library must exist.
- A document with the given name must not already exist in the specified library.

**Effects:**
- Creates a new document record with the provided name and epub content.
- Adds the new document's ID to the library's documents set.
- Returns the ID of the newly created document.

**Request Body:**

```json
{
  "name": "string",
  "epubContent": "string",
  "library": "ID"
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

---

### POST /api/Library/renameDocument

**Description:** Changes the name of an existing document within a user's library.

**Requirements:**
- The document must exist.
- The document must be associated with a library owned by the specified user.
- The newName must not be the name of an existing document within that user's library (excluding the document being renamed).

**Effects:**
- Changes the specified document's name to the newName.
- Returns the ID of the updated document.

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

---

### POST /api/Library/openDocument

**Description:** Confirms a document is accessible to a user.

**Requirements:**
- The user must be in a library that contains the specified document.

**Effects:**
- Confirms the document is accessible to the user (no state change explicitly tracked by this concept for "open" status).
- Returns the ID of the document.

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

---

### POST /api/Library/closeDocument

**Description:** Confirms a document is no longer actively being accessed by a user.

**Requirements:**
- The user must be in a library that contains the specified document.

**Effects:**
- Confirms the document is no longer actively being accessed by the user (no state change explicitly tracked by this concept for "close" status).
- Returns the ID of the document.

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

---

### POST /api/Library/_getLibraryByUser

**Description:** Retrieves the library document associated with a specific user.

**Requirements:**
- The user must exist and have a library.

**Effects:**
- Returns the full library document for the specified user.

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

---

### POST /api/Library/_getDocumentsInLibrary

**Description:** Retrieves all documents (including their content) that are part of a given library.

**Requirements:**
- The library must exist.

**Effects:**
- Returns an array of document objects, each containing its ID, name, and epub content, for all documents in the specified library.

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

---

### POST /api/Library/_getDocumentDetails

**Description:** Retrieves the full details (name, epubContent) of a specific document.

**Requirements:**
- The document must exist.

**Effects:**
- Returns the document object containing its ID, name, and epub content.

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

---

# API Specification: Profile Concept

**Purpose:** collect basic authentication and user info

---

## API Endpoints

### POST /api/Profile/createAccount

**Description:** Creates a new user account with a username and password.

**Requirements:**
- The username must not be an existing username.
- The password must be sufficiently secure (e.g., at least 8 characters long).

**Effects:**
- Creates a new user record with the provided username and a securely hashed password.
- Returns the ID of the newly created user.

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

---

### POST /api/Profile/deleteAccount

**Description:** Deletes an existing user account.

**Requirements:**
- The user must exist.

**Effects:**
- Removes the user record from the set of Users.

**Request Body:**

```json
{
  "user": "ID"
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

---

### POST /api/Profile/changePassword

**Description:** Allows a user to change their account password.

**Requirements:**
- The user must exist.
- The provided oldPassword must match the user's current password (verified against its hash).
- The newPassword must be sufficiently secure (e.g., at least 8 characters long).
- The newPassword must not be the same as the old password.

**Effects:**
- Modifies the user's record to have the new, securely hashed password.
- Returns the ID of the updated user.

**Request Body:**

```json
{
  "user": "ID",
  "oldPassword": "string",
  "newPassword": "string"
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

---

### POST /api/Profile/authenticate

**Description:** Authenticates a user with their username and password.

**Requirements:**
- The provided username and password must both correspond to the same existing user (after password hashing verification).

**Effects:**
- Returns the ID of the user associated with the successfully authenticated username and password.

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

---

### POST /api/Profile/_getUserDetails

**Description:** Retrieves the username for a specific user.

**Requirements:**
- The user must exist.

**Effects:**
- Returns an array containing an object with the username of the specified user.

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
    "username": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/Profile/_getAllUsers

**Description:** Retrieves a list of all registered users.

**Requirements:**
- None (always executable).

**Effects:**
- Returns an array of objects, each containing the ID and username of a user.

**Request Body:**

```json
{}
```

**Success Response Body (Query):**

```json
[
  {
    "id": "ID",
    "username": "string"
  }
]
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

# API Specification: TextSettings Concept

**Purpose:** allow users to customize and set different text/display settings for each of their documents

---

## API Endpoints

### POST /api/TextSettings/createUserSettings

**Description:** Creates a new text display settings configuration and sets it as a user's default.

**Requirements:**
- The user must exist (implicitly handled by external concept providing User ID).
- There must not already be a default TextSettings for this user.
- The font must be a valid HTML font string.
- The fontSize must be a positive number.
- The lineHeight must be greater than or equal to the fontSize.

**Effects:**
- Creates a new TextSettings configuration with the given font, fontSize, and lineHeight.
- Associates this new configuration as the default for the specified user.
- Returns the ID of the created TextSettings configuration.

**Request Body:**

```json
{
  "font": "string",
  "fontSize": "number",
  "lineHeight": "number",
  "user": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "settings": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/TextSettings/createDocumentSettings

**Description:** Creates a new text display settings configuration and sets it as the current settings for a document.

**Requirements:**
- The document must exist (implicitly handled by external concept providing Document ID).
- There must not already be a current TextSettings for this document.
- The font must be a valid HTML font string.
- The fontSize must be a positive number.
- The lineHeight must be greater than or equal to the fontSize.

**Effects:**
- Creates a new TextSettings configuration with the given font, fontSize, and lineHeight.
- Associates this new configuration as the current settings for the specified document.
- Returns the ID of the created TextSettings configuration.

**Request Body:**

```json
{
  "font": "string",
  "fontSize": "number",
  "lineHeight": "number",
  "document": "ID"
}
```

**Success Response Body (Action):**

```json
{
  "settings": "ID"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

---

### POST /api/TextSettings/editSettings

**Description:** Modifies an existing text settings configuration.

**Requirements:**
- The textSettings (identified by its ID) must exist.
- The font must be a valid HTML font string.
- The fontSize must be a positive number.
- The lineHeight must be greater than or equal to the fontSize.

**Effects:**
- Modifies the TextSettings configuration identified by textSettingsId to have the new font, fontSize, and lineHeight.

**Request Body:**

```json
{
  "textSettings": "ID",
  "font": "string",
  "fontSize": "number",
  "lineHeight": "number"
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

---

### POST /api/TextSettings/_getUserDefaultSettings

**Description:** Retrieves the default text settings configuration for a given user.

**Requirements:**
- The user must exist (implicitly handled).

**Effects:**
- Returns an array containing the default TextSettings configuration for the user, if one exists.
- Returns an empty array if no default settings are found for the user.

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

---

### POST /api/TextSettings/_getDocumentCurrentSettings

**Description:** Retrieves the current text settings configuration for a given document.

**Requirements:**
- The document must exist (implicitly handled).

**Effects:**
- Returns an array containing the current TextSettings configuration for the document, if one exists.
- Returns an empty array if no current settings are found for the document.

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

---

### POST /api/TextSettings/_getTextSettings

**Description:** Retrieves a specific text settings configuration by its ID.

**Requirements:**
- The textSettingsId must exist.

**Effects:**
- Returns an array containing the TextSettings configuration identified by the given ID.
- Returns an empty array if the TextSettings configuration is not found.

**Request Body:**

```json
{
  "textSettingsId": "ID"
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

---