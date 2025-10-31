---
timestamp: 'Fri Oct 24 2025 19:48:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_194853.56a23314.md]]'
content_id: 77d111f262ddf0c8e416e39ec7d1efaa58e64487da7613782d262a87b3d2681e
---

# API Specification: TextSettings Concept

**Purpose:** allow users to customize and set different text/display settings for each of their documents

***

## API Endpoints

### POST /api/TextSettings/createUserSettings

**Description:** Creates a new set of default text display settings for a user and associates them with that user.

**Requirements:**

* user exists
* there is not already a default TextSettings with user
* font is a valid HTML font string
* fontSize > 0
* lineHeight >= fontSize

**Effects:**

* Creates settings with font, fontSize, lineHeight
* Set's user's default to settings

**Request Body:**

```json
{
  "font": "string",
  "fontSize": "number",
  "lineHeight": "number",
  "user": "string"
}
```

**Success Response Body (Action):**

```json
{
  "settings": "string"
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

**Description:** Creates a new text settings configuration for a specific document and associates it as the document's current settings.

**Requirements:**

* document exists
* there is not already a current TextSettings with document
* font is a valid HTML font string
* fontSize > 0
* lineHeight >= fontSize

**Effects:**

* Creates settings with font, fontSize, lineHeight
* set document's current to settings

**Request Body:**

```json
{
  "font": "string",
  "fontSize": "number",
  "lineHeight": "number",
  "document": "string"
}
```

**Success Response Body (Action):**

```json
{
  "settings": "string"
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

**Description:** Modifies an existing text settings configuration with new font, font size, and line height values.

**Requirements:**

* textSettings exists
* font is a valid HTML font string
* fontSize > 0
* lineHeight >= fontSize

**Effects:**

* modifes textSettings to have fontSize, lineHeight, and font

**Request Body:**

```json
{
  "textSettings": "string",
  "font": "string",
  "fontSize": "number",
  "lineHeight": "number"
}
```

**Success Response Body (Action):**

```json
{
  "settings": "string"
}
```

**Error Response Body:**

```json
{
  "error": "string"
}
```

***

*(Note: No explicit queries were defined in the provided Concept Specification for TextSettings.)*
