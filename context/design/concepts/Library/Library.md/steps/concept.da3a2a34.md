---
timestamp: 'Mon Oct 20 2025 01:45:53 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_014553.7dc0ab1f.md]]'
content_id: da3a2a347bd1f48c3b2aeba8599fcc4f3b0b88475262202b32b71a26fce7546c
---

# concept: Library

@[concept-design-overview](design/background/concept-design-overview.md)
@[concept-specifications](design/background/concept-specifications.md)
@[concept-state](design/background/detailed/concept-state.md)
@[concept-rubric](design/background/detailed/concept-rubric.md)
@[TextSettings](design/concepts/TextSettings/TextSettings.md)
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
createLibrary(userId: UserId): (libraryId: LibraryId)

* **requires** userId is not already associated with a library
* **effects** creates a new library with user and an empty set of documents

removeDocument(library: Library, document: Document)

* **requires** library exists and document is in library
* **effects** removes document from the set of documents and from library

createDocument(name: String, file: File, library: Library): (document: Document)

* **requires** a document with name and file does not already exist in the given library
* **effects** creates a new Document with name, file, default TextSettings, and default FocusStats, and empty set of Annotations

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
