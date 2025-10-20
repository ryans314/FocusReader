---
timestamp: 'Sun Oct 19 2025 23:54:26 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_235426.997b6c79.md]]'
content_id: 95caa57118a54f658bde474e4b5d1ea4565c50d8663269fd5dc35f08cde69500
---

# response:

Yes, even if we completely disregard the explicit assignment description rule about not exposing composite objects, I would still arrive at the same conclusion: **you should use `documentIds: DocumentId[]` in the `Library` state rather than embedding full `Document` objects.**

Here's why, based purely on sound conceptual modeling principles and common database design patterns (especially for document-oriented databases like MongoDB, which your `ObjectId` hint implies):

1. **Conceptual Independence of Entities:**
   * A `Document` (an ebook) is a significant entity in your system. It has its own name, content (`epubFileId`), user-specific settings (`textSettingsId`), reading statistics (`focusStatsId`), and annotations (`annotationIds`). These are all properties that define the *document itself*, regardless of which library it belongs to.
   * Treating `Document` as a top-level entity, identifiable by `DocumentId`, makes it conceptually distinct and independently addressable.

2. **Referential Integrity and Relationships:**
   * A `Library` doesn't *contain* `Document` objects in the sense that they are an intrinsic, unseparable part of the `Library`. Instead, a `Library` *collects references to* `Documents`.
   * Using identifiers (`DocumentId`s) clearly establishes a *relationship* (a one-to-many relationship: one `Library` has many `Documents`) without embedding the entire data structure. This is a much more robust and flexible way to model relationships.

3. **Single Source of Truth and Data Consistency:**
   * If a `Document` (or any of its associated data like `TextSettings` or `FocusStats`) needs to be updated, you only need to update the single, top-level `Document` entity corresponding to its `DocumentId`.
   * If you embedded `Document` objects within `Library` objects, and a user could theoretically have the same "logical" document in multiple libraries (even if your current design doesn't directly support it, it's good to consider future flexibility), then updating that document would require updating *every* `Library` object where it's embedded. This leads to data duplication and high risk of inconsistency.
   * Even if a `Document` is always only in one `Library`, separating them ensures that changes to the `Document` don't inadvertently require loading and saving the entire `Library` object.

4. **Scalability and Performance:**
   * `Document` objects, especially with their associated annotations, could become quite large. Embedding potentially many large `Document` objects inside a single `Library` object could lead to very large `Library` records in your database.
   * Large documents can negatively impact read/write performance, memory usage, and could even hit database-specific document size limits (e.g., MongoDB has a 16MB limit per document).
   * Accessing a `Document` directly by `DocumentId` (after getting the ID from the `Library`) often allows for more efficient data retrieval, as you only fetch the data you need.

5. **Action Simplicity and Separation of Concerns:**
   * Actions like `addDocument(libraryId: LibraryId, documentId: DocumentId)` are clean and focused: they simply establish a link between two existing, independent entities.
   * `createDocument` is solely responsible for creating a new `Document` entity and all its related sub-entities (`EpubFile`, `TextSettings`, `FocusStats`). This separation makes your conceptual actions clearer and easier to manage.

In summary, the principle of treating each distinct conceptual entity (like `Library`, `Document`, `EpubFile`, `TextSettings`, `FocusStats`, `Annotation`) as a top-level concept with its own identifier, and then linking these concepts using those identifiers, is a fundamental best practice in conceptual modeling. It leads to a more flexible, maintainable, and scalable design, regardless of explicit external rules. The assignment description's rule simply formalizes this good practice.
