---
timestamp: 'Thu Oct 23 2025 06:55:17 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_065517.63110046.md]]'
content_id: bbe9637f9b397bbdef1d73878ec337c4b30f1a5d48d8037bfa04c3bab5f23316
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
    try {
      console.log("  Running: createLibrary(user: Alice)");
      const result = await concept.createLibrary({ user: userAlice });
      assertEquals(result.error, undefined, "Expected no error.");
      const libraryId = result.library;
      assertEquals(typeof libraryId, "string", "Expected a library ID.");

      const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
      assertEquals(fetchedLibrary[0].library?.user, userAlice, "Verification: Library associated with Alice.");
      assertEquals(fetchedLibrary[0].library?.documents.length, 0, "Verification: New library has no documents.");
      console.log("  ✅ Test Passed: Library for Alice created and verified.");
    } catch (e) {
      console.error("  ❌ Test Failed: createLibrary for Alice.", e.message);
      throw e;
    }
  });

  await t.step("createLibrary: should not create a library if user already has one", async () => {
    try {
      console.log("  Running: createLibrary(user: Alice) again (expected failure)");
      const result = await concept.createLibrary({ user: userAlice });
      assertEquals(result.error, `User ${userAlice} already has a library.`, "Expected error for duplicate library.");
      assertEquals(result.library, undefined, "Expected no library ID on error.");
      console.log("  ✅ Test Passed: Duplicate library creation correctly prevented.");
    } catch (e) {
      console.error("  ❌ Test Failed: Duplicate library creation prevention.", e.message);
      throw e;
    }
  });

  let aliceLibraryId: ID;
  await t.step("Setup: Get Alice's Library ID for subsequent tests", async () => {
    try {
      console.log("  Running: Retrieve Alice's library ID.");
      const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
      aliceLibraryId = fetchedLibrary[0].library!._id;
      assertEquals(typeof aliceLibraryId, "string", "Verification: Alice's library ID retrieved.");
      console.log(`  ✅ Setup Complete: Alice's Library ID is ${aliceLibraryId}.`);
    } catch (e) {
      console.error("  ❌ Setup Failed: Could not retrieve Alice's library ID.", e.message);
      throw e;
    }
  });

  let doc1Id: ID;
  let doc2Id: ID;
  await t.step("createDocument: should add a new document to an existing library", async () => {
    try {
      console.log("  Running: createDocument('Book One', epubContent1, library: Alice's)");
      const result = await concept.createDocument({
        name: "Book One",
        epubContent: epubContent1,
        library: aliceLibraryId,
      });
      assertEquals(result.error, undefined, "Expected no error.");
      doc1Id = result.document!;
      assertEquals(typeof doc1Id, "string", "Expected a document ID.");

      const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
      assertEquals(fetchedLibrary[0].library?.documents.includes(doc1Id), true, "Verification: Document in library.");
      assertEquals(fetchedLibrary[0].library?.documents.length, 1, "Verification: Library has one document.");

      const fetchedDoc = await concept._getDocumentDetails({ document: doc1Id });
      assertEquals(fetchedDoc[0].document?.name, "Book One", "Verification: Document name correct.");
      assertEquals(fetchedDoc[0].document?.epubContent, epubContent1, "Verification: Document content correct.");
      console.log("  ✅ Test Passed: Document 'Book One' created and verified.");
    } catch (e) {
      console.error("  ❌ Test Failed: createDocument 'Book One'.", e.message);
      throw e;
    }
  });

  await t.step("createDocument: should allow different documents with same epubContent but different names", async () => {
    try {
      console.log("  Running: createDocument('Book Two', epubContent1, library: Alice's)");
      const result = await concept.createDocument({
        name: "Book Two",
        epubContent: epubContent1,
        library: aliceLibraryId,
      });
      assertEquals(result.error, undefined, "Expected no error.");
      doc2Id = result.document!;
      assertEquals(typeof doc2Id, "string", "Expected a document ID.");

      const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
      assertEquals(fetchedLibrary[0].library?.documents.includes(doc2Id), true, "Verification: Second document in library.");
      assertEquals(fetchedLibrary[0].library?.documents.length, 2, "Verification: Library has two documents.");
      console.log("  ✅ Test Passed: 'Book Two' created with same content, different name.");
    } catch (e) {
      console.error("  ❌ Test Failed: createDocument 'Book Two'.", e.message);
      throw e;
    }
  });

  await t.step("createDocument: should not add a document with a duplicate name in the same library", async () => {
    try {
      console.log("  Running: createDocument('Book One', epubContent2, library: Alice's) (duplicate name, expected failure)");
      const result = await concept.createDocument({
        name: "Book One",
        epubContent: epubContent2,
        library: aliceLibraryId,
      });
      assertEquals(result.error, `Document with name 'Book One' already exists in library ${aliceLibraryId}.`, "Expected error for duplicate document name in library.");
      console.log("  ✅ Test Passed: Duplicate name within library correctly prevented.");
    } catch (e) {
      console.error("  ❌ Test Failed: Duplicate name prevention.", e.message);
      throw e;
    }
  });

  await t.step("createDocument: should not add a document to a non-existent library", async () => {
    try {
      console.log("  Running: createDocument('New Book', epubContent1, library: nonExistentId) (expected failure)");
      const nonExistentLibrary = "lib:NonExistent" as ID;
      const result = await concept.createDocument({
        name: "New Book",
        epubContent: epubContent1,
        library: nonExistentLibrary,
      });
      assertEquals(result.error, `Library ${nonExistentLibrary} does not exist.`, "Expected error for non-existent library.");
      console.log("  ✅ Test Passed: Creation to non-existent library correctly prevented.");
    } catch (e) {
      console.error("  ❌ Test Failed: Creation to non-existent library.", e.message);
      throw e;
    }
  });

  await t.step("renameDocument: should rename an existing document", async () => {
    try {
      console.log("  Running: renameDocument(user: Alice, newName: 'First Book', document: doc1Id)");
      const result = await concept.renameDocument({
        user: userAlice,
        newName: "My First Book", // Changed name to avoid conflict with "First Book" example
        document: doc1Id,
      });
      assertEquals(result.error, undefined, "Expected no error.");
      assertEquals(result.document, doc1Id, "Expected the document ID.");

      const fetchedDoc = await concept._getDocumentDetails({ document: doc1Id });
      assertEquals(fetchedDoc[0].document?.name, "My First Book", "Verification: Document name updated.");
      console.log("  ✅ Test Passed: Document renamed successfully.");
    } catch (e) {
      console.error("  ❌ Test Failed: Document rename.", e.message);
      throw e;
    }
  });

  await t.step("renameDocument: should not rename a document to an already existing name in the same library", async () => {
    try {
      console.log("  Running: renameDocument(user: Alice, newName: 'Book Two', document: doc1Id) (duplicate name, expected failure)");
      const result = await concept.renameDocument({
        user: userAlice,
        newName: "Book Two", // doc2 has this name
        document: doc1Id,
      });
      assertEquals(result.error, `Document with name 'Book Two' already exists in user ${userAlice}'s library.`, "Expected error for duplicate name.");
      console.log("  ✅ Test Passed: Renaming to duplicate name correctly prevented.");
    } catch (e) {
      console.error("  ❌ Test Failed: Renaming to duplicate name.", e.message);
      throw e;
    }
  });

  await t.step("openDocument: should successfully 'open' a document for a user who owns it", async () => {
    try {
      console.log("  Running: openDocument(user: Alice, document: doc1Id)");
      const result = await concept.openDocument({ user: userAlice, document: doc1Id });
      assertEquals(result.error, undefined, "Expected no error.");
      assertEquals(result.document, doc1Id, "Expected the document ID.");
      console.log("  ✅ Test Passed: Document 'My First Book' successfully 'opened' by Alice.");
    } catch (e) {
      console.error("  ❌ Test Failed: Open document by owner.", e.message);
      throw e;
    }
  });

  await t.step("openDocument: should fail to 'open' a document if user does not own it", async () => {
    let bobLibraryId: ID;
    try {
      console.log("  Setup: createLibrary(user: Bob)");
      const bobLibraryResult = await concept.createLibrary({ user: userBob });
      bobLibraryId = bobLibraryResult.library!;

      console.log("  Running: openDocument(user: Bob, document: doc1Id) (owned by Alice, expected failure)");
      const result = await concept.openDocument({ user: userBob, document: doc1Id });
      assertEquals(result.error, `Document ${doc1Id} does not exist or is not in user ${userBob}'s library.`, "Expected error for unauthorized access.");
      console.log("  ✅ Test Passed: Unauthorized document access correctly prevented.");
    } catch (e) {
      console.error("  ❌ Test Failed: Unauthorized document access.", e.message);
      throw e;
    } finally {
      if (bobLibraryId) await concept.libraries.deleteOne({ _id: bobLibraryId });
    }
  });

  await t.step("closeDocument: should successfully 'close' a document for a user who owns it", async () => {
    try {
      console.log("  Running: closeDocument(user: Alice, document: doc1Id)");
      const result = await concept.closeDocument({ user: userAlice, document: doc1Id });
      assertEquals(result.error, undefined, "Expected no error.");
      assertEquals(result.document, doc1Id, "Expected the document ID.");
      console.log("  ✅ Test Passed: Document 'My First Book' successfully 'closed' by Alice.");
    } catch (e) {
      console.error("  ❌ Test Failed: Close document by owner.", e.message);
      throw e;
    }
  });

  await t.step("removeDocument: should remove an existing document from the library and collection", async () => {
    try {
      console.log("  Running: removeDocument(library: Alice's, document: doc1Id)");
      const result = await concept.removeDocument({ library: aliceLibraryId, document: doc1Id });
      assertEquals(result.error, undefined, "Expected no error.");

      const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
      assertEquals(fetchedLibrary[0].library?.documents.includes(doc1Id), false, "Verification: Document 1 removed from library.");
      assertEquals(fetchedLibrary[0].library?.documents.length, 1, "Verification: Library has one document (doc2).");

      const fetchedDoc = await concept._getDocumentDetails({ document: doc1Id });
      assertEquals(fetchedDoc[0].error, `Document ${doc1Id} does not exist.`, "Verification: Document 1 no longer exists.");
      console.log("  ✅ Test Passed: Document 'My First Book' removed and verified.");
    } catch (e) {
      console.error("  ❌ Test Failed: Document removal.", e.message);
      throw e;
    }
  });

  await t.step("removeDocument: should not remove a document if not in the specified library", async () => {
    let bobLibraryId: ID;
    let bobDocId: ID;
    try {
      console.log("  Setup: createLibrary(user: Bob) and create a document for Bob");
      const bobLibraryResult = await concept.createLibrary({ user: userBob });
      bobLibraryId = bobLibraryResult.library!;
      const bobDocResult = await concept.createDocument({ name: "Bob's Book", epubContent: epubContent2, library: bobLibraryId });
      bobDocId = bobDocResult.document!;

      console.log("  Running: removeDocument(library: Alice's, document: bobDocId) (not in Alice's library, expected failure)");
      const result = await concept.removeDocument({ library: aliceLibraryId, document: bobDocId });
      assertEquals(result.error, `Document ${bobDocId} is not in library ${aliceLibraryId}.`, "Expected error for document not in library.");
      console.log("  ✅ Test Passed: Removal of document not in specified library correctly prevented.");
    } catch (e) {
      console.error("  ❌ Test Failed: Removal of document not in library.", e.message);
      throw e;
    } finally {
      if (bobLibraryId && bobDocId) await concept.removeDocument({ library: bobLibraryId, document: bobDocId });
      if (bobLibraryId) await concept.libraries.deleteOne({ user: userBob }); // Clean up Bob's library record
    }
  });

  await t.step("Principle Trace: A user can upload documents, view, remove, or open them.", async () => {
    const testUser = "user:PrincipleTester" as ID;
    const bookTitle1 = "The Great Adventure";
    const bookContent1 = "content_great_adventure";
    const bookTitle2 = "Whispers in the Dark";
    const bookContent2 = "content_whispers_dark";
    let testLibraryId: ID;
    let docId1: ID;
    let docId2: ID;

    try {
      console.log("\n--- Running Principle Trace Simulation ---");
      console.log("1. User creates a library.");
      const createLibResult = await concept.createLibrary({ user: testUser });
      assertEquals(createLibResult.error, undefined, "Expected library creation to succeed.");
      testLibraryId = createLibResult.library!;
      console.log(`   Created library for ${testUser}: ${testLibraryId}`);

      console.log("2. User uploads two documents.");
      const createDoc1Result = await concept.createDocument({
        name: bookTitle1,
        epubContent: bookContent1,
        library: testLibraryId,
      });
      assertEquals(createDoc1Result.error, undefined, "Expected first document upload to succeed.");
      docId1 = createDoc1Result.document!;
      console.log(`   Uploaded document "${bookTitle1}": ${docId1}`);

      const createDoc2Result = await concept.createDocument({
        name: bookTitle2,
        epubContent: bookContent2,
        library: testLibraryId,
      });
      assertEquals(createDoc2Result.error, undefined, "Expected second document upload to succeed.");
      docId2 = createDoc2Result.document!;
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
      assertEquals(renamedDocDetails[0].document?.name, "My First Book", "Verification: Document name should be updated.");
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

      console.log("--- ✅ Principle Trace Simulation Complete ---");
    } catch (e) {
      console.error("--- ❌ Principle Trace Simulation Failed ---", e.message);
      throw e;
    } finally {
      // Cleanup for principle trace
      if (testLibraryId && docId1) await concept.removeDocument({ library: testLibraryId, document: docId1 });
      if (testLibraryId && docId2) await concept.removeDocument({ library: testLibraryId, document: docId2 }); // In case cleanup is called early
      if (testLibraryId) await concept.libraries.deleteOne({ _id: testLibraryId }); // Remove the library record itself
    }
  });

  console.log("Library Concept Tests Complete.");

  await client.close();
});
```

### Explanation of Changes for Emojis:

To integrate the "✅" (check) or "❌" (X) emojis for test pass/fail, I've wrapped the main logic of each `t.step` within a `try...catch` block.

Here's how it works for each test case:

1. **`try` Block (Success Path)**:
   * The test logic (actions, assertions, and intermediate `console.log` statements) remains within the `try` block.
   * If all assertions pass and the block completes without throwing an error, a `console.log` statement is executed at the very end of the `try` block, displaying `✅ Test Passed: [Description of what passed].` This explicitly marks the step's success in the custom output.

2. **`catch` Block (Failure Path)**:
   * If any assertion fails or an unexpected error occurs within the `try` block, the `catch` block is executed.
   * Inside the `catch` block, `console.error` is used to display `❌ Test Failed: [Description of what failed]. Error: [error message]`. This immediately signals the failure.
   * Crucially, `throw e;` is used to re-throw the caught error. This ensures that Deno's native test runner still registers the test as a failure and provides its full stack trace, preventing the custom logging from hiding actual test failures.

**Specific Adjustments:**

* **Refined `console.log` messages**: I've adjusted the intermediate `console.log` statements to be more concise and to clearly indicate "Running:" an action or "Verification:" a state, separating them from the final pass/fail emoji message.
* **Setup/Cleanup**: For tests involving `userBob` or the `Principle Trace`, explicit `finally` blocks have been added to ensure proper cleanup of any created data (libraries, documents) regardless of test outcome, maintaining test isolation.
* **Test Descriptions**: The emoji messages now explicitly state what passed or failed, making the output more informative at a glance.

This approach provides clear, human-readable feedback on each test step's outcome directly within the `console` output, while still leveraging Deno's robust built-in test runner for accurate reporting and debugging.

### How to Run These Tests

As mentioned previously, you can run these tests using either your IDE's Deno integration or via the command line.

**Via Command Line (Recommended for comprehensive runs):**

```bash
deno test --allow-net --allow-read --allow-env --allow-sys src/concepts/Library/LibraryConcept.test.ts
```

You will see output similar to this (simplified for clarity):

```
Starting Library Concept Tests...
test Library Concept Tests ...
  Running: createLibrary(user: Alice)
  ✅ Test Passed: Library for Alice created and verified.
  createLibrary: should create a new library for a user ... ok (12ms)
  Running: createLibrary(user: Alice) again (expected failure)
  ✅ Test Passed: Duplicate library creation correctly prevented.
  createLibrary: should not create a library if user already has one ... ok (5ms)
  Running: Retrieve Alice's library ID.
  ✅ Setup Complete: Alice's Library ID is user:Alice_lib:xxxxxxxxxxxx.
  Setup: Get Alice's Library ID for subsequent tests ... ok (2ms)
  ... (more tests) ...
--- Running Principle Trace Simulation ---
1. User creates a library.
   Created library for user:PrincipleTester: lib:xxxxxxxxxxxx
2. User uploads two documents.
   Uploaded document "The Great Adventure": doc:xxxxxxxxxxxx
   Uploaded document "Whispers in the Dark": doc:yyyyyyyyyyyy
3. User views all uploaded documents.
   Successfully viewed two documents.
4. User opens and reads 'The Great Adventure'.
   Successfully opened document "The Great Adventure".
5. User decides to rename 'The Great Adventure' to 'My First Book'.
   Successfully renamed document.
6. User closes 'My First Book'.
   Successfully closed document "My First Book".
7. User removes 'Whispers in the Dark'.
   Successfully removed document "Whispers in the Dark".
8. User views remaining documents.
   Successfully viewed remaining document.
--- ✅ Principle Trace Simulation Complete ---
  Principle Trace: A user can upload documents, view, remove, or open them. ... ok (20ms)
Library Concept Tests Complete.

test result: ok. 14 passed (100ms)
```

If a test fails, you would see:

```
Starting Library Concept Tests...
test Library Concept Tests ...
  ... (some passing tests) ...
  Running: createDocument('Book One', epubContent1, library: Alice's)
  ❌ Test Failed: createDocument 'Book One'. Expected: "Book One", Actual: "Wrong Name".
  createDocument: should add a new document to an existing library ... FAILED (15ms)

error: Test failed
```
