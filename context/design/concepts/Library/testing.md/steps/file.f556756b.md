---
timestamp: 'Thu Oct 23 2025 02:01:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_020154.3d22c995.md]]'
content_id: f556756bb4ace1df09eb86ea909d24bcb035cca9e774d4102530162ccfaeab94
---

# file: src/Library/LibraryConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertRejects } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts"; // Assuming testDb provides a mockable interface

// Mock User and BinaryData for polymorphic types
type User = string;
type DocumentContent = string; // Simulating BinaryData

// Mock implementation of the Library Concept for testing purposes
class MockLibraryConcept {
  private libraries: Map<User, { id: string; user: User; documents: Set<string> }> = new Map();
  private documents: Map<string, { id: string; name: string; epubContent: DocumentContent }> = new Map();
  // Helper to quickly check for document name uniqueness within a user's library
  private docNameToIdMap: Map<User, Map<string, string>> = new Map();
  private nextLibraryId = 1;
  private nextDocumentId = 1;

  constructor(private db: any) {
    // `db` is passed to conform to `testDb` usage, but not actively used in this in-memory mock.
  }

  // Helper to get library ID by user
  private getLibraryIdForUser(user: User): string | undefined {
    const lib = this.libraries.get(user);
    return lib ? lib.id : undefined;
  }

  // Helper to find the user associated with a given library ID
  private getUserByLibraryId(libraryId: string): User | undefined {
    for (const lib of this.libraries.values()) {
      if (lib.id === libraryId) {
        return lib.user;
      }
    }
    return undefined;
  }

  // ACTIONS

  async createLibrary(user: User): Promise<{ library: string } | { error: string }> {
    console.log(`  ACTION: createLibrary(user: '${user}')`);
    // requires: user is not already associated with a library
    if (this.libraries.has(user)) {
      const error = `User '${user}' is already associated with a library.`;
      console.log(`    REJECTED: ${error}`);
      return { error };
    }

    const libraryId = `lib-${this.nextLibraryId++}`;
    const newLibrary = { id: libraryId, user, documents: new Set<string>() };
    this.libraries.set(user, newLibrary);
    this.docNameToIdMap.set(user, new Map()); // Initialize document name map for this user

    console.log(`    EFFECT: Created library '${libraryId}' for user '${user}'.`);
    return { library: libraryId };
  }

  async createDocument(name: string, epubContent: DocumentContent, libraryId: string): Promise<{ document: string } | { error: string }> {
    console.log(`  ACTION: createDocument(name: '${name}', content: ${epubContent.substring(0, Math.min(epubContent.length, 10))}..., libraryId: '${libraryId}')`);

    const targetLibraryEntry = Array.from(this.libraries.values()).find(lib => lib.id === libraryId);
    if (!targetLibraryEntry) {
      const error = `Library '${libraryId}' does not exist.`;
      console.log(`    REJECTED: ${error}`);
      return { error };
    }

    const userForLibrary = targetLibraryEntry.user;
    const userDocNames = this.docNameToIdMap.get(userForLibrary);

    // requires: a document with name does not already exist in the given library
    if (userDocNames?.has(name)) {
      const error = `Document with name '${name}' already exists in library '${libraryId}'.`;
      console.log(`    REJECTED: ${error}`);
      return { error };
    }

    const documentId = `doc-${this.nextDocumentId++}`;
    const newDocument = { id: documentId, name, epubContent };
    this.documents.set(documentId, newDocument);
    targetLibraryEntry.documents.add(documentId);
    userDocNames?.set(name, documentId); // Update the name-to-id map for this user

    console.log(`    EFFECT: Created document '${documentId}' (name: '${name}') in library '${libraryId}'.`);
    return { document: documentId };
  }

  async removeDocument(libraryId: string, documentId: string): Promise<{ success: boolean } | { error: string }> {
    console.log(`  ACTION: removeDocument(libraryId: '${libraryId}', documentId: '${documentId}')`);

    const targetLibraryEntry = Array.from(this.libraries.values()).find(lib => lib.id === libraryId);
    if (!targetLibraryEntry) {
      const error = `Library '${libraryId}' does not exist.`;
      console.log(`    REJECTED: ${error}`);
      return { error };
    }

    // requires: library exists and document is in library
    if (!targetLibraryEntry.documents.has(documentId)) {
      const error = `Document '${documentId}' is not in library '${libraryId}'.`;
      console.log(`    REJECTED: ${error}`);
      return { error };
    }

    const docToRemove = this.documents.get(documentId);
    if (!docToRemove) {
      const error = `Document '${documentId}' does not exist globally.`; // Should ideally be caught by previous check, but for robustness
      console.log(`    REJECTED: ${error}`);
      return { error };
    }

    targetLibraryEntry.documents.delete(documentId);
    this.documents.delete(documentId);
    this.docNameToIdMap.get(targetLibraryEntry.user)?.delete(docToRemove.name); // Remove from name-to-id map

    console.log(`    EFFECT: Removed document '${documentId}' (name: '${docToRemove.name}') from library '${libraryId}' and global documents.`);
    return { success: true }; // Returning non-empty for success, as per spec recommendations
  }

  async renameDocument(user: User, newName: string, documentId: string): Promise<{ document: string } | { error: string }> {
    console.log(`  ACTION: renameDocument(user: '${user}', newName: '${newName}', documentId: '${documentId}')`);

    const userLibrary = this.libraries.get(user);
    if (!userLibrary) {
      const error = `User '${user}' does not have a library.`;
      console.log(`    REJECTED: ${error}`);
      return { error };
    }

    const targetDocument = this.documents.get(documentId);
    if (!targetDocument) {
      const error = `Document '${documentId}' does not exist globally.`;
      console.log(`    REJECTED: ${error}`);
      return { error };
    }

    // requires: document has user=user
    if (!userLibrary.documents.has(documentId)) {
      const error = `Document '${documentId}' does not belong to user '${user}'s library.`;
      console.log(`    REJECTED: ${error}`);
      return { error };
    }

    // requires: newName is not the name of an existing document with user=user
    const userDocNames = this.docNameToIdMap.get(user);
    if (userDocNames?.has(newName) && userDocNames.get(newName) !== documentId) {
      const error = `Document with name '${newName}' already exists for user '${user}'.`;
      console.log(`    REJECTED: ${error}`);
      return { error };
    }

    const oldName = targetDocument.name;
    // Update name
    targetDocument.name = newName;
    userDocNames?.delete(oldName); // Remove old name mapping
    userDocNames?.set(newName, documentId); // Add new name mapping

    console.log(`    EFFECT: Renamed document '${documentId}' from '${oldName}' to '${newName}' for user '${user}'.`);
    return { document: documentId };
  }

  async openDocument(user: User, documentId: string): Promise<{ document: string } | { error: string }> {
    console.log(`  ACTION: openDocument(user: '${user}', documentId: '${documentId}')`);
    const userLibrary = this.libraries.get(user);
    if (!userLibrary || !userLibrary.documents.has(documentId)) {
      const error = `Document '${documentId}' is not in user '${user}'s library.`;
      console.log(`    REJECTED: ${error}`);
      return { error };
    }
    // As per concept definition, 'open' and 'close' primarily validate access.
    // No state change is explicitly defined within this concept for these actions beyond validation.
    console.log(`    EFFECT: Document '${documentId}' successfully 'opened' for user '${user}'. (No observable state change in this concept for 'open').`);
    return { document: documentId };
  }

  async closeDocument(user: User, documentId: string): Promise<{ document: string } | { error: string }> {
    console.log(`  ACTION: closeDocument(user: '${user}', documentId: '${documentId}')`);
    const userLibrary = this.libraries.get(user);
    if (!userLibrary || !userLibrary.documents.has(documentId)) {
      const error = `Document '${documentId}' is not in user '${user}'s library.`;
      console.log(`    REJECTED: ${error}`);
      return { error };
    }
    console.log(`    EFFECT: Document '${documentId}' successfully 'closed' for user '${user}'. (No observable state change in this concept for 'close').`);
    return { document: documentId };
  }

  // QUERY HELPERS (for verifying effects)
  async getLibraryByUserId(userId: User) {
    return this.libraries.get(userId);
  }

  async getDocumentById(docId: string) {
    return this.documents.get(docId);
  }

  async getDocumentsInLibrary(libraryId: string) {
    const targetLibrary = Array.from(this.libraries.values()).find(lib => lib.id === libraryId);
    if (!targetLibrary) return new Set<string>();
    return targetLibrary.documents;
  }

  async getAllDocuments() {
    return Array.from(this.documents.values());
  }
}

Deno.test("Library Concept", async (t) => {
  // `testDb` is used to simulate the database connection lifecycle,
  // though for this mock implementation, `db` is not actively used.
  const [db, client] = await testDb();
  const libraryConcept = new MockLibraryConcept(db);

  await t.step("createLibrary action", async (st) => {
    const user1: User = "user-alice";
    const user2: User = "user-bob";

    console.log("\n--- Testing createLibrary: Valid creation ---");
    const result1 = await libraryConcept.createLibrary(user1);
    assertExists((result1 as { library: string }).library, "Should return library ID on successful creation.");
    const lib1Id = (result1 as { library: string }).library;
    const createdLibrary1 = await libraryConcept.getLibraryByUserId(user1);
    assertExists(createdLibrary1, "Library should exist for user1.");
    assertEquals(createdLibrary1?.user, user1, "Library's user should match input user.");
    assertEquals(createdLibrary1?.documents.size, 0, "New library should have an empty set of documents.");

    console.log("\n--- Testing createLibrary: Duplicate user (failure) ---");
    const resultDuplicate = await libraryConcept.createLibrary(user1);
    assertExists((resultDuplicate as { error: string }).error, "Should return an error for duplicate user.");
    assertEquals((resultDuplicate as { error: string }).error, `User '${user1}' is already associated with a library.`, "Error message should indicate duplicate user.");

    console.log("\n--- Testing createLibrary: Another valid creation ---");
    const result2 = await libraryConcept.createLibrary(user2);
    assertExists((result2 as { library: string }).library, "Should return library ID for a different user.");
    const lib2Id = (result2 as { library: string }).library;
    const createdLibrary2 = await libraryConcept.getLibraryByUserId(user2);
    assertExists(createdLibrary2, "Library should exist for user2.");
    assertEquals(createdLibrary2?.user, user2, "Library's user should match input user.");
    assertEquals(createdLibrary2?.documents.size, 0, "New library should have an empty set of documents.");
  });

  await t.step("createDocument action", async (st) => {
    const user1: User = "user-alice";
    const user1Library = await libraryConcept.getLibraryByUserId(user1);
    const lib1Id = user1Library!.id; // Assume lib1Id exists from previous step
    const epubContent1: DocumentContent = "BinaryData for Book1";
    const epubContent2: DocumentContent = "BinaryData for Book2";
    const epubContent3: DocumentContent = "BinaryData for another Book1 (different content)";

    console.log("\n--- Testing createDocument: Valid creation ---");
    const result1 = await libraryConcept.createDocument("Book 1", epubContent1, lib1Id);
    assertExists((result1 as { document: string }).document, "Should return document ID on successful creation.");
    const doc1Id = (result1 as { document: string }).document;
    const createdDoc1 = await libraryConcept.getDocumentById(doc1Id);
    assertExists(createdDoc1, "Document should exist.");
    assertEquals(createdDoc1?.name, "Book 1", "Document name should match.");
    assertEquals(createdDoc1?.epubContent, epubContent1, "Document content should match.");
    assertEquals((await libraryConcept.getDocumentsInLibrary(lib1Id)).has(doc1Id), true, "Document should be in library's documents set.");

    console.log("\n--- Testing createDocument: Duplicate name in same library (failure) ---");
    const resultDuplicateName = await libraryConcept.createDocument("Book 1", epubContent2, lib1Id);
    assertExists((resultDuplicateName as { error: string }).error, "Should return an error for duplicate document name in the same library.");
    assertEquals((resultDuplicateName as { error: string }).error, `Document with name 'Book 1' already exists in library '${lib1Id}'.`, "Error message should indicate duplicate name.");

    console.log("\n--- Testing createDocument: Valid creation with different content but unique name ---");
    // The concept notes allow multiple documents with same epubContent but different names.
    const result2 = await libraryConcept.createDocument("Book 1 - Version 2", epubContent3, lib1Id);
    assertExists((result2 as { document: string }).document, "Should create document with unique name despite content similarity.");
    const doc2Id = (result2 as { document: string }).document;
    assertNotEquals(doc1Id, doc2Id, "Should create a new document with a different ID.");
    assertEquals((await libraryConcept.getDocumentsInLibrary(lib1Id)).has(doc2Id), true, "Second document should be in library.");

    console.log("\n--- Testing createDocument: Non-existent library (failure) ---");
    const resultNonExistentLib = await libraryConcept.createDocument("Ghost Book", "Ghost Content", "non-existent-lib-id");
    assertExists((resultNonExistentLib as { error: string }).error, "Should return an error for non-existent library.");
    assertEquals((resultNonExistentLib as { error: string }).error, `Library 'non-existent-lib-id' does not exist.`, "Error message should indicate non-existent library.");
  });

  await t.step("removeDocument action", async (st) => {
    const user1: User = "user-alice";
    const user1Library = await libraryConcept.getLibraryByUserId(user1);
    const lib1Id = user1Library!.id;
    // Expect Book 1 - Version 2 (doc2Id) to exist from previous steps in Alice's library
    const allDocs = await libraryConcept.getAllDocuments();
    const doc2 = allDocs.find(d => d.name === "Book 1 - Version 2")!;
    const doc2Id = doc2.id;

    console.log("\n--- Testing removeDocument: Valid removal ---");
    let initialLibDocs = await libraryConcept.getDocumentsInLibrary(lib1Id);
    assertEquals(initialLibDocs.has(doc2Id), true, "Document 2 should initially be in the library.");
    assertEquals((await libraryConcept.getDocumentById(doc2Id))?.id, doc2Id, "Document 2 should initially exist globally.");

    const removeResult = await libraryConcept.removeDocument(lib1Id, doc2Id);
    assertExists((removeResult as { success: boolean }).success, "Should return success on successful removal.");
    assertEquals((removeResult as { success: boolean }).success, true, "Successful removal should return true for success.");

    let afterRemovalLibDocs = await libraryConcept.getDocumentsInLibrary(lib1Id);
    assertEquals(afterRemovalLibDocs.has(doc2Id), false, "Document 2 should be removed from library's documents set.");
    assertEquals(await libraryConcept.getDocumentById(doc2Id), undefined, "Document 2 should be removed from global documents.");

    console.log("\n--- Testing removeDocument: Document not in specified library (failure) ---");
    const user2: User = "user-bob";
    const user2Library = await libraryConcept.getLibraryByUserId(user2);
    const lib2Id = user2Library!.id;
    const result3 = await libraryConcept.createDocument("Book for Bob", "Bob's content", lib2Id);
    const doc3Id = (result3 as { document: string }).document;

    const removeWrongLibResult = await libraryConcept.removeDocument(lib1Id, doc3Id); // Alice trying to remove Bob's book
    assertExists((removeWrongLibResult as { error: string }).error, "Should return an error if document is not in the specified library.");
    assertEquals((removeWrongLibResult as { error: string }).error, `Document '${doc3Id}' is not in library '${lib1Id}'.`, "Error message should indicate document not in library.");

    console.log("\n--- Testing removeDocument: Non-existent document (failure) ---");
    const removeNonExistentResult = await libraryConcept.removeDocument(lib1Id, "non-existent-doc-id");
    assertExists((removeNonExistentResult as { error: string }).error, "Should return an error for a non-existent document in the library.");
    assertEquals((removeNonExistentResult as { error: string }).error, `Document 'non-existent-doc-id' is not in library '${lib1Id}'.`, "Error message should indicate document not in library.");

    console.log("\n--- Testing removeDocument: Non-existent library (failure) ---");
    const removeNonExistentLibResult = await libraryConcept.removeDocument("non-existent-lib-id", doc3Id);
    assertExists((removeNonExistentLibResult as { error: string }).error, "Should return an error for a non-existent library.");
    assertEquals((removeNonExistentLibResult as { error: string }).error, `Library 'non-existent-lib-id' does not exist.`, "Error message should indicate non-existent library.");
  });

  await t.step("renameDocument action", async (st) => {
    const user1: User = "user-alice";
    // Need to create a fresh document for Alice as previous one was removed
    const user1Library = await libraryConcept.getLibraryByUserId(user1);
    const lib1Id = user1Library!.id;
    const createDocResult = await libraryConcept.createDocument("Alice's Initial Book", "Initial content", lib1Id);
    const docIdToRename = (createDocResult as { document: string }).document;

    console.log("\n--- Testing renameDocument: Valid rename ---");
    const newName1 = "Alice's Awesome Book";
    const renameResult1 = await libraryConcept.renameDocument(user1, newName1, docIdToRename);
    assertExists((renameResult1 as { document: string }).document, "Should return document ID on successful rename.");
    const renamedDoc1 = await libraryConcept.getDocumentById(docIdToRename);
    assertEquals(renamedDoc1?.name, newName1, "Document name should be updated.");
    assertEquals(libraryConcept.docNameToIdMap.get(user1)?.has(newName1), true, "New name should be mapped for the user.");
    assertEquals(libraryConcept.docNameToIdMap.get(user1)?.has("Alice's Initial Book"), false, "Old name mapping should be removed.");

    console.log("\n--- Testing renameDocument: Rename to existing name in user's library (failure) ---");
    const resultDocOther = await libraryConcept.createDocument("Alice's Other Book", "content", lib1Id);
    const docOtherId = (resultDocOther as { document: string }).document;

    const renameResultToExisting = await libraryConcept.renameDocument(user1, newName1, docOtherId);
    assertExists((renameResultToExisting as { error: string }).error, "Should return an error when renaming to an existing name.");
    assertEquals((renameResultToExisting as { error: string }).error, `Document with name '${newName1}' already exists for user '${user1}'.`, "Error message should indicate existing name.");
    
    // Ensure the document was NOT renamed
    const docOtherAfterAttempt = await libraryConcept.getDocumentById(docOtherId);
    assertEquals(docOtherAfterAttempt?.name, "Alice's Other Book", "Document should retain its original name after failed rename.");


    console.log("\n--- Testing renameDocument: Document not belonging to user (failure) ---");
    const user2: User = "user-bob";
    const user2Library = await libraryConcept.getLibraryByUserId(user2);
    const lib2Id = user2Library!.id;
    const resultBobDoc = await libraryConcept.createDocument("Bob's Special Book", "Bob's content", lib2Id);
    const bobDocId = (resultBobDoc as { document: string }).document;

    const renameWrongUserResult = await libraryConcept.renameDocument(user1, "Bob's Book - New Name", bobDocId); // Alice trying to rename Bob's book
    assertExists((renameWrongUserResult as { error: string }).error, "Should return an error if document does not belong to the user.");
    assertEquals((renameWrongUserResult as { error: string }).error, `Document '${bobDocId}' does not belong to user '${user1}'s library.`, "Error message should indicate document ownership.");

    console.log("\n--- Testing renameDocument: Non-existent document (failure) ---");
    const renameNonExistentDoc = await libraryConcept.renameDocument(user1, "Non-Existent Book", "non-existent-doc-id");
    assertExists((renameNonExistentDoc as { error: string }).error, "Should return an error for a non-existent document.");
    assertEquals((renameNonExistentDoc as { error: string }).error, `Document 'non-existent-doc-id' does not exist globally.`, "Error message should indicate non-existent document.");

    console.log("\n--- Testing renameDocument: Non-existent user (failure) ---");
    const nonExistentUser: User = "user-charlie";
    const renameNonExistentUserResult = await libraryConcept.renameDocument(nonExistentUser, "Charlie's Book", docIdToRename);
    assertExists((renameNonExistentUserResult as { error: string }).error, "Should return an error for a non-existent user.");
    assertEquals((renameNonExistentUserResult as { error: string }).error, `User '${nonExistentUser}' does not have a library.`, "Error message should indicate non-existent user's library.");
  });

  // # trace:
  await t.step("Principle Trace: User manages documents in their library", async (st) => {
    console.log("\n--- PRINCIPLE TRACE START: User manages documents in their library ---");

    const principleUser: User = "user-principle";
    let principleLibId: string;
    let principleDoc1Id: string, principleDoc2Id: string;

    console.log("\n1. Create a library for the principle user.");
    const createLibResult = await libraryConcept.createLibrary(principleUser);
    assertExists((createLibResult as { library: string }).library, "Library creation should succeed.");
    principleLibId = (createLibResult as { library: string }).library;
    console.log(`   Library ID: ${principleLibId}`);
    assertExists(await libraryConcept.getLibraryByUserId(principleUser), "Library should exist for principle user.");

    console.log("\n2. User uploads their first document: 'My First Novel'.");
    const createDoc1Result = await libraryConcept.createDocument("My First Novel", "Content of Novel 1", principleLibId);
    assertExists((createDoc1Result as { document: string }).document, "Document creation should succeed.");
    principleDoc1Id = (createDoc1Result as { document: string }).document;
    console.log(`   Document ID 1: ${principleDoc1Id}`);
    assertEquals((await libraryConcept.getDocumentsInLibrary(principleLibId)).has(principleDoc1Id), true, "First document should be in the library.");
    assertEquals((await libraryConcept.getDocumentById(principleDoc1Id))?.name, "My First Novel", "First document name should be correct.");

    console.log("\n3. User uploads a second document: 'Tech Manual'.");
    const createDoc2Result = await libraryConcept.createDocument("Tech Manual", "Technical documentation content", principleLibId);
    assertExists((createDoc2Result as { document: string }).document, "Second document creation should succeed.");
    principleDoc2Id = (createDoc2Result as { document: string }).document;
    console.log(`   Document ID 2: ${principleDoc2Id}`);
    assertEquals((await libraryConcept.getDocumentsInLibrary(principleLibId)).has(principleDoc2Id), true, "Second document should be in the library.");
    assertEquals((await libraryConcept.getDocumentById(principleDoc2Id))?.name, "Tech Manual", "Second document name should be correct.");

    console.log("\n4. User decides to rename the first document from 'My First Novel' to 'My Renamed Novel'.");
    const newName = "My Renamed Novel";
    const renameResult = await libraryConcept.renameDocument(principleUser, newName, principleDoc1Id);
    assertExists((renameResult as { document: string }).document, "Document rename should succeed.");
    assertEquals((await libraryConcept.getDocumentById(principleDoc1Id))?.name, newName, "Document should reflect the new name.");
    console.log(`   Document 1 renamed to: '${newName}'`);

    console.log("\n5. User opens the renamed document 'My Renamed Novel' to read.");
    const openResult = await libraryConcept.openDocument(principleUser, principleDoc1Id);
    assertEquals((openResult as { document: string }).document, principleDoc1Id, "Opening document should succeed.");
    console.log(`   Opened document ID: ${principleDoc1Id}`);

    console.log("\n6. User closes the document.");
    const closeResult = await libraryConcept.closeDocument(principleUser, principleDoc1Id);
    assertEquals((closeResult as { document: string }).document, principleDoc1Id, "Closing document should succeed.");
    console.log(`   Closed document ID: ${principleDoc1Id}`);

    console.log("\n7. User decides to remove the second document: 'Tech Manual'.");
    const removeResult = await libraryConcept.removeDocument(principleLibId, principleDoc2Id);
    assertExists((removeResult as { success: boolean }).success, "Document removal should succeed.");
    assertEquals((removeResult as { success: boolean }).success, true, "Successful removal should return true for success.");
    assertEquals((await libraryConcept.getDocumentsInLibrary(principleLibId)).has(principleDoc2Id), false, "Second document should be removed from the library.");
    assertEquals(await libraryConcept.getDocumentById(principleDoc2Id), undefined, "Second document should be removed globally.");
    console.log(`   Removed document ID: ${principleDoc2Id}`);

    console.log("\n8. Verify only the renamed document remains in the library.");
    const remainingDocs = await libraryConcept.getDocumentsInLibrary(principleLibId);
    assertEquals(remainingDocs.size, 1, "Only one document should remain in the library.");
    assertEquals(remainingDocs.has(principleDoc1Id), true, "The renamed document should be the one remaining.");
    const finalDoc = await libraryConcept.getDocumentById(principleDoc1Id);
    assertEquals(finalDoc?.name, newName, "The remaining document should have its new name.");
    console.log(`   Remaining document: '${finalDoc?.name}' (${principleDoc1Id})`);

    console.log("\n--- PRINCIPLE TRACE END ---");
  });

  // Ensure the client is closed after all tests in this file
  await client.close();
});
```
