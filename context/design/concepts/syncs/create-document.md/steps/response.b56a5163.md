---
timestamp: 'Mon Nov 10 2025 09:49:51 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_094951.cdeb4eea.md]]'
content_id: b56a5163e5b1373c0ad85dffc9e3295811fbf81e30e62168907461a107d5df81
---

# response:

Okay, here is the API specification section for the `createDocument` functionality, formatted for your `API.md` file.

***

## API Endpoints

### POST /api/Library/createDocument

**Description:** Orchestrates the creation of a new document, adds it to the specified user's library, registers it within the Annotation concept, and initializes its default text display settings. This is a comprehensive action handled by backend synchronizations.

**Requirements:**

* A valid user session (`session`) must be provided and correspond to an active logged-in user.
* The `library` ID provided in the request body must belong to the user associated with the authenticated `session`.
* A document with the given `name` must not already exist within that specific user's library.
* The `name` parameter must be a non-empty string.
* The `epubContent` parameter must contain valid EPUB document data (e.g., a base64 encoded string or a URL pointing to the content).

**Effects:**

* A new document record is created in the `Library` concept with the provided `name` and `epubContent`.
* The newly created document's ID is added to the `documents` set of the specified user's `Library`.
* The document is registered within the `Annotation` concept's view, associating it with the creating user.
* Default text display settings (e.g., font, font size, line height) are created and applied as the current settings for the new document in the `TextSettings` concept.
* On successful completion, the ID of the newly created document and a success message are returned.

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
