```
Starting Library Concept Tests...
  Running: createLibrary(user: Alice)
  ✅ Test Passed: Library for Alice created and verified.
  Running: createLibrary(user: Alice) again (expected failure)
  ✅ Test Passed: Duplicate library creation correctly prevented.
  Running: Retrieve Alice's library ID.
  ✅ Setup Complete: Alice's Library ID is 019a10bc-b1d1-7bc6-8ad0-c9a3cb7437fc.
  Running: createDocument('Book One', epubContent1, library: Alice's)
  ✅ Test Passed: Document 'Book One' created and verified.
  Running: createDocument('Book Two', epubContent1, library: Alice's)
  ✅ Test Passed: 'Book Two' created with same content, different name.
  Running: createDocument('Book One', epubContent2, library: Alice's) (duplicate name, expected failure)
  ✅ Test Passed: Duplicate name within library correctly prevented.
  Running: createDocument('New Book', epubContent1, library: nonExistentId) (expected failure)
  ✅ Test Passed: Creation to non-existent library correctly prevented.
  Running: renameDocument(user: Alice, newName: 'First Book', document: doc1Id)
  ✅ Test Passed: Document renamed successfully.
  Running: renameDocument(user: Alice, newName: 'Book Two', document: doc1Id) (duplicate name, expected failure)
  ✅ Test Passed: Renaming to duplicate name correctly prevented.
  Running: openDocument(user: Alice, document: doc1Id)
  ✅ Test Passed: Document 'My First Book' successfully 'opened' by Alice.
  Setup: createLibrary(user: Bob)
  Running: openDocument(user: Bob, document: doc1Id) (owned by Alice, expected failure)
  ✅ Test Passed: Unauthorized document access correctly prevented.
  Running: closeDocument(user: Alice, document: doc1Id)
  ✅ Test Passed: Document 'My First Book' successfully 'closed' by Alice.
  Running: removeDocument(library: Alice's, document: doc1Id)
  ✅ Test Passed: Document 'My First Book' removed and verified.
  Setup: createLibrary(user: Bob) and create a document for Bob
  Running: removeDocument(library: Alice's, document: bobDocId) (not in Alice's library, expected failure)
  ✅ Test Passed: Removal of document not in specified library correctly prevented.

--- Running Principle Trace Simulation ---
1. User creates a library.
   Created library for user:PrincipleTester: 019a10bc-b68e-7a89-ae56-a311f13aa07a
2. User uploads two documents.
   Uploaded document "The Great Adventure": 019a10bc-b6cc-7a9f-b562-8c5e0eba3adb
   Uploaded document "Whispers in the Dark": 019a10bc-b721-796f-941a-3487cb9b9964
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
Library Concept Tests Complete.
```