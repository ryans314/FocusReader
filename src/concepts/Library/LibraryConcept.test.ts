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

  await t.step(
    "createLibrary: should create a new library for a user",
    async () => {
      try {
        console.log("  Running: createLibrary(user: Alice)");
        const result = await concept.createLibrary({ user: userAlice });
        assertEquals(result.error, undefined, "Expected no error.");
        const libraryId = result.library;
        assertEquals(typeof libraryId, "string", "Expected a library ID.");

        const fetchedLibrary = await concept._getLibraryByUser({
          user: userAlice,
        });
        assertEquals(
          fetchedLibrary[0].library?.user,
          userAlice,
          "Verification: Library associated with Alice.",
        );
        assertEquals(
          fetchedLibrary[0].library?.documents.length,
          0,
          "Verification: New library has no documents.",
        );
        console.log(
          "  ✅ Test Passed: Library for Alice created and verified.",
        );
      } catch (e: unknown) { // Explicitly mark e as unknown
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Test Failed: createLibrary for Alice.",
          errorMessage,
        );
        throw e;
      }
    },
  );

  await t.step(
    "createLibrary: should not create a library if user already has one",
    async () => {
      try {
        console.log(
          "  Running: createLibrary(user: Alice) again (expected failure)",
        );
        const result = await concept.createLibrary({ user: userAlice });
        assertEquals(
          result.error,
          `User ${userAlice} already has a library.`,
          "Expected error for duplicate library.",
        );
        assertEquals(
          result.library,
          undefined,
          "Expected no library ID on error.",
        );
        console.log(
          "  ✅ Test Passed: Duplicate library creation correctly prevented.",
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Test Failed: Duplicate library creation prevention.",
          errorMessage,
        );
        throw e;
      }
    },
  );

  let aliceLibraryId: ID | undefined; // Declare outside step
  await t.step(
    "Setup: Get Alice's Library ID for subsequent tests",
    async () => {
      try {
        console.log("  Running: Retrieve Alice's library ID.");
        const fetchedLibrary = await concept._getLibraryByUser({
          user: userAlice,
        });
        aliceLibraryId = fetchedLibrary[0].library!._id;
        assertEquals(
          typeof aliceLibraryId,
          "string",
          "Verification: Alice's library ID retrieved.",
        );
        console.log(
          `  ✅ Setup Complete: Alice's Library ID is ${aliceLibraryId}.`,
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Setup Failed: Could not retrieve Alice's library ID.",
          errorMessage,
        );
        throw e;
      }
    },
  );

  let doc1Id: ID | undefined; // Declare outside step
  let doc2Id: ID | undefined; // Declare outside step
  await t.step(
    "createDocument: should add a new document to an existing library",
    async () => {
      try {
        console.log(
          "  Running: createDocument('Book One', epubContent1, library: Alice's)",
        );
        const result = await concept.createDocument({
          name: "Book One",
          epubContent: epubContent1,
          library: aliceLibraryId!, // Use non-null assertion as it's set in setup
        });
        assertEquals(result.error, undefined, "Expected no error.");
        doc1Id = result.document!;
        assertEquals(typeof doc1Id, "string", "Expected a document ID.");

        const fetchedLibrary = await concept._getLibraryByUser({
          user: userAlice,
        });
        assertEquals(
          fetchedLibrary[0].library?.documents.includes(doc1Id),
          true,
          "Verification: Document in library.",
        );
        assertEquals(
          fetchedLibrary[0].library?.documents.length,
          1,
          "Verification: Library has one document.",
        );

        const fetchedDoc = await concept._getDocumentDetails({
          document: doc1Id,
        });
        assertEquals(
          fetchedDoc[0].document?.name,
          "Book One",
          "Verification: Document name correct.",
        );
        assertEquals(
          fetchedDoc[0].document?.epubContent,
          epubContent1,
          "Verification: Document content correct.",
        );
        console.log(
          "  ✅ Test Passed: Document 'Book One' created and verified.",
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Test Failed: createDocument 'Book One'.",
          errorMessage,
        );
        throw e;
      }
    },
  );

  await t.step(
    "createDocument: should allow different documents with same epubContent but different names",
    async () => {
      try {
        console.log(
          "  Running: createDocument('Book Two', epubContent1, library: Alice's)",
        );
        const result = await concept.createDocument({
          name: "Book Two",
          epubContent: epubContent1,
          library: aliceLibraryId!,
        });
        assertEquals(result.error, undefined, "Expected no error.");
        doc2Id = result.document!;
        assertEquals(typeof doc2Id, "string", "Expected a document ID.");

        const fetchedLibrary = await concept._getLibraryByUser({
          user: userAlice,
        });
        assertEquals(
          fetchedLibrary[0].library?.documents.includes(doc2Id),
          true,
          "Verification: Second document in library.",
        );
        assertEquals(
          fetchedLibrary[0].library?.documents.length,
          2,
          "Verification: Library has two documents.",
        );
        console.log(
          "  ✅ Test Passed: 'Book Two' created with same content, different name.",
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Test Failed: createDocument 'Book Two'.",
          errorMessage,
        );
        throw e;
      }
    },
  );

  await t.step(
    "createDocument: should not add a document with a duplicate name in the same library",
    async () => {
      try {
        console.log(
          "  Running: createDocument('Book One', epubContent2, library: Alice's) (duplicate name, expected failure)",
        );
        const result = await concept.createDocument({
          name: "Book One",
          epubContent: epubContent2,
          library: aliceLibraryId!,
        });
        assertEquals(
          result.error,
          `Document with name 'Book One' already exists in library ${aliceLibraryId}.`,
          "Expected error for duplicate document name in library.",
        );
        console.log(
          "  ✅ Test Passed: Duplicate name within library correctly prevented.",
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Test Failed: Duplicate name prevention.",
          errorMessage,
        );
        throw e;
      }
    },
  );

  await t.step(
    "createDocument: should not add a document to a non-existent library",
    async () => {
      try {
        console.log(
          "  Running: createDocument('New Book', epubContent1, library: nonExistentId) (expected failure)",
        );
        const nonExistentLibrary = "lib:NonExistent" as ID;
        const result = await concept.createDocument({
          name: "New Book",
          epubContent: epubContent1,
          library: nonExistentLibrary,
        });
        assertEquals(
          result.error,
          `Library ${nonExistentLibrary} does not exist.`,
          "Expected error for non-existent library.",
        );
        console.log(
          "  ✅ Test Passed: Creation to non-existent library correctly prevented.",
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Test Failed: Creation to non-existent library.",
          errorMessage,
        );
        throw e;
      }
    },
  );

  await t.step(
    "renameDocument: should rename an existing document",
    async () => {
      try {
        console.log(
          "  Running: renameDocument(user: Alice, newName: 'First Book', document: doc1Id)",
        );
        const result = await concept.renameDocument({
          user: userAlice,
          newName: "My First Book", // Changed name to avoid conflict with "First Book" example
          document: doc1Id!,
        });
        assertEquals(result.error, undefined, "Expected no error.");
        assertEquals(result.document, doc1Id, "Expected the document ID.");

        const fetchedDoc = await concept._getDocumentDetails({
          document: doc1Id!,
        });
        assertEquals(
          fetchedDoc[0].document?.name,
          "My First Book",
          "Verification: Document name updated.",
        );
        console.log("  ✅ Test Passed: Document renamed successfully.");
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("  ❌ Test Failed: Document rename.", errorMessage);
        throw e;
      }
    },
  );

  await t.step(
    "renameDocument: should not rename a document to an already existing name in the same library",
    async () => {
      try {
        console.log(
          "  Running: renameDocument(user: Alice, newName: 'Book Two', document: doc1Id) (duplicate name, expected failure)",
        );
        const result = await concept.renameDocument({
          user: userAlice,
          newName: "Book Two", // doc2 has this name
          document: doc1Id!,
        });
        assertEquals(
          result.error,
          `Document with name 'Book Two' already exists in user ${userAlice}'s library.`,
          "Expected error for duplicate name.",
        );
        console.log(
          "  ✅ Test Passed: Renaming to duplicate name correctly prevented.",
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Test Failed: Renaming to duplicate name.",
          errorMessage,
        );
        throw e;
      }
    },
  );

  await t.step(
    "openDocument: should successfully 'open' a document for a user who owns it",
    async () => {
      try {
        console.log("  Running: openDocument(user: Alice, document: doc1Id)");
        const result = await concept.openDocument({
          user: userAlice,
          document: doc1Id!,
        });
        assertEquals(result.error, undefined, "Expected no error.");
        assertEquals(result.document, doc1Id, "Expected the document ID.");
        console.log(
          "  ✅ Test Passed: Document 'My First Book' successfully 'opened' by Alice.",
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Test Failed: Open document by owner.",
          errorMessage,
        );
        throw e;
      }
    },
  );

  await t.step(
    "openDocument: should fail to 'open' a document if user does not own it",
    async () => {
      let bobLibraryId: ID | undefined; // Declare outside try block
      try {
        console.log("  Setup: createLibrary(user: Bob)");
        const bobLibraryResult = await concept.createLibrary({ user: userBob });
        bobLibraryId = bobLibraryResult.library!;

        console.log(
          "  Running: openDocument(user: Bob, document: doc1Id) (owned by Alice, expected failure)",
        );
        const result = await concept.openDocument({
          user: userBob,
          document: doc1Id!,
        });
        assertEquals(
          result.error,
          `Document ${doc1Id} does not exist or is not in user ${userBob}'s library.`,
          "Expected error for unauthorized access.",
        );
        console.log(
          "  ✅ Test Passed: Unauthorized document access correctly prevented.",
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Test Failed: Unauthorized document access.",
          errorMessage,
        );
        throw e;
      } finally {
        if (bobLibraryId) {
          // Find documents in Bob's library and delete them first, then delete the library
          const bobLibraryDocs = await concept.documents.find({
            _id: {
              $in: (await concept.libraries.findOne({ _id: bobLibraryId }))
                ?.documents || [],
            },
          }).toArray();
          for (const doc of bobLibraryDocs) {
            await concept.documents.deleteOne({ _id: doc._id });
          }
          await concept.libraries.deleteOne({ _id: bobLibraryId });
        }
      }
    },
  );

  await t.step(
    "closeDocument: should successfully 'close' a document for a user who owns it",
    async () => {
      try {
        console.log("  Running: closeDocument(user: Alice, document: doc1Id)");
        const result = await concept.closeDocument({
          user: userAlice,
          document: doc1Id!,
        });
        assertEquals(result.error, undefined, "Expected no error.");
        assertEquals(result.document, doc1Id, "Expected the document ID.");
        console.log(
          "  ✅ Test Passed: Document 'My First Book' successfully 'closed' by Alice.",
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Test Failed: Close document by owner.",
          errorMessage,
        );
        throw e;
      }
    },
  );

  await t.step(
    "removeDocument: should remove an existing document from the library and collection",
    async () => {
      try {
        console.log(
          "  Running: removeDocument(library: Alice's, document: doc1Id)",
        );
        const result = await concept.removeDocument({
          library: aliceLibraryId!,
          document: doc1Id!,
        });
        assertEquals(result.error, undefined, "Expected no error.");

        const fetchedLibrary = await concept._getLibraryByUser({
          user: userAlice,
        });
        assertEquals(
          fetchedLibrary[0].library?.documents.includes(doc1Id!),
          false,
          "Verification: Document 1 removed from library.",
        );
        assertEquals(
          fetchedLibrary[0].library?.documents.length,
          1,
          "Verification: Library has one document (doc2).",
        );

        const fetchedDoc = await concept._getDocumentDetails({
          document: doc1Id!,
        });
        assertEquals(
          fetchedDoc[0].error,
          `Document ${doc1Id} does not exist.`,
          "Verification: Document 1 no longer exists.",
        );
        console.log(
          "  ✅ Test Passed: Document 'My First Book' removed and verified.",
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error("  ❌ Test Failed: Document removal.", errorMessage);
        throw e;
      }
    },
  );

  await t.step(
    "removeDocument: should not remove a document if not in the specified library",
    async () => {
      let bobLibraryId: ID | undefined; // Declare outside try block
      let bobDocId: ID | undefined; // Declare outside try block
      try {
        console.log(
          "  Setup: createLibrary(user: Bob) and create a document for Bob",
        );
        const bobLibraryResult = await concept.createLibrary({ user: userBob });
        bobLibraryId = bobLibraryResult.library!;
        const bobDocResult = await concept.createDocument({
          name: "Bob's Book",
          epubContent: epubContent2,
          library: bobLibraryId,
        });
        bobDocId = bobDocResult.document!;

        console.log(
          "  Running: removeDocument(library: Alice's, document: bobDocId) (not in Alice's library, expected failure)",
        );
        const result = await concept.removeDocument({
          library: aliceLibraryId!,
          document: bobDocId,
        });
        assertEquals(
          result.error,
          `Document ${bobDocId} is not in library ${aliceLibraryId}.`,
          "Expected error for document not in library.",
        );
        console.log(
          "  ✅ Test Passed: Removal of document not in specified library correctly prevented.",
        );
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "  ❌ Test Failed: Removal of document not in library.",
          errorMessage,
        );
        throw e;
      } finally {
        if (bobLibraryId && bobDocId) {
          await concept.removeDocument({
            library: bobLibraryId,
            document: bobDocId,
          });
        }
        if (bobLibraryId) await concept.libraries.deleteOne({ user: userBob }); // Clean up Bob's library record
      }
    },
  );

  await t.step(
    "Principle Trace: A user can upload documents, view, remove, or open them.",
    async () => {
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
        assertEquals(
          createLibResult.error,
          undefined,
          "Expected library creation to succeed.",
        );
        testLibraryId = createLibResult.library!;
        console.log(`   Created library for ${testUser}: ${testLibraryId}`);

        console.log("2. User uploads two documents.");
        const createDoc1Result = await concept.createDocument({
          name: bookTitle1,
          epubContent: bookContent1,
          library: testLibraryId,
        });
        assertEquals(
          createDoc1Result.error,
          undefined,
          "Expected first document upload to succeed.",
        );
        docId1 = createDoc1Result.document!;
        console.log(`   Uploaded document "${bookTitle1}": ${docId1}`);

        const createDoc2Result = await concept.createDocument({
          name: bookTitle2,
          epubContent: bookContent2,
          library: testLibraryId,
        });
        assertEquals(
          createDoc2Result.error,
          undefined,
          "Expected second document upload to succeed.",
        );
        docId2 = createDoc2Result.document!;
        console.log(`   Uploaded document "${bookTitle2}": ${docId2}`);

        console.log("3. User views all uploaded documents.");
        const viewDocsResult = await concept._getDocumentsInLibrary({
          library: testLibraryId,
        });
        assertEquals(
          viewDocsResult.length,
          2,
          "Expected to see two documents in the library.",
        );
        assertEquals(
          viewDocsResult.some((d) => d.document?.name === bookTitle1),
          true,
          "Expected to find 'The Great Adventure'.",
        );
        assertEquals(
          viewDocsResult.some((d) => d.document?.name === bookTitle2),
          true,
          "Expected to find 'Whispers in the Dark'.",
        );
        console.log("   Successfully viewed two documents.");

        console.log("4. User opens and reads 'The Great Adventure'.");
        const openDocResult = await concept.openDocument({
          user: testUser,
          document: docId1,
        });
        assertEquals(
          openDocResult.error,
          undefined,
          "Expected open action to succeed.",
        );
        assertEquals(
          openDocResult.document,
          docId1,
          "Expected open action to return doc ID.",
        );
        console.log(`   Successfully opened document "${bookTitle1}".`);

        console.log(
          "5. User decides to rename 'The Great Adventure' to 'My First Book'.",
        );
        const renameDocResult = await concept.renameDocument({
          user: testUser,
          newName: "My First Book",
          document: docId1,
        });
        assertEquals(
          renameDocResult.error,
          undefined,
          "Expected rename action to succeed.",
        );
        const renamedDocDetails = await concept._getDocumentDetails({
          document: docId1,
        });
        assertEquals(
          renamedDocDetails[0].document?.name,
          "My First Book",
          "Verification: Document name should be updated.",
        );
        console.log("   Successfully renamed document.");

        console.log("6. User closes 'My First Book'.");
        const closeDocResult = await concept.closeDocument({
          user: testUser,
          document: docId1,
        });
        assertEquals(
          closeDocResult.error,
          undefined,
          "Expected close action to succeed.",
        );
        assertEquals(
          closeDocResult.document,
          docId1,
          "Expected close action to return doc ID.",
        );
        console.log(`   Successfully closed document "My First Book".`);

        console.log("7. User removes 'Whispers in the Dark'.");
        const removeDocResult = await concept.removeDocument({
          library: testLibraryId,
          document: docId2,
        });
        assertEquals(
          removeDocResult.error,
          undefined,
          "Expected document removal to succeed.",
        );
        console.log(`   Successfully removed document "${bookTitle2}".`);

        console.log("8. User views remaining documents.");
        const finalViewDocsResult = await concept._getDocumentsInLibrary({
          library: testLibraryId,
        });
        assertEquals(
          finalViewDocsResult.length,
          1,
          "Expected only one document remaining.",
        );
        assertEquals(
          finalViewDocsResult[0].document?.name,
          "My First Book",
          "Expected 'My First Book' to be the remaining document.",
        );
        console.log("   Successfully viewed remaining document.");

        console.log("--- ✅ Principle Trace Simulation Complete ---");
      } catch (e: unknown) {
        const errorMessage = e instanceof Error ? e.message : String(e);
        console.error(
          "--- ❌ Principle Trace Simulation Failed ---",
          errorMessage,
        );
        throw e;
      } finally {
        // Cleanup for principle trace. Check if IDs are defined before attempting removal.
        if (testLibraryId && docId1) {
          await concept.removeDocument({
            library: testLibraryId,
            document: docId1,
          });
        }
        if (testLibraryId && docId2) {
          await concept.removeDocument({
            library: testLibraryId,
            document: docId2,
          });
        }
        // Ensure the library itself is removed if it was created
        if (testLibraryId) {
          await concept.libraries.deleteOne({ _id: testLibraryId });
        }
      }
    },
  );

  console.log("Library Concept Tests Complete.");

  await client.close();
});
