# Test: Library 

[@Library](Library.md)

[@implementation](implementation.md)

[@testing-concepts](../../background/testing-concepts.md)

# Test: Library
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

# Prompt: Can you tell me about the Deno testing environment? What's the best way to run these tests? Is it to use the green "run tests" button next to the line numbers, or is there a deno run test command line thing I should say
# response:

The Deno testing environment is a powerful and integrated part of the Deno runtime itself, designed for simplicity and efficiency.

Here's a breakdown and the best ways to run your tests:

### About the Deno Testing Environment

1.  **Native Support**: Deno has a built-in test runner. You don't need to install external libraries like Jest, Mocha, or Vitest. The `Deno.test` API is part of the standard library.
2.  **`Deno.test` API**: Tests are defined using the `Deno.test()` function, which can be asynchronous (using `async`/`await`).
3.  **Structured Tests**: You can organize your tests using `Deno.test` for individual test cases or use `t.step()` inside a parent `Deno.test` block for sub-tests, as demonstrated in your `LibraryConcept.test.ts` file. This helps in organizing larger test suites and provides clear output for each step.
4.  **Permissions**: Deno runs with secure defaults, meaning tests (like any Deno script) need explicit permissions for network access (`--allow-net`), file system access (`--allow-read`, `--allow-write`), environment variable access (`--allow-env`), etc. Your `deno.json` file already hints at the necessary permissions for tasks.
5.  **`testDb` Utility**: The `testDb()` utility you're using (from `@utils/database.ts`) is designed to provide a clean database instance for each test. The prompt mentions that `Deno.test.beforeAll` handles dropping the database before each test file, ensuring isolation and preventing test leakage. This is a crucial aspect for robust testing.

### Best Way to Run These Tests

You have two primary options, and both are valid depending on your workflow:

1.  **Using the Green "Run Tests" Button (IDE Integration)**
    *   **Description**: If you are using an IDE like VS Code with the official Deno extension, you'll see a green "play" or "run tests" button next to `Deno.test` blocks or `t.step` calls.
    *   **Advantages**:
        *   **Convenience**: Very quick to run specific tests or entire test files directly from the editor.
        *   **Visual Feedback**: Integrates with your IDE's test explorer, showing successful/failed tests visually.
        *   **Debugging**: Often provides easy integration for setting breakpoints and debugging your tests.
    *   **Best For**: Rapid iteration, developing a specific test or feature, and debugging.

2.  **Using the Deno `test` Command Line**
    *   **Description**: This is the universal way to run Deno tests from your terminal.
    *   **Advantages**:
        *   **Automation**: Essential for CI/CD pipelines, automated build processes, and pre-commit hooks.
        *   **Control**: Offers more granular control over which tests run, specific permissions, reporting formats, and other options via command-line flags.
        *   **Universality**: Works in any terminal environment, regardless of IDE.
    *   **Best For**: Running all tests, integrating into build systems, and when you need specific Deno CLI options.

### How to Run via Command Line

Given your `deno.json` with imports, Deno will automatically handle module resolution. You'll need to specify the permissions that your tests (specifically `testDb` and your concept's interactions with MongoDB) require.

Based on the `deno.json` task and common MongoDB interaction, the following permissions are usually needed:
*   `--allow-net`: For connecting to the MongoDB database.
*   `--allow-read`: For reading `.env` files (if `getDb` or `testDb` uses it) and potentially for Deno's internal operations.
*   `--allow-env`: For accessing environment variables (e.g., MongoDB connection string from `.env`).
*   `--allow-sys`: This might be used by `testDb` for system operations like temporary file creation or other OS interactions, or sometimes implicitly by the MongoDB driver. It's often included for broader compatibility.

**To run all tests in your `src/concepts/Library` directory:**

```bash
deno test --allow-net --allow-read --allow-env --allow-sys src/concepts/Library/
```

**To run only the `LibraryConcept.test.ts` file:**

```bash
deno test --allow-net --allow-read --allow-env --allow-sys src/concepts/Library/LibraryConcept.test.ts
```

**To run a specific test by name (e.g., the Principle Trace test):**

You can use the `--filter` flag, providing part of the test name.

```bash
deno test --allow-net --allow-read --allow-env --allow-sys src/concepts/Library/LibraryConcept.test.ts --filter "Principle Trace"
```

**Useful `deno test` Flags:**

*   `--watch`: Reruns tests automatically when files change (great for development).
*   `--jobs <N>`: Runs tests in parallel using `<N>` jobs (defaults to number of CPU cores).
*   `--fail-fast`: Stops running tests after the first failure.
*   `--no-check`: Skips type-checking (can speed up test runs, but use with caution).

**In summary:** For your provided tests, both the "Run Tests" button in a Deno-enabled IDE and the command-line `deno test` command (with appropriate permissions) are suitable. The command-line approach offers more control and is essential for automation.

# Prompt: Can you go through each of the test cases that you generated and tell me what it tests?
# response:

Okay, let's break down each test case in the `LibraryConcept.test.ts` file and explain what it tests.

### `LibraryConcept.test.ts` Test Cases Explained

The tests are organized using `Deno.test` for the main suite and `t.step` for individual test cases, which helps create a clear, nested output in the Deno test runner.

---

**1. `createLibrary: should create a new library for a user`**
   *   **What it tests**: This is the most basic positive test for the `createLibrary` action.
   *   **Validation**:
        *   It ensures that when a new user (e.g., `userAlice`) attempts to create a library, the action succeeds without an error.
        *   It then uses the internal query `_getLibraryByUser` to fetch the newly created library and confirms that it's correctly associated with `userAlice` and that its `documents` array is initially empty.
   *   **Concept coverage**: `createLibrary` action, `_getLibraryByUser` query, initial state of a new library.

---

**2. `createLibrary: should not create a library if user already has one`**
   *   **What it tests**: This test validates the `requires` precondition of the `createLibrary` action: "user is not already associated with a library".
   *   **Validation**:
        *   It calls `createLibrary` with `userAlice` again (who already has a library from the previous test).
        *   It asserts that an `error` message is returned, specifically indicating that the user already has a library, and that no new `library` ID is returned.
   *   **Concept coverage**: `createLibrary` action's precondition logic.

---

**3. `createDocument: should add a new document to an existing library`**
   *   **What it tests**: This is the primary positive test for the `createDocument` action. It also implicitly sets up state for subsequent tests.
   *   **Validation**:
        *   It first retrieves `userAlice`'s library ID (from the setup step, not shown explicitly in the `t.step` but happening as an outer setup).
        *   It calls `createDocument` with a new document name, content, and `aliceLibraryId`.
        *   It asserts no error.
        *   It verifies that the `documents` array of Alice's library now includes the `doc1Id`.
        *   It also uses `_getDocumentDetails` to fetch the document directly and confirm its `name` and `epubContent`.
   *   **Concept coverage**: `createDocument` action, `_getLibraryByUser` query, `_getDocumentDetails` query, document state.

---

**4. `createDocument: should allow different documents with same epubContent but different names`**
   *   **What it tests**: This test clarifies an important behavior regarding `epubContent`. It shows that the system allows multiple distinct document entries in the database even if their binary content is identical, as long as their *names* are unique within the library.
   *   **Validation**:
        *   It creates a second document with the *same* `epubContent1` but a *different* name ("Book Two") in Alice's library.
        *   It asserts no error and that a new document ID (`doc2Id`) is returned.
        *   It then verifies that Alice's library now contains two distinct document IDs.
   *   **Concept coverage**: `createDocument` action's handling of `epubContent` and `name` uniqueness.

---

**5. `createDocument: should not add a document with a duplicate name in the same library`**
   *   **What it tests**: This validates the `requires` precondition of `createDocument`: "a document with `name` does not already exist in the given `library`".
   *   **Validation**:
        *   It attempts to create a document with the name "Book One" (which already exists in Alice's library due to previous tests) and `epubContent2`.
        *   It asserts that an `error` is returned, specifically noting the duplicate name within the library.
   *   **Concept coverage**: `createDocument` action's precondition logic (name uniqueness within a library).

---

**6. `createDocument: should not add a document to a non-existent library`**
   *   **What it tests**: This validates another `requires` precondition of `createDocument`: "library exists".
   *   **Validation**:
        *   It attempts to call `createDocument` with a `library` ID that does not exist.
        *   It asserts that an `error` is returned, indicating the library was not found.
   *   **Concept coverage**: `createDocument` action's precondition logic (library existence).

---

**7. `renameDocument: should rename an existing document`**
   *   **What it tests**: This is the positive test for the `renameDocument` action.
   *   **Validation**:
        *   It calls `renameDocument` for `doc1Id` (owned by `userAlice`) with a new name "First Book".
        *   It asserts no error and that the `doc1Id` is returned.
        *   It then uses `_getDocumentDetails` to verify that `doc1Id`'s name in the `documents` collection has been updated.
   *   **Concept coverage**: `renameDocument` action, `_getDocumentDetails` query.

---

**8. `renameDocument: should not rename a document to an already existing name in the same library`**
   *   **What it tests**: This validates a crucial `requires` precondition of `renameDocument`: "newName is not the name of an existing document with `user=user` (excluding the document being renamed)".
   *   **Validation**:
        *   It attempts to rename `doc1Id` to "Book Two", which is the current name of `doc2Id` within Alice's library.
        *   It asserts that an `error` is returned, indicating the duplicate name.
   *   **Concept coverage**: `renameDocument` action's precondition logic (name uniqueness for renaming).

---

**9. `openDocument: should successfully 'open' a document for a user who owns it`**
   *   **What it tests**: This is a positive test for the `openDocument` action, focusing on access validation.
   *   **Validation**:
        *   It calls `openDocument` for `userAlice` and `doc1Id` (which Alice owns).
        *   It asserts no error and that the `doc1Id` is returned.
        *   *Note*: Since the concept doesn't store an explicit "open" status, the success of this action primarily means the user is authorized to access the document.
   *   **Concept coverage**: `openDocument` action, access control logic (user ownership).

---

**10. `openDocument: should fail to 'open' a document if user does not own it`**
    *   **What it tests**: This validates the `requires` precondition of `openDocument`: "user is in a library with `document`". Specifically, it tests unauthorized access.
    *   **Validation**:
        *   It first creates a library for `userBob` and then attempts to call `openDocument` with `userBob` trying to open `doc1Id` (which belongs to Alice).
        *   It asserts that an `error` is returned, indicating Bob does not have access to Alice's document.
   *   **Concept coverage**: `openDocument` action's precondition logic, separation of user libraries.

---

**11. `closeDocument: should successfully 'close' a document for a user who owns it`**
    *   **What it tests**: This is a positive test for the `closeDocument` action, similar to `openDocument` in its validation focus.
    *   **Validation**:
        *   It calls `closeDocument` for `userAlice` and `doc1Id`.
        *   It asserts no error and that the `doc1Id` is returned.
        *   *Note*: Similar to `openDocument`, the success means the user is authorized to "close" it (i.e., stop active access).
   *   **Concept coverage**: `closeDocument` action, access control logic (user ownership).

---

**12. `removeDocument: should remove an existing document from the library and collection`**
    *   **What it tests**: This is a positive test for the `removeDocument` action, verifying a cascade-like deletion behavior.
    *   **Validation**:
        *   It calls `removeDocument` for `doc1Id` from `aliceLibraryId`.
        *   It asserts no error.
        *   It then verifies that `doc1Id` is no longer present in Alice's library's `documents` list.
        *   Crucially, it also uses `_getDocumentDetails` to confirm that the document itself has been deleted from the `documents` collection.
   *   **Concept coverage**: `removeDocument` action, integrity of `documents` collection and `LibraryDoc.documents` array.

---

**13. `removeDocument: should not remove a document if not in the specified library`**
    *   **What it tests**: This validates the `requires` precondition of `removeDocument`: "document is in library".
    *   **Validation**:
        *   It creates a new library and document for `userBob`.
        *   It then attempts to call `removeDocument` to remove `bobDocId` from `aliceLibraryId`.
        *   It asserts that an `error` is returned, indicating the document is not in the specified library.
   *   **Concept coverage**: `removeDocument` action's precondition logic.

---

**14. `Principle Trace: A user can upload documents, view, remove, or open them.`**
    *   **What it tests**: This is a high-level, end-to-end scenario test that simulates the "principle" described in the concept specification. It combines multiple actions to demonstrate the core user journey.
    *   **Validation**:
        *   **Creates a library**: Calls `createLibrary` for a `testUser`.
        *   **Uploads two documents**: Calls `createDocument` twice, verifying successful upload and presence in the library.
        *   **Views documents**: Uses `_getDocumentsInLibrary` to check if both documents are visible.
        *   **Opens a document**: Calls `openDocument` for one of the documents.
        *   **Renames a document**: Calls `renameDocument` on an opened document.
        *   **Closes a document**: Calls `closeDocument` on the renamed document.
        *   **Removes a document**: Calls `removeDocument` for one of the documents.
        *   **Views remaining documents**: Uses `_getDocumentsInLibrary` again to confirm only the expected document remains.
   *   **Concept coverage**: This test provides integration-level confidence across `createLibrary`, `createDocument`, `_getDocumentsInLibrary`, `openDocument`, `renameDocument`, `closeDocument`, and `removeDocument`, demonstrating how they collectively fulfill the concept's principle. It acts as a "smoke test" for the entire concept's core functionality.

---

In summary, the tests cover individual action success, their preconditions, and then integrate them into a larger flow to confirm the overall purpose and principle of the `Library` concept. The use of queries (`_getLibraryByUser`, `_getDocumentsInLibrary`, `_getDocumentDetails`) is crucial for verifying the state changes after actions.

# Prompt: please update the above testing suite to use check or x emojis when a test passes or fails
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

1.  **`try` Block (Success Path)**:
    *   The test logic (actions, assertions, and intermediate `console.log` statements) remains within the `try` block.
    *   If all assertions pass and the block completes without throwing an error, a `console.log` statement is executed at the very end of the `try` block, displaying `✅ Test Passed: [Description of what passed].` This explicitly marks the step's success in the custom output.

2.  **`catch` Block (Failure Path)**:
    *   If any assertion fails or an unexpected error occurs within the `try` block, the `catch` block is executed.
    *   Inside the `catch` block, `console.error` is used to display `❌ Test Failed: [Description of what failed]. Error: [error message]`. This immediately signals the failure.
    *   Crucially, `throw e;` is used to re-throw the caught error. This ensures that Deno's native test runner still registers the test as a failure and provides its full stack trace, preventing the custom logging from hiding actual test failures.

**Specific Adjustments:**

*   **Refined `console.log` messages**: I've adjusted the intermediate `console.log` statements to be more concise and to clearly indicate "Running:" an action or "Verification:" a state, separating them from the final pass/fail emoji message.
*   **Setup/Cleanup**: For tests involving `userBob` or the `Principle Trace`, explicit `finally` blocks have been added to ensure proper cleanup of any created data (libraries, documents) regardless of test outcome, maintaining test isolation.
*   **Test Descriptions**: The emoji messages now explicitly state what passed or failed, making the output more informative at a glance.

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

# Prompt: I'm getting an error that testLibraryId, docId1 and 2 are being used before they are defined (in the finally section). Also type of e is unknown
# response:

You're absolutely right! That's a classic scope issue in JavaScript/TypeScript, especially when dealing with `try...catch...finally` blocks. Variables declared with `const` or `let` *inside* a `try` block are not accessible in the `finally` block if the `try` block exits early (e.g., due to an error before they are assigned).

Also, the `e` in `catch (e)` is typed as `unknown` by default in modern TypeScript, requiring explicit type checking or assertion if you want to access properties like `e.message`.

Let's fix these issues in your `LibraryConcept.test.ts` file.

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
    } catch (e: unknown) { // Explicitly mark e as unknown
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: createLibrary for Alice.", errorMessage);
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
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: Duplicate library creation prevention.", errorMessage);
      throw e;
    }
  });

  let aliceLibraryId: ID | undefined; // Declare outside step
  await t.step("Setup: Get Alice's Library ID for subsequent tests", async () => {
    try {
      console.log("  Running: Retrieve Alice's library ID.");
      const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
      aliceLibraryId = fetchedLibrary[0].library!._id;
      assertEquals(typeof aliceLibraryId, "string", "Verification: Alice's library ID retrieved.");
      console.log(`  ✅ Setup Complete: Alice's Library ID is ${aliceLibraryId}.`);
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Setup Failed: Could not retrieve Alice's library ID.", errorMessage);
      throw e;
    }
  });

  let doc1Id: ID | undefined; // Declare outside step
  let doc2Id: ID | undefined; // Declare outside step
  await t.step("createDocument: should add a new document to an existing library", async () => {
    try {
      console.log("  Running: createDocument('Book One', epubContent1, library: Alice's)");
      const result = await concept.createDocument({
        name: "Book One",
        epubContent: epubContent1,
        library: aliceLibraryId!, // Use non-null assertion as it's set in setup
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
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: createDocument 'Book One'.", errorMessage);
      throw e;
    }
  });

  await t.step("createDocument: should allow different documents with same epubContent but different names", async () => {
    try {
      console.log("  Running: createDocument('Book Two', epubContent1, library: Alice's)");
      const result = await concept.createDocument({
        name: "Book Two",
        epubContent: epubContent1,
        library: aliceLibraryId!,
      });
      assertEquals(result.error, undefined, "Expected no error.");
      doc2Id = result.document!;
      assertEquals(typeof doc2Id, "string", "Expected a document ID.");

      const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
      assertEquals(fetchedLibrary[0].library?.documents.includes(doc2Id), true, "Verification: Second document in library.");
      assertEquals(fetchedLibrary[0].library?.documents.length, 2, "Verification: Library has two documents.");
      console.log("  ✅ Test Passed: 'Book Two' created with same content, different name.");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: createDocument 'Book Two'.", errorMessage);
      throw e;
    }
  });

  await t.step("createDocument: should not add a document with a duplicate name in the same library", async () => {
    try {
      console.log("  Running: createDocument('Book One', epubContent2, library: Alice's) (duplicate name, expected failure)");
      const result = await concept.createDocument({
        name: "Book One",
        epubContent: epubContent2,
        library: aliceLibraryId!,
      });
      assertEquals(result.error, `Document with name 'Book One' already exists in library ${aliceLibraryId}.`, "Expected error for duplicate document name in library.");
      console.log("  ✅ Test Passed: Duplicate name within library correctly prevented.");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: Duplicate name prevention.", errorMessage);
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
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: Creation to non-existent library.", errorMessage);
      throw e;
    }
  });

  await t.step("renameDocument: should rename an existing document", async () => {
    try {
      console.log("  Running: renameDocument(user: Alice, newName: 'First Book', document: doc1Id)");
      const result = await concept.renameDocument({
        user: userAlice,
        newName: "My First Book", // Changed name to avoid conflict with "First Book" example
        document: doc1Id!,
      });
      assertEquals(result.error, undefined, "Expected no error.");
      assertEquals(result.document, doc1Id, "Expected the document ID.");

      const fetchedDoc = await concept._getDocumentDetails({ document: doc1Id! });
      assertEquals(fetchedDoc[0].document?.name, "My First Book", "Verification: Document name updated.");
      console.log("  ✅ Test Passed: Document renamed successfully.");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: Document rename.", errorMessage);
      throw e;
    }
  });

  await t.step("renameDocument: should not rename a document to an already existing name in the same library", async () => {
    try {
      console.log("  Running: renameDocument(user: Alice, newName: 'Book Two', document: doc1Id) (duplicate name, expected failure)");
      const result = await concept.renameDocument({
        user: userAlice,
        newName: "Book Two", // doc2 has this name
        document: doc1Id!,
      });
      assertEquals(result.error, `Document with name 'Book Two' already exists in user ${userAlice}'s library.`, "Expected error for duplicate name.");
      console.log("  ✅ Test Passed: Renaming to duplicate name correctly prevented.");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: Renaming to duplicate name.", errorMessage);
      throw e;
    }
  });

  await t.step("openDocument: should successfully 'open' a document for a user who owns it", async () => {
    try {
      console.log("  Running: openDocument(user: Alice, document: doc1Id)");
      const result = await concept.openDocument({ user: userAlice, document: doc1Id! });
      assertEquals(result.error, undefined, "Expected no error.");
      assertEquals(result.document, doc1Id, "Expected the document ID.");
      console.log("  ✅ Test Passed: Document 'My First Book' successfully 'opened' by Alice.");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: Open document by owner.", errorMessage);
      throw e;
    }
  });

  await t.step("openDocument: should fail to 'open' a document if user does not own it", async () => {
    let bobLibraryId: ID | undefined; // Declare outside try block
    try {
      console.log("  Setup: createLibrary(user: Bob)");
      const bobLibraryResult = await concept.createLibrary({ user: userBob });
      bobLibraryId = bobLibraryResult.library!;

      console.log("  Running: openDocument(user: Bob, document: doc1Id) (owned by Alice, expected failure)");
      const result = await concept.openDocument({ user: userBob, document: doc1Id! });
      assertEquals(result.error, `Document ${doc1Id} does not exist or is not in user ${userBob}'s library.`, "Expected error for unauthorized access.");
      console.log("  ✅ Test Passed: Unauthorized document access correctly prevented.");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: Unauthorized document access.", errorMessage);
      throw e;
    } finally {
      if (bobLibraryId) {
        // Find documents in Bob's library and delete them first, then delete the library
        const bobLibraryDocs = await concept.documents.find({ _id: { $in: (await concept.libraries.findOne({ _id: bobLibraryId }))?.documents || [] } }).toArray();
        for (const doc of bobLibraryDocs) {
          await concept.documents.deleteOne({ _id: doc._id });
        }
        await concept.libraries.deleteOne({ _id: bobLibraryId });
      }
    }
  });

  await t.step("closeDocument: should successfully 'close' a document for a user who owns it", async () => {
    try {
      console.log("  Running: closeDocument(user: Alice, document: doc1Id)");
      const result = await concept.closeDocument({ user: userAlice, document: doc1Id! });
      assertEquals(result.error, undefined, "Expected no error.");
      assertEquals(result.document, doc1Id, "Expected the document ID.");
      console.log("  ✅ Test Passed: Document 'My First Book' successfully 'closed' by Alice.");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: Close document by owner.", errorMessage);
      throw e;
    }
  });

  await t.step("removeDocument: should remove an existing document from the library and collection", async () => {
    try {
      console.log("  Running: removeDocument(library: Alice's, document: doc1Id)");
      const result = await concept.removeDocument({ library: aliceLibraryId!, document: doc1Id! });
      assertEquals(result.error, undefined, "Expected no error.");

      const fetchedLibrary = await concept._getLibraryByUser({ user: userAlice });
      assertEquals(fetchedLibrary[0].library?.documents.includes(doc1Id!), false, "Verification: Document 1 removed from library.");
      assertEquals(fetchedLibrary[0].library?.documents.length, 1, "Verification: Library has one document (doc2).");

      const fetchedDoc = await concept._getDocumentDetails({ document: doc1Id! });
      assertEquals(fetchedDoc[0].error, `Document ${doc1Id} does not exist.`, "Verification: Document 1 no longer exists.");
      console.log("  ✅ Test Passed: Document 'My First Book' removed and verified.");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: Document removal.", errorMessage);
      throw e;
    }
  });

  await t.step("removeDocument: should not remove a document if not in the specified library", async () => {
    let bobLibraryId: ID | undefined; // Declare outside try block
    let bobDocId: ID | undefined; // Declare outside try block
    try {
      console.log("  Setup: createLibrary(user: Bob) and create a document for Bob");
      const bobLibraryResult = await concept.createLibrary({ user: userBob });
      bobLibraryId = bobLibraryResult.library!;
      const bobDocResult = await concept.createDocument({ name: "Bob's Book", epubContent: epubContent2, library: bobLibraryId });
      bobDocId = bobDocResult.document!;

      console.log("  Running: removeDocument(library: Alice's, document: bobDocId) (not in Alice's library, expected failure)");
      const result = await concept.removeDocument({ library: aliceLibraryId!, document: bobDocId });
      assertEquals(result.error, `Document ${bobDocId} is not in library ${aliceLibraryId}.`, "Expected error for document not in library.");
      console.log("  ✅ Test Passed: Removal of document not in specified library correctly prevented.");
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("  ❌ Test Failed: Removal of document not in library.", errorMessage);
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
    let testLibraryId: ID | undefined; // Declare outside try block
    let docId1: ID | undefined; // Declare outside try block
    let docId2: ID | undefined; // Declare outside try block

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
    } catch (e: unknown) {
      const errorMessage = e instanceof Error ? e.message : String(e);
      console.error("--- ❌ Principle Trace Simulation Failed ---", errorMessage);
      throw e;
    } finally {
      // Cleanup for principle trace. Check if IDs are defined before attempting removal.
      if (testLibraryId && docId1) await concept.removeDocument({ library: testLibraryId, document: docId1 });
      if (testLibraryId && docId2) await concept.removeDocument({ library: testLibraryId, document: docId2 });
      // Ensure the library itself is removed if it was created
      if (testLibraryId) await concept.libraries.deleteOne({ _id: testLibraryId });
    }
  });

  console.log("Library Concept Tests Complete.");

  await client.close();
});
```

### Summary of Changes:

1.  **Variable Declaration Scope:**
    *   For `aliceLibraryId`, `doc1Id`, `doc2Id`, `bobLibraryId`, and `bobDocId`, I've moved their `let` declarations *outside* the `t.step` function scope or the immediate `try...catch` block. This makes them accessible in `finally` blocks and subsequent test steps. They are initialized to `undefined` or inferred as such.
    *   Non-null assertion operator (`!`) is used where appropriate (`aliceLibraryId!`) to tell TypeScript that the variable will definitely be assigned a value before that point in the execution flow.
2.  **`catch` Block `e` Type:**
    *   Changed `catch (e)` to `catch (e: unknown)`.
    *   Added `const errorMessage = e instanceof Error ? e.message : String(e);` to safely extract a string message from the `unknown` error type, which is then used in the `console.error` output.
3.  **Refined Cleanup in `finally`**:
    *   Added checks (`if (variableId)`) before attempting to use the IDs in `finally` blocks, to prevent errors if the variable was not successfully assigned due to an earlier failure in the `try` block.
    *   For `openDocument: should fail to 'open' a document if user does not own it` test, the `finally` block was slightly adjusted to delete documents associated with Bob's library first, then delete Bob's library itself, ensuring a cleaner state.

These changes make the test suite more robust against unexpected errors during execution and align with modern TypeScript best practices for error handling and variable scoping.