---
timestamp: 'Mon Oct 20 2025 02:49:42 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_024942.22e2c872.md]]'
content_id: 1a7e40874a698a16d222cb7cb917c9d35458fc978fdce36ceaa3de72d3c56ca9
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

**principle** An existing user can upload and associate documents with their account, to be accessed later

**state**\
a set of Libraries with:

* a user User
* a documents set of Documents

a set of Documents with:

* a name String
* a library Library
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
* **effects** removes document from the set of documents and from library

createDocument(name: String, epubContent: BinaryData, library: Library, textSettings: TextSettings, stats: FocusStats): (document: Document)

* **requires** a document with name does not already exist in the given library
* **effects** creates a new Document with name, file, TextSettings, and FocusStats, and empty set of Annotations

openDocument(user: User, document: Document): (document: Document)

* **requires** user is in a library with document

closeDocument(user: User, document: Document): (document: Document)

* **requires** user is in a library with document

***

createLibrary(userId: UserId): (libraryId: LibraryId)

* **requires** userId is not already associated with a library
* **effects** Creates a new Library. Its `user` property will conceptually point to the User identified by `userId`, and it will have an empty `set of Documents`. Returns the `libraryId` of the newly created Library.

addDocument(libraryId: LibraryId, documentId: DocumentId)

* **requires** libraryId and documentId both exist, and documentId is not already in the library identified by libraryId.
* **effects** Adds the Document identified by `documentId` to the Library identified by `libraryId`'s `set of Documents`.

removeDocument(libraryId: LibraryId, documentId: DocumentId)

* **requires** libraryId exists and documentId is in the library identified by libraryId.
* **effects** Removes the Document identified by `documentId` from the Library identified by `libraryId`'s `set of Documents`. (Note: This action only disassociates the document from the library; it does not delete the Document, TextSettings, FocusStats, or Annotations themselves.)

createDocument(name: String, epubFileContent: BinaryData, libraryId: LibraryId): (documentId: DocumentId)

* **requires** A document with 'name' does not already exist in the given library AND `epubFileContent` is a valid .epub file.
* **effects**
  1. Creates a new default TextSettings concept, resulting in a `textSettingsId`.
  2. Creates a new default FocusStats concept, resulting in a `focusStatsId`.
  3. Creates a new Document concept with `name`, `epubFileContent`, its `textSettings` conceptually pointing to the new TextSettings, `focusStats` to the new FocusStats, and an empty `set of Annotations`. This results in a `documentId`.
  4. Adds the newly created Document (identified by `documentId`) to the `set of Documents` for the Library identified by `libraryId`.
  5. Returns the `documentId`.

openDocument(userId: UserId, documentId: DocumentId): (documentId: DocumentId)

* **requires** A Library exists for `userId` that contains the Document identified by `documentId`.
* **effects** (No conceptual side effects; implies the document's state is prepared for user interaction by the implementing system.)

closeDocument(userId: UserId, documentId: DocumentId): (documentId: DocumentId)

* **requires** A Library exists for `userId` that contains the Document identified by `documentId`.
* **effects** (No conceptual side effects; implies the document is no longer actively being interacted with by the implementing system.)

**notes**

* This conceptual model distinguishes between the **conceptual state representation** (where relationships are abstractly modeled by referencing concept names, e.g., `a user User`, `a set of Documents`) and the **action interface representation** (where concrete system interactions use primitive types or object identifiers, e.g., `userId: UserId`, `documentId: DocumentId`).
* `UserId`, `LibraryId`, `DocumentId`, `TextSettingsId`, `FocusStatsId`, `AnnotationId` are object identifiers (e.g., MongoDB `ObjectId`s) used for actions.
* `BinaryData` is a primitive type representing raw binary content (e.g., Python `bytes`).
* The validation "epubFileContent is a valid .epub file" will be handled by the implementing system, e.g., by checking file headers/magic bytes or using a dedicated ePub library.
