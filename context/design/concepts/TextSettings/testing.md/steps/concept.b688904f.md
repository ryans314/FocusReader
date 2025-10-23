---
timestamp: 'Thu Oct 23 2025 04:31:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_043134.d472dbbd.md]]'
content_id: b688904f61a010d159ea7e1d7d67bf07ffadb769cb8576107d0045eb8966c405
---

# concept: TextSettings \[User, Document]

**purpose** allow users to customize and set different text/display settings for each of their documents

**principle** When setting up an account, users can create default text display preferences for their account. When opening a new document, users will have their default display settings loaded in. Users can also change their text settings for each documents, which change how the document is displayed and be remembered between sessions.

**state**\
a set of TextSettings with:

* a font String
* a fontSize number
* a lineHeight number

a set of Users with:

* a default TextSettings

a set of Documents with:

* a current TextSettings

**actions**

createUserSettings(font: String, fontSize: Number, lineHeight: Number, user: User): (settings: TextSettings)

* **requires**
  * user exists
  * there is not already a default TextSettings with user
  * font is a valid HTML font string
  * fontSize > 0
  * lineHeight >= fontSize
* **effects**
  * Creates settings with font, fontSize, lineHeight
  * Set's user's default to settings
  * if locale is a Document, set document's current to settings

createDocumentSettings(font: String, fontSize: Number, lineHeight: Number, document: Document): (settings: TextSettings)

* **requires**
  * document exists
  * there is not already a current TextSettings with document
  * font is a valid HTML font string
  * fontSize > 0
  * lineHeight >= fontSize
* **effects**
  * Creates settings with font, fontSize, lineHeight
  * set document's current to settings

editSettings(textSettings: TextSettings, font: String, fontSize: Number, lineHeight: Number): (settings: TextSettings)

* **requires**
  * textSettings exists
  * font is a valid HTML font string
  * fontSize > 0
  * lineHeight >= fontSize
* **effects** modifes textSettings to have fontSize, lineHeight, and font

***
