---
timestamp: 'Mon Nov 10 2025 17:01:04 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_170104.403e3cdb.md]]'
content_id: 88c445a30bc8490bdf75d4b5be33a1309fb3b84fb357445eead10eed94ca35c7
---

# API Specification: TextSettings Concept

**Purpose:** allow users to customize and set different text/display settings for each of their documents

***

## API Endpoints

### POST /api/TextSettings/createUserSettings

**Description:** Creates a new text display settings configuration and sets it as a user's default.

**Requirements:**

* The user must exist (implicitly handled by external concept providing User ID).

* There must not already be a default TextSettings for this user.

* The font must be a valid HTML font string.

* The fontSize must be a positive number.

* The lineHeight must be greater than or equal to the fontSize.

**Effects:**

* Creates a new TextSettings configuration with the given font, fontSize, and lineHeight.

* Associates this new configuration as the default for the specified user.

* Returns the ID of the created TextSettings configuration.

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

***

### POST /api/TextSettings/createDocumentSettings

**Description:** Creates a new text display settings configuration and sets it as the current settings for a document.

**Requirements:**

* The document must exist (implicitly handled by external concept providing Document ID).

* There must not already be a current TextSettings for this document.

* The font must be a valid HTML font string.

* The fontSize must be a positive number.

* The lineHeight must be greater than or equal to the fontSize.

**Effects:**

* Creates a new TextSettings configuration with the given font, fontSize, and lineHeight.

* Associates this new configuration as the current settings for the specified document.

* Returns the ID of the created TextSettings configuration.

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

***

### POST /api/TextSettings/editSettings

**Description:** Modifies an existing text settings configuration.

**Requirements:**

* The textSettings (identified by its ID) must exist.

* The font must be a valid HTML font string.

* The fontSize must be a positive number.

* The lineHeight must be greater than or equal to the fontSize.

**Effects:**

* Modifies the TextSettings configuration identified by textSettingsId to have the new font, fontSize, and lineHeight.

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

***

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

***

### POST /api/TextSettings/\_getTextSettings

**Description:** Retrieves a specific text settings configuration by its ID.

**Requirements:**

* The textSettingsId must exist.

**Effects:**

* Returns an array containing the TextSettings configuration identified by the given ID.

* Returns an empty array if the TextSettings configuration is not found.

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

***
