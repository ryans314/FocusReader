---
timestamp: 'Thu Oct 23 2025 02:22:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_022233.3171486b.md]]'
content_id: 3c20d140cc276c64426021d819080129818dbf72723b7b0530b1024e9f57543c
---

# response:

```typescript
// src/concepts/Library/LibraryConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Library" + ".";

// Generic types of this concept. User is a parameter type.
type User = ID;

// Specific ID types for clarity and to avoid naming conflicts with collections.
type LibraryID = ID;
type DocumentID = ID;

/**
 * State: a set of Libraries with:
 *   a user User
 *   a documents set of Documents
 */
interface LibraryDoc {
  _id: LibraryID;
  user: User;
  documents: DocumentID[]; // Array of Document IDs belonging to this library
}

/**
 * State: a set of Documents with:
 *   a name String
 *   an epubContent BinaryData (represented as a string, e.g., base64 encoded data or a URL to a blob)
 */
interface DocumentDoc {
  _id: DocumentID;
  name: string;
  epubContent: string; // Assuming BinaryData is stored as a base64 string or a similar string representation
}

/**
 * Library concept:
 *
 * purpose:
 * allow users to add, remove, view, and access their uploaded documents
 *
 * principle:
 * A user can upload documents (.epub) to their library, view all of their uploaded documents,
 * and remove or open and read any of the documents in their library.
 *
 * Notes:
 * - This concept allows a user to have multiple uploads/documents of the same underlying epubContent/BinaryData,
 *   so long as they are given different names within the same library.
 * - Invariant: There will be no two libraries with the same user.
 * - Invariant: Document names are unique within a single library.
 * - Invariant: Each document, once created, is associated with exactly one library.
 * - epubContent is represented as a BinaryData (string) rather than its own complex type,
 *   as .epub files will likely be interacted with via a library that treats them as their own data type.
 */
export default class LibraryConcept {
  libraries: Collection<LibraryDoc>;
  documents: Collection<DocumentDoc>;

  constructor(private readonly db: Db) {
    this.libraries = this.db.collection(PREFIX + "libraries");
    this.documents = this.db.collection(PREFIX + "documents");
  }

  /**
   * createLibrary (user: User): (library: LibraryID)
   *
   * **requires** user is not already associated with a library
   *
   * **effects** creates a new library with user and an empty set of documents; returns the new library's ID
   */
  async createLibrary({ user }: { user: User }): Promise<{ library?: LibraryID; error?: string }> {
    // Check precondition: user is not already associated with a library
    const existingLibrary = await this.libraries.findOne({ user });
    if (existingLibrary) {
      return { error: `User ${user} already has a library.` };
    }

    const newLibraryId = freshID() as LibraryID;
    const newLibrary: LibraryDoc = {
      _id: newLibraryId,
      user: user,
      documents: [],
    };

    try {
      await this.libraries.insertOne(newLibrary);
      return { library: newLibraryId };
    } catch (e) {
      console.error("Error creating library:", e);
      return { error: "Failed to create library due to a database error." };
    }
  }

  /**
   * removeDocument (library: LibraryID, document: DocumentID): Empty
   *
   * **requires** library exists and document is in library
   *
   * **effects** removes document from the set of documents and from library's documents set
   */
  async removeDocument({ library, document }: { library: LibraryID; document: DocumentID }): Promise<Empty | { error: string }> {
    // Check precondition: library exists
    const existingLibrary = await this.libraries.findOne({ _id: library });
    if (!existingLibrary) {
      return { error: `Library ${library} does not exist.` };
    }

    // Check precondition: document is in library
    if (!existingLibrary.documents.includes(document)) {
      return { error: `Document ${document} is not in library ${library}.` };
    }

    try {
      // Effect: remove document from the library's documents set
      await this.libraries.updateOne(
        { _id: library },
        { $pull: { documents: document } },
      );

      // Effect: remove document from the documents collection
      await this.documents.deleteOne({ _id: document });
      return {};
    } catch (e) {
      console.error("Error removing document:", e);
      return { error: "Failed to remove document due to a database error." };
    }
  }

  /**
   * createDocument (name: String, epubContent: BinaryData, library: LibraryID): (document: DocumentID)
   *
   * **requires** library exists and a document with `name` does not already exist in the given `library`
   *
   * **effects** creates a new Document with `name` and `epubContent` and adds it to the `library`; returns the new document's ID
   */
  async createDocument({ name, epubContent, library }: { name: string; epubContent: string; library: LibraryID }): Promise<{ document?: DocumentID; error?: string }> {
    // Check precondition: library exists
    const existingLibrary = await this.libraries.findOne({ _id: library });
    if (!existingLibrary) {
      return { error: `Library ${library} does not exist.` };
    }

    // Check precondition: a document with name does not already exist in the given library
    // We need to check if any document *associated with this specific library* has this name.
    const documentsInLibrary = await this.documents.find({
      _id: { $in: existingLibrary.documents },
    }).toArray();

    const nameExistsInLibrary = documentsInLibrary.some(doc => doc.name === name);

    if (nameExistsInLibrary) {
      return { error: `Document with name '${name}' already exists in library ${library}.` };
    }

    const newDocumentId = freshID() as DocumentID;
    const newDocument: DocumentDoc = {
      _id: newDocumentId,
      name,
      epubContent,
    };

    try {
      // Effect: creates a new Document
      await this.documents.insertOne(newDocument);

      // Effect: adds it to library's documents set
      await this.libraries.updateOne(
        { _id: library },
        { $push: { documents: newDocumentId } },
      );
      return { document: newDocumentId };
    } catch (e) {
      console.error("Error creating document:", e);
      return { error: "Failed to create document due to a database error." };
    }
  }

  /**
   * renameDocument (user: User, newName: String, document: DocumentID): (document: DocumentID)
   *
   * **requires** document exists and is associated with a library owned by `user`,
   *              and `newName` is not the name of an existing document within that user's library (excluding the document being renamed)
   *
   * **effects** changes document's name to `newName`; returns the document's ID
   */
  async renameDocument({ user, newName, document }: { user: User; newName: string; document: DocumentID }): Promise<{ document?: DocumentID; error?: string }> {
    // Check precondition: document exists
    const existingDocument = await this.documents.findOne({ _id: document });
    if (!existingDocument) {
      return { error: `Document ${document} does not exist.` };
    }

    // Find the library owned by the user
    const userLibrary = await this.libraries.findOne({ user });
    if (!userLibrary) {
      return { error: `User ${user} does not have a library.` };
    }

    // Check precondition: document is associated with user's library
    if (!userLibrary.documents.includes(document)) {
      return { error: `Document ${document} is not in user ${user}'s library.` };
    }

    // Check precondition: newName is not the name of an existing document in this library (excluding the document itself)
    const otherDocumentsInLibrary = await this.documents.find({
      _id: { $in: userLibrary.documents, $ne: document }, // documents in library, but not the current document
    }).toArray();

    const nameExistsForOtherDoc = otherDocumentsInLibrary.some(doc => doc.name === newName);

    if (nameExistsForOtherDoc) {
      return { error: `Document with name '${newName}' already exists in user ${user}'s library.` };
    }

    try {
      // Effect: changes document's name to newName
      await this.documents.updateOne(
        { _id: document },
        { $set: { name: newName } },
      );
      return { document: document };
    } catch (e) {
      console.error("Error renaming document:", e);
      return { error: "Failed to rename document due to a database error." };
    }
  }

  /**
   * openDocument (user: User, document: DocumentID): (document: DocumentID)
   *
   * **requires** user is in a library with `document`
   *
   * **effects** confirms the document is accessible to the user; returns the document's ID.
   *            (Note: The concept state does not explicitly track an "open" status,
   *             so this action primarily serves to validate access for the user.)
   */
  async openDocument({ user, document }: { user: User; document: DocumentID }): Promise<{ document?: DocumentID; error?: string }> {
    // Find the library owned by the user
    const userLibrary = await this.libraries.findOne({ user });
    if (!userLibrary) {
      return { error: `User ${user} does not have a library.` };
    }

    // Check precondition: document exists and is in user's library
    const docExists = await this.documents.findOne({ _id: document });
    if (!docExists || !userLibrary.documents.includes(document)) {
      return { error: `Document ${document} does not exist or is not in user ${user}'s library.` };
    }

    // As no state for "open" is defined, the effect is implicit confirmation of access.
    // In a full application, this might trigger content loading, logging, etc.
    // For this concept, the effect is that the preconditions are met, implying access is granted.
    return { document: document };
  }

  /**
   * closeDocument (user: User, document: DocumentID): (document: DocumentID)
   *
   * **requires** user is in a library with `document`
   *
   * **effects** confirms the document is no longer actively being accessed by the user; returns the document's ID.
   *            (Note: Similar to `openDocument`, this action primarily validates user-document association
   *             as no specific "close" state is defined in the concept.)
   */
  async closeDocument({ user, document }: { user: User; document: DocumentID }): Promise<{ document?: DocumentID; error?: string }> {
    // Find the library owned by the user
    const userLibrary = await this.libraries.findOne({ user });
    if (!userLibrary) {
      return { error: `User ${user} does not have a library.` };
    }

    // Check precondition: document exists and is in user's library
    const docExists = await this.documents.findOne({ _id: document });
    if (!docExists || !userLibrary.documents.includes(document)) {
      return { error: `Document ${document} does not exist or is not in user ${user}'s library.` };
    }

    // As no state for "close" is defined, the effect is implicit confirmation of closure.
    // The effect is that the preconditions are met, implying the document is closed for the user.
    return { document: document };
  }

  // --- Queries (not explicitly in concept spec, but useful for interaction and testing) ---

  /**
   * _getLibraryByUser (user: User): (library: LibraryDoc)
   *
   * **requires** user exists and has a library
   *
   * **effects** returns the library document associated with the user as an array containing one element or an error
   */
  async _getLibraryByUser({ user }: { user: User }): Promise<{ library?: LibraryDoc; error?: string }[]> {
    const library = await this.libraries.findOne({ user });
    if (!library) {
      return [{ error: `No library found for user ${user}.` }];
    }
    return [{ library: library }];
  }

  /**
   * _getDocumentsInLibrary (library: LibraryID): (document: DocumentDoc)
   *
   * **requires** library exists
   *
   * **effects** returns all documents (including their name and epub content) that are part of the given library
   *             as an array of document objects
   */
  async _getDocumentsInLibrary({ library }: { library: LibraryID }): Promise<{ document?: DocumentDoc; error?: string }[]> {
    const existingLibrary = await this.libraries.findOne({ _id: library });
    if (!existingLibrary) {
      return [{ error: `Library ${library} does not exist.` }];
    }

    const documents = await this.documents.find({ _id: { $in: existingLibrary.documents } }).toArray();
    return documents.map(doc => ({ document: doc }));
  }

  /**
   * _getDocumentDetails (document: DocumentID): (document: DocumentDoc)
   *
   * **requires** document exists
   *
   * **effects** returns the details (name, epubContent) of the specified document as an array containing one element or an error
   */
  async _getDocumentDetails({ document }: { document: DocumentID }): Promise<{ document?: DocumentDoc; error?: string }[]> {
    const doc = await this.documents.findOne({ _id: document });
    if (!doc) {
      return [{ error: `Document ${document} does not exist.` }];
    }
    return [{ document: doc }];
  }
}
```

```typescript
// src/concepts/Library/LibraryConcept.test.ts
import { assertEquals } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import LibraryConcept from "./LibraryConcept.ts";

Deno.test("Library Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new LibraryConcept(db);

  const userAlice = "user:Alice" as ID;
  const userBob = "user:Bob" as ID;
  const epubContent1 = "binary_data_for_book1" as const;
  const epubContent2 = "binary_data_for_book2" as const;

  console.log("Starting Library Concept Tests...");

  await t.step("createLibrary: should create a new library for a user", async () => {
    console.log("  Action: createLibrary(user: Alice)");
    const result = await concept.createLibrary({ user: userAlice });
    assertEquals(result.error, undefined, "Should not return an error.");
    const libraryId = result.library;
    assertEquals(typeof libraryId, "string", "Should return a library ID.");

    console.log("  Verification: Library for Alice exists and is empty.");
    const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
    assertEquals(fetchedLibrary[0].library?.user, userAlice, "Library should be associated with Alice.");
    assertEquals(fetchedLibrary[0].library?.documents.length, 0, "New library should have no documents.");
  });

  await t.step("createLibrary: should not create a library if user already has one", async () => {
    console.log("  Action: createLibrary(user: Alice) again");
    const result = await concept.createLibrary({ user: userAlice });
    assertEquals(result.error, `User ${userAlice} already has a library.`, "Should return an error for duplicate library.");
    assertEquals(result.library, undefined, "Should not return a library ID.");
  });

  let aliceLibraryId: ID;
  await t.step("Setup: Get Alice's Library ID", async () => {
    const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
    aliceLibraryId = fetchedLibrary[0].library!._id;
  });

  let doc1Id: ID;
  let doc2Id: ID;
  await t.step("createDocument: should add a new document to an existing library", async () => {
    console.log("  Action: createDocument('Book One', epubContent1, library: Alice's)");
    const result = await concept.createDocument({
      name: "Book One",
      epubContent: epubContent1,
      library: aliceLibraryId,
    });
    assertEquals(result.error, undefined, "Should not return an error.");
    doc1Id = result.document!;
    assertEquals(typeof doc1Id, "string", "Should return a document ID.");

    console.log("  Verification: Library has one document, document details are correct.");
    const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
    assertEquals(fetchedLibrary[0].library?.documents.includes(doc1Id), true, "Document should be in library.");
    assertEquals(fetchedLibrary[0].library?.documents.length, 1, "Library should have one document.");

    const fetchedDoc = await concept._getDocumentDetails({ document: doc1Id });
    assertEquals(fetchedDoc[0].document?.name, "Book One", "Document name should be 'Book One'.");
    assertEquals(fetchedDoc[0].document?.epubContent, epubContent1, "Document content should match.");
  });

  await t.step("createDocument: should allow different documents with same epubContent but different names", async () => {
    console.log("  Action: createDocument('Book Two', epubContent1, library: Alice's)");
    const result = await concept.createDocument({
      name: "Book Two",
      epubContent: epubContent1,
      library: aliceLibraryId,
    });
    assertEquals(result.error, undefined, "Should not return an error.");
    doc2Id = result.document!;
    assertEquals(typeof doc2Id, "string", "Should return a document ID.");

    console.log("  Verification: Library has two documents.");
    const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
    assertEquals(fetchedLibrary[0].library?.documents.includes(doc2Id), true, "Second document should be in library.");
    assertEquals(fetchedLibrary[0].library?.documents.length, 2, "Library should now have two documents.");
  });

  await t.step("createDocument: should not add a document with a duplicate name in the same library", async () => {
    console.log("  Action: createDocument('Book One', epubContent2, library: Alice's) (duplicate name)");
    const result = await concept.createDocument({
      name: "Book One",
      epubContent: epubContent2,
      library: aliceLibraryId,
    });
    assertEquals(result.error, `Document with name 'Book One' already exists in library ${aliceLibraryId}.`, "Should return an error for duplicate document name in library.");
  });

  await t.step("createDocument: should not add a document to a non-existent library", async () => {
    console.log("  Action: createDocument('New Book', epubContent1, library: nonExistentId)");
    const nonExistentLibrary = "lib:NonExistent" as ID;
    const result = await concept.createDocument({
      name: "New Book",
      epubContent: epubContent1,
      library: nonExistentLibrary,
    });
    assertEquals(result.error, `Library ${nonExistentLibrary} does not exist.`, "Should return an error for non-existent library.");
  });

  await t.step("renameDocument: should rename an existing document", async () => {
    console.log("  Action: renameDocument(user: Alice, newName: 'First Book', document: doc1Id)");
    const result = await concept.renameDocument({
      user: userAlice,
      newName: "First Book",
      document: doc1Id,
    });
    assertEquals(result.error, undefined, "Should not return an error.");
    assertEquals(result.document, doc1Id, "Should return the document ID.");

    console.log("  Verification: Document 1 has new name.");
    const fetchedDoc = await concept._getDocumentDetails({ document: doc1Id });
    assertEquals(fetchedDoc[0].document?.name, "First Book", "Document name should be updated.");
  });

  await t.step("renameDocument: should not rename a document to an already existing name in the same library", async () => {
    console.log("  Action: renameDocument(user: Alice, newName: 'Book Two', document: doc1Id) (duplicate name)");
    const result = await concept.renameDocument({
      user: userAlice,
      newName: "Book Two", // doc2 has this name
      document: doc1Id,
    });
    assertEquals(result.error, `Document with name 'Book Two' already exists in user ${userAlice}'s library.`, "Should return an error for duplicate name.");
  });

  await t.step("openDocument: should successfully 'open' a document for a user who owns it", async () => {
    console.log("  Action: openDocument(user: Alice, document: doc1Id)");
    const result = await concept.openDocument({ user: userAlice, document: doc1Id });
    assertEquals(result.error, undefined, "Should not return an error.");
    assertEquals(result.document, doc1Id, "Should return the document ID.");
  });

  await t.step("openDocument: should fail to 'open' a document if user does not own it", async () => {
    console.log("  Action: createLibrary(user: Bob)");
    const bobLibraryResult = await concept.createLibrary({ user: userBob });
    const bobLibraryId = bobLibraryResult.library!;
    console.log("  Action: openDocument(user: Bob, document: doc1Id) (owned by Alice)");
    const result = await concept.openDocument({ user: userBob, document: doc1Id });
    assertEquals(result.error, `Document ${doc1Id} does not exist or is not in user ${userBob}'s library.`, "Should return an error for unauthorized access.");

    // Clean up Bob's library
    await concept.libraries.deleteOne({ _id: bobLibraryId });
  });

  await t.step("closeDocument: should successfully 'close' a document for a user who owns it", async () => {
    console.log("  Action: closeDocument(user: Alice, document: doc1Id)");
    const result = await concept.closeDocument({ user: userAlice, document: doc1Id });
    assertEquals(result.error, undefined, "Should not return an error.");
    assertEquals(result.document, doc1Id, "Should return the document ID.");
  });

  await t.step("removeDocument: should remove an existing document from the library and collection", async () => {
    console.log("  Action: removeDocument(library: Alice's, document: doc1Id)");
    const result = await concept.removeDocument({ library: aliceLibraryId, document: doc1Id });
    assertEquals(result.error, undefined, "Should not return an error.");

    console.log("  Verification: Library and document collection are updated.");
    const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
    assertEquals(fetchedLibrary[0].library?.documents.includes(doc1Id), false, "Document 1 should be removed from library.");
    assertEquals(fetchedLibrary[0].library?.documents.length, 1, "Library should now have one document (doc2).");

    const fetchedDoc = await concept._getDocumentDetails({ document: doc1Id });
    assertEquals(fetchedDoc[0].error, `Document ${doc1Id} does not exist.`, "Document 1 should no longer exist.");
  });

  await t.step("removeDocument: should not remove a document if not in the specified library", async () => {
    console.log("  Action: createLibrary(user: Bob) again");
    const bobLibraryResult = await concept.createLibrary({ user: userBob });
    const bobLibraryId = bobLibraryResult.library!;

    console.log("  Action: createDocument('Bob's Book', epubContent2, library: Bob's)");
    const bobDocResult = await concept.createDocument({ name: "Bob's Book", epubContent: epubContent2, library: bobLibraryId });
    const bobDocId = bobDocResult.document!;

    console.log("  Action: removeDocument(library: Alice's, document: bobDocId) (not in Alice's library)");
    const result = await concept.removeDocument({ library: aliceLibraryId, document: bobDocId });
    assertEquals(result.error, `Document ${bobDocId} is not in library ${aliceLibraryId}.`, "Should return an error for document not in library.");

    // Clean up Bob's library and document
    await concept.removeDocument({ library: bobLibraryId, document: bobDocId });
    await concept.libraries.deleteOne({ _id: bobLibraryId });
  });

  await t.step("Principle Trace: A user can upload documents, view, remove, or open them.", async () => {
    console.log("\n--- Principle Trace Simulation ---");
    const testUser = "user:PrincipleTester" as ID;
    const bookTitle1 = "The Great Adventure";
    const bookContent1 = "content_great_adventure";
    const bookTitle2 = "Whispers in the Dark";
    const bookContent2 = "content_whispers_dark";

    console.log("1. User creates a library.");
    const createLibResult = await concept.createLibrary({ user: testUser });
    assertEquals(createLibResult.error, undefined, "Expected library creation to succeed.");
    const testLibraryId = createLibResult.library!;
    console.log(`   Created library for ${testUser}: ${testLibraryId}`);

    console.log("2. User uploads two documents.");
    const createDoc1Result = await concept.createDocument({
      name: bookTitle1,
      epubContent: bookContent1,
      library: testLibraryId,
    });
    assertEquals(createDoc1Result.error, undefined, "Expected first document upload to succeed.");
    const docId1 = createDoc1Result.document!;
    console.log(`   Uploaded document "${bookTitle1}": ${docId1}`);

    const createDoc2Result = await concept.createDocument({
      name: bookTitle2,
      epubContent: bookContent2,
      library: testLibraryId,
    });
    assertEquals(createDoc2Result.error, undefined, "Expected second document upload to succeed.");
    const docId2 = createDoc2Result.document!;
    console.log(`   Uploaded document "${bookTitle2}": ${docId2}`);

    console.log("3. User views all uploaded documents.");
    const viewDocsResult = await concept._getDocumentsInLibrary({ library: testLibraryId });
    assertEquals(viewDocsResult.length, 2, "Expected to see two documents in the library.");
    assertEquals(viewDocsResult.some(d => d.document?.name === bookTitle1), true, "Expected to find 'The Great Adventure'.");
    assertEquals(viewDocsResult.some(d => d.document?.name === bookTitle2), true, "Expected to find 'Whispers in the Dark'.");
    console.log("   Successfully viewed two documents.");

    console.log("4. User opens and reads 'The Great Adventure'.");
    const openDocResult = await concept.openDocument({ user: testUser, document: docId1 });
    assertEquals(openDocResult.error, undefined, "Expected open action to succeed.");
    assertEquals(openDocResult.document, docId1, "Expected open action to return doc ID.");
    console.log(`   Successfully opened document "${bookTitle1}".`);

    console.log("5. User decides to rename 'The Great Adventure' to 'My First Book'.");
    const renameDocResult = await concept.renameDocument({
      user: testUser,
      newName: "My First Book",
      document: docId1,
    });
    assertEquals(renameDocResult.error, undefined, "Expected rename action to succeed.");
    const renamedDocDetails = await concept._getDocumentDetails({ document: docId1 });
    assertEquals(renamedDocDetails[0].document?.name, "My First Book", "Document name should be updated.");
    console.log("   Successfully renamed document.");

    console.log("6. User closes 'My First Book'.");
    const closeDocResult = await concept.closeDocument({ user: testUser, document: docId1 });
    assertEquals(closeDocResult.error, undefined, "Expected close action to succeed.");
    assertEquals(closeDocResult.document, docId1, "Expected close action to return doc ID.");
    console.log(`   Successfully closed document "My First Book".`);

    console.log("7. User removes 'Whispers in the Dark'.");
    const removeDocResult = await concept.removeDocument({ library: testLibraryId, document: docId2 });
    assertEquals(removeDocResult.error, undefined, "Expected document removal to succeed.");
    console.log(`   Successfully removed document "${bookTitle2}".`);

    console.log("8. User views remaining documents.");
    const finalViewDocsResult = await concept._getDocumentsInLibrary({ library: testLibraryId });
    assertEquals(finalViewDocsResult.length, 1, "Expected only one document remaining.");
    assertEquals(finalViewDocsResult[0].document?.name, "My First Book", "Expected 'My First Book' to be the remaining document.");
    console.log("   Successfully viewed remaining document.");

    console.log("--- Principle Trace Simulation Complete ---");
  });

  console.log("Library Concept Tests Complete.");

  await client.close();
});
```
