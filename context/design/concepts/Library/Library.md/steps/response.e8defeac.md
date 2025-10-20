---
timestamp: 'Sun Oct 19 2025 23:48:12 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_234812.f0ea3148.md]]'
content_id: e8defeac4be705f521e1623cc04c36550ada717c177b135ab5eaf3abaf3abd6a
---

# response:

To adapt your Library concept to exclusively handle `.epub` files and adhere to the "no composite objects in state or action arguments/results" rule, we need to introduce specific identifiers for all complex entities and make the file type explicit.

Here's a revised version of your `Library` concept, incorporating an `EpubFile` concept and using object identifiers for all complex types:

***

```markdown
# concept: Library

@[concept-design-overview](design/background/concept-design-overview)
@[concept-specifications](design/background/concept-specifications)

**concept** Library \[UserId, DocumentId, TextSettingsId, FocusStatsId, AnnotationId, EpubFileId]

**purpose** collect and store ebook documents (specifically .epub files) that users upload

**principle** An existing user can upload and associate .epub documents with their account, to be accessed later

**state**
a set of Libraries with:
*   a userId UserId
*   a set of documentIds DocumentId

a set of Documents with:
*   a name String
*   an epubFileId EpubFileId
*   a textSettingsId TextSettingsId
*   a focusStatsId FocusStatsId
*   a set of annotationIds AnnotationId

a set of EpubFiles with:
*   a binaryContent BinaryData (representing the raw binary contents of the .epub file)

**actions**
createLibrary(userId: UserId): (libraryId: LibraryId)
*   **requires** userId is not already associated with a library
*   **effects** creates a new library with userId and an empty set of documentIds

addDocument(libraryId: LibraryId, documentId: DocumentId)
*   **requires** libraryId and documentId both exist, and documentId is not already in the library identified by libraryId
*   **effects** adds documentId to the library's set of documentIds

removeDocument(libraryId: LibraryId, documentId: DocumentId)
*   **requires** libraryId exists and documentId is in the library identified by libraryId
*   **effects** removes documentId from the library's set of documentIds. (Note: This action only disassociates the document from the library; it does not delete the Document, EpubFile, TextSettings, FocusStats, or Annotations themselves.)

createDocument(name: String, epubFileContent: BinaryData, libraryId: LibraryId): (documentId: DocumentId)
*   **requires** A document with 'name' does not already exist in the given library AND `epubFileContent` is a valid .epub file.
*   **effects**
    1.  Creates a new EpubFile object storing `epubFileContent`, resulting in an `epubFileId`.
    2.  Creates a new default TextSettings object, resulting in a `textSettingsId`.
    3.  Creates a new default FocusStats object, resulting in a `focusStatsId`.
    4.  Creates a new Document object with `name`, the newly created `epubFileId`, `textSettingsId`, `focusStatsId`, and an empty set of `annotationIds`. This results in a `documentId`.
    5.  Adds the newly created `documentId` to the set of `documentIds` for the `libraryId`.
    6.  Returns the `documentId`.

openDocument(userId: UserId, documentId: DocumentId): (documentId: DocumentId)
*   **requires** A library exists for `userId` that contains `documentId`.
*   **effects** (No conceptual side effects; implies the document is prepared for user interaction, e.g., loading its content)

closeDocument(userId: UserId, documentId: DocumentId): (documentId: DocumentId)
*   **requires** A library exists for `userId` that contains `documentId`.
*   **effects** (No conceptual side effects; implies the document is no longer actively being interacted with)

**notes**
*   Assume that `UserId`, `LibraryId`, `DocumentId`, `TextSettingsId`, `FocusStatsId`, `AnnotationId`, and `EpubFileId` are object identifiers (e.g., MongoDB `ObjectId`s).
*   Assume that `BinaryData` is a primitive type representing raw binary content (e.g., Python `bytes`).
*   Assume that "default" TextSettings and FocusStats will be created by the implementing system upon request, and their corresponding IDs returned.
*   The validation "epubFileContent is a valid .epub file" will be handled by the implementing system, e.g., by checking file headers/magic bytes or using a dedicated ePub library.
```

***

**Explanation of Changes:**

1. **Narrowing to .epub:**
   * The `Document` state now uses `epubFileId: EpubFileId` instead of a generic `file: File`.
   * A new conceptual entity, `EpubFile`, is introduced. Its `binaryContent` stores the actual `.epub` data.
   * The `createDocument` action now takes `epubFileContent: BinaryData` directly, and its `requires` clause explicitly states that this content must be a valid `.epub` file. This shifts the validation responsibility to the implementing system, maintaining the conceptual clarity.
   * The `purpose` and `principle` have been updated to reflect the `.epub` focus.

2. **Adhering to "No Composite Objects" Rule:**
   * **State:**
     * `Library` now holds `userId: UserId` and `documentIds: DocumentId[]` (a set of IDs).
     * `Document` now holds `epubFileId: EpubFileId`, `textSettingsId: TextSettingsId`, `focusStatsId: FocusStatsId`, and `annotationIds: AnnotationId[]`. All these are object identifiers.
     * `EpubFile`'s `binaryContent` is treated as a primitive `BinaryData` type for the concept definition.
   * **Actions:**
     * All action arguments and return values are now either primitive types (`String`, `BinaryData`) or object identifiers (`UserId`, `LibraryId`, `DocumentId`, etc.). For example, `createDocument` now returns `documentId: DocumentId` instead of a `Document` object.
     * The `effects` section of `createDocument` clearly outlines the creation of individual conceptual objects (EpubFile, TextSettings, FocusStats, Document) and their corresponding IDs, which are then used to link them together.

3. **Updated Concept Name & Notes:**
   * The concept name now includes `EpubFileId` to reflect the new dependency.
   * The `notes` section explicitly clarifies that all `*Id` types are object identifiers and `BinaryData` is a primitive, addressing potential ambiguities.

These changes ensure your concept is more specific to `.epub` files and fully compliant with the data type restrictions for concept states and action interfaces.
