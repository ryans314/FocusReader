---
timestamp: 'Mon Oct 20 2025 03:14:11 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_031411.43d143ed.md]]'
content_id: a91a7578fb6ff5b61f4f58b889ccc8822a20b16b2895efc9e2f6e59c7a752044
---

# concept: TextSettings

**concept** TextSettings \[User, Document]

**purpose** store text display settings for documents

**principle** When setting up an account, users can create text display preferences for their account. When reading a document, users can also set text settings for individual documents, which will change how the document is displayed

**state**\
a set of TextSettings with:

* a font Font
* a fontSize number
* a lineHeight number
* a bionicEnabled bool
* a locale User | Document

**actions**\
createSettings(font: Font, fontSize: Number, lineHeight: Number, bionicEnabled: bool, user: User): (settings: TextSettings)

* **requires** there is not already a TextSettings with user
* **effects** creates a TextSettings with fontSize, lineHeight, bionicEnabled, and locale=user

editSettings(textSettings: TextSettings, font: Font, fontSize: Number, lineHeight: Number, bionicEnabled: bool): (settings: TextSettings)

* **requires** textSettings exists
* **effects** changes textSettings to have fontSize, lineHeight, and Number

**concept** Library \[User, TextSettings, FocusStats]

**purpose**  collect and store documents that users upload

**principle** A signed in user can upload documents (.epub) to their library, view all of their uploaded documents, and remove or access any of the documents in their library.

**state**\
a set of Libraries with:

* a user User
* a documents set of Documents

a set of Documents with:

* a name String
* an epubContent BinaryData
* a settings TextSettings
* a stats FocusStats
* an annotations set of Annotations

**actions**\
createLibrary(user: User): (library: Library)

* **requires** user is not already associated with a library
* **effects** creates a new library with user and an empty set of documents

removeDocument(library: Library, document: Document)

* **requires** library exists and document is in library
* **effects** removes document from the set of documents and from library's documents set

createDocument(name: String, epubContent: BinaryData, library: Library, textSettings: TextSettings, stats: FocusStats): (document: Document)

* **requires** a document with name does not already exist in the given library
* **effects** creates a new Document with name, file, TextSettings, and FocusStats, and a new empty set of Annotations

openDocument(user: User, document: Document): (document: Document)

* **requires** user is in a library with document

closeDocument(user: User, document: Document): (document: Document)

* **requires** user is in a library with document

**Notes**

* This concept allows a user to have multiple uploads/documents of the same underlying epubContent/BinaryData, so long as they are given different names.
* Invariant: There will be no two libraries with the same user
* Each document is in and belongs to exactly 1 library
