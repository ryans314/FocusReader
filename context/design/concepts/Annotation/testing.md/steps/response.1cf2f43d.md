---
timestamp: 'Thu Oct 23 2025 06:31:37 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_063137.421f4c96.md]]'
content_id: 1cf2f43d9ff220f28157c28e8a6ee10b6492e7781b2a33e30b8f386d6c03c156
---

# response:

Okay, this is a great idea to make the test output even more readable! Deno's test runner by default only shows `console.log` output for *failing* tests, but we can wrap our `t.step` calls to explicitly log a pass/fail symbol for each test step, regardless of its outcome.

We'll use ANSI escape codes for colors and create a helper function to manage the step logging.

Here's the updated test file:

```typescript
// file: src/Annotation/AnnotationConcept.test.ts

import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import AnnotationConcept from "./AnnotationConcept.ts";

// ANSI escape codes for colors
const GREEN = "\x1b[32m";
const RED = "\x1b[31m";
const RESET = "\x1b[0m"; // Reset to default color

// Custom logging function for individual test steps
async function logAndRunStep(
  t: Deno.TestContext,
  stepName: string,
  testFunction: () => Promise<void>,
) {
  // Use Deno's native t.step to ensure proper test isolation and reporting
  await t.step(stepName, async () => {
    try {
      console.log(`\n--- Test: ${stepName} ---`); // Original log for test context
      await testFunction();
      console.log(`${GREEN}✔ ${stepName}${RESET}`); // Green checkmark for pass
    } catch (e) {
      console.log(`${RED}✖ ${stepName}${RESET}`); // Red X for fail
      throw e; // Re-throw the error so Deno's test runner also registers it as a failure
    }
  });
}

// Test-specific generic IDs
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const docA = "document:alpha" as ID;
const docB = "document:beta" as ID;

Deno.test("Annotation Concept: Basic Tag Management", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  await logAndRunStep(t, "should create a tag successfully", async () => {
    const result = await concept.createTag({ creator: userAlice, title: "Important" });
    console.log("createTag result:", result);
    assertExists(result.tag, "Tag should be created and returned.");

    const foundTag = await db.collection("Annotation.tags").findOne({ _id: result.tag });
    assertExists(foundTag, "Tag should exist in the database.");
    assertEquals(foundTag.title, "Important");
    assertEquals(foundTag.creator, userAlice);
    console.log("Verified tag exists in DB.");
  });

  await logAndRunStep(t, "should prevent creating a duplicate tag", async () => {
    // Create the tag first
    await concept.createTag({ creator: userAlice, title: "DuplicateTag" });

    // Attempt to create it again
    const result = await concept.createTag({ creator: userAlice, title: "DuplicateTag" });
    console.log("createTag duplicate result:", result);
    assertExists(result.error, "Duplicate tag creation should return an error.");
    assertEquals(result.error, "A tag with this creator and title already exists.");
    console.log("Verified duplicate tag creation returns an error.");
  });

  await client.close();
});

Deno.test("Annotation Concept: Document Registration Utilities", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  await logAndRunStep(t, "should register a document view successfully", async () => {
    const result = await concept._registerDocument({ documentId: docA, creatorId: userAlice });
    console.log("_registerDocument result:", result);
    assertEquals(result, {}, "Document registration should be successful.");

    const docView = await db.collection("Annotation.documentViews").findOne({ _id: docA });
    assertExists(docView, "Document view should exist in DB.");
    assertEquals(docView.creator, userAlice);
    assertEquals(docView.annotations, []);
    console.log("Verified document view registered.");
  });

  await logAndRunStep(t, "should prevent registering a duplicate document view", async () => {
    // Register once
    await concept._registerDocument({ documentId: docB, creatorId: userBob });

    // Attempt to register again
    const result = await concept._registerDocument({ documentId: docB, creatorId: userBob });
    console.log("_registerDocument duplicate result:", result);
    assertExists(result.error, "Duplicate document registration should return an error.");
    assertEquals(result.error, "Document already registered in Annotation concept's view.");
    console.log("Verified duplicate document registration returns an error.");
  });

  await logAndRunStep(t, "should delete a document view successfully", async () => {
    // Setup: Register a document and add an annotation to it
    await concept._registerDocument({ documentId: "doc:toDelete" as ID, creatorId: userAlice });
    const tagResult = await concept.createTag({ creator: userAlice, title: "temp-tag" });
    assertExists(tagResult.tag);
    const annotationResult = await concept.createAnnotation({
      creator: userAlice,
      document: "doc:toDelete" as ID,
      content: "Annotation to be deleted with document.",
      location: "cfi:/0/0",
      tags: [tagResult.tag!],
    });
    assertExists(annotationResult.annotation);

    const deleteResult = await concept._deleteDocumentView({ documentId: "doc:toDelete" as ID });
    console.log("_deleteDocumentView result:", deleteResult);
    assertEquals(deleteResult, {}, "Document view deletion should be successful.");

    const docView = await db.collection("Annotation.documentViews").findOne({ _id: "doc:toDelete" as ID });
    assertEquals(docView, null, "Document view should be removed from DB.");

    const deletedAnnotation = await db.collection("Annotation.annotations").findOne({ _id: annotationResult.annotation });
    assertEquals(deletedAnnotation, null, "Associated annotations should also be deleted.");
    console.log("Verified document view and associated annotations deleted.");
  });

  await client.close();
});

Deno.test("Annotation Concept: Annotation Creation", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  // Setup: Register docA for Alice
  await concept._registerDocument({ documentId: docA, creatorId: userAlice });

  await logAndRunStep(t, "should create an annotation successfully with content", async () => {
    const result = await concept.createAnnotation({
      creator: userAlice,
      document: docA,
      content: "This is a test annotation.",
      location: "cfi:/0/1",
      tags: [],
    });
    console.log("createAnnotation result:", result);
    assertExists(result.annotation, "Annotation should be created and returned.");

    const foundAnnotation = await db.collection("Annotation.annotations").findOne({ _id: result.annotation });
    assertExists(foundAnnotation, "Annotation should exist in the database.");
    assertEquals(foundAnnotation.content, "This is a test annotation.");
    assertEquals(foundAnnotation.creator, userAlice);
    assertEquals(foundAnnotation.document, docA);
    assertEquals(foundAnnotation.location, "cfi:/0/1");
    assertEquals(foundAnnotation.tags, []);

    const docView = await db.collection("Annotation.documentViews").findOne({ _id: docA });
    assertExists(docView, "Document view should still exist.");
    assertArrayIncludes(docView.annotations, [result.annotation!], "Document view should include the new annotation.");
    console.log("Verified annotation created and linked to document view.");
  });

  await logAndRunStep(t, "should create an annotation successfully with color and tags", async () => {
    const tag1 = (await concept.createTag({ creator: userAlice, title: "Highlight" })).tag!;
    const tag2 = (await concept.createTag({ creator: userAlice, title: "Review" })).tag!;
    assertExists(tag1); assertExists(tag2);

    const result = await concept.createAnnotation({
      creator: userAlice,
      document: docA,
      color: "#FF0000",
      location: "cfi:/0/2",
      tags: [tag1, tag2],
    });
    console.log("createAnnotation result:", result);
    assertExists(result.annotation, "Annotation should be created.");

    const foundAnnotation = await db.collection("Annotation.annotations").findOne({ _id: result.annotation });
    assertExists(foundAnnotation, "Annotation should exist in DB.");
    assertEquals(foundAnnotation.color, "#FF0000");
    assertArrayIncludes(foundAnnotation.tags, [tag1, tag2]);
    assertEquals(foundAnnotation.content, undefined, "Content should be undefined.");
    console.log("Verified annotation created with color and tags.");
  });

  await logAndRunStep(t, "should fail if document does not exist in concept's view", async () => {
    const result = await concept.createAnnotation({
      creator: userAlice,
      document: docB, // Not registered
      content: "Should fail.",
      location: "cfi:/0/0",
      tags: [],
    });
    console.log("createAnnotation result:", result);
    assertExists(result.error, "Should return an error for non-existent document.");
    assertEquals(
      result.error,
      "Document does not exist in Annotation concept's view or is not owned by the creator.",
    );
    console.log("Verified failure for unregistered document.");
  });

  await logAndRunStep(t, "should fail if creator does not own the document view", async () => {
    // Register docB for Bob
    await concept._registerDocument({ documentId: docB, creatorId: userBob });

    const result = await concept.createAnnotation({
      creator: userAlice, // Alice tries to annotate Bob's doc
      document: docB,
      content: "Should fail for unauthorized creator.",
      location: "cfi:/0/0",
      tags: [],
    });
    console.log("createAnnotation result:", result);
    assertExists(result.error, "Should return an error for unauthorized creator.");
    assertEquals(
      result.error,
      "Document does not exist in Annotation concept's view or is not owned by the creator.",
    );
    console.log("Verified failure for wrong creator.");
  });

  await logAndRunStep(t, "should fail if both color and content are omitted", async () => {
    const result = await concept.createAnnotation({
      creator: userAlice,
      document: docA,
      location: "cfi:/0/3",
      tags: [],
    });
    console.log("createAnnotation result:", result);
    assertExists(result.error, "Should return an error if both color and content are missing.");
    assertEquals(result.error, "Either color or content must be provided.");
    console.log("Verified failure when both color and content are missing.");
  });

  await client.close();
});

Deno.test("Annotation Concept: Annotation Deletion", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  // Setup: Register docA for Alice
  await concept._registerDocument({ documentId: docA, creatorId: userAlice });
  const tagForDeletion = (await concept.createTag({ creator: userAlice, title: "temp" })).tag!;
  assertExists(tagForDeletion);
  const annForDeletion = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "Annotation to delete.",
    location: "cfi:/0/4",
    tags: [tagForDeletion],
  })).annotation!;
  assertExists(annForDeletion);

  await logAndRunStep(t, "should delete an annotation successfully", async () => {
    const result = await concept.deleteAnnotation({ user: userAlice, annotation: annForDeletion });
    console.log("deleteAnnotation result:", result);
    assertEquals(result, {}, "Annotation deletion should be successful.");

    const foundAnnotation = await db.collection("Annotation.annotations").findOne({ _id: annForDeletion });
    assertEquals(foundAnnotation, null, "Annotation should be removed from the database.");

    const docView = await db.collection("Annotation.documentViews").findOne({ _id: docA });
    assertExists(docView, "Document view should still exist.");
    assertNotEquals(docView.annotations.includes(annForDeletion), true, "Document view should not include deleted annotation.");
    console.log("Verified annotation deleted and removed from document view.");
  });

  const annForUnauthorizedDelete = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "Annotation for unauthorized delete test.",
    location: "cfi:/0/5",
    tags: [],
  })).annotation!;
  assertExists(annForUnauthorizedDelete);

  await logAndRunStep(t, "should fail to delete an annotation if user is not the creator", async () => {
    const result = await concept.deleteAnnotation({ user: userBob, annotation: annForUnauthorizedDelete });
    console.log("deleteAnnotation unauthorized result:", result);
    assertExists(result.error, "Unauthorized deletion should return an error.");
    assertEquals(result.error, "User is not the creator of this annotation.");

    const foundAnnotation = await db.collection("Annotation.annotations").findOne({ _id: annForUnauthorizedDelete });
    assertExists(foundAnnotation, "Annotation should still exist after unauthorized attempt.");
    console.log("Verified unauthorized deletion failed.");
  });

  await logAndRunStep(t, "should fail to delete a non-existent annotation", async () => {
    const result = await concept.deleteAnnotation({ user: userAlice, annotation: "nonexistent:ann" as ID });
    console.log("deleteAnnotation non-existent result:", result);
    assertExists(result.error, "Deletion of non-existent annotation should return an error.");
    assertEquals(result.error, "Annotation not found.");
    console.log("Verified deletion of non-existent annotation failed.");
  });

  await client.close();
});

Deno.test("Annotation Concept: Annotation Update", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  // Setup: Register docA for Alice
  await concept._registerDocument({ documentId: docA, creatorId: userAlice });
  const initialAnn = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "Initial content.",
    color: "#000000",
    location: "cfi:/0/6",
    tags: [],
  })).annotation!;
  assertExists(initialAnn, "Initial annotation must be created for update tests.");
  const tagUpdate = (await concept.createTag({ creator: userAlice, title: "Updated" })).tag!;
  assertExists(tagUpdate, "Tag for update must be created for update tests.");

  await logAndRunStep(t, "should update an annotation's content and color successfully", async () => {
    const result = await concept.updateAnnotation({
      user: userAlice,
      annotation: initialAnn,
      newContent: "Updated content.",
      newColor: "#FFFFFF",
    });
    console.log("updateAnnotation result:", result);
    assertEquals(result.annotation, initialAnn, "Updated annotation ID should be returned.");

    const updatedAnn = await db.collection("Annotation.annotations").findOne({ _id: initialAnn });
    assertExists(updatedAnn, "Updated annotation should exist in DB.");
    assertEquals(updatedAnn.content, "Updated content.");
    assertEquals(updatedAnn.color, "#FFFFFF");
    assertEquals(updatedAnn.location, "cfi:/0/6", "Location should remain unchanged.");
    console.log("Verified content and color updated.");
  });

  await logAndRunStep(t, "should update an annotation's tags and location successfully", async () => {
    const result = await concept.updateAnnotation({
      user: userAlice,
      annotation: initialAnn,
      newLocation: "cfi:/0/7",
      newTags: [tagUpdate],
    });
    console.log("updateAnnotation result:", result);
    assertEquals(result.annotation, initialAnn, "Updated annotation ID should be returned.");

    const updatedAnn = await db.collection("Annotation.annotations").findOne({ _id: initialAnn });
    assertExists(updatedAnn, "Updated annotation should exist in DB.");
    assertEquals(updatedAnn.location, "cfi:/0/7");
    assertArrayIncludes(updatedAnn.tags, [tagUpdate]);
    assertEquals(updatedAnn.content, "Updated content.", "Content should remain unchanged.");
    console.log("Verified tags and location updated.");
  });

  await logAndRunStep(t, "should fail to update if user is not the creator", async () => {
    const result = await concept.updateAnnotation({
      user: userBob, // Bob tries to update Alice's annotation
      annotation: initialAnn,
      newContent: "Attempted by Bob.",
    });
    console.log("updateAnnotation unauthorized result:", result);
    assertExists(result.error, "Unauthorized update should return an error.");
    assertEquals(result.error, "User is not the creator of this annotation.");
    console.log("Verified unauthorized update failed.");
  });

  await logAndRunStep(t, "should fail to update a non-existent annotation", async () => {
    const result = await concept.updateAnnotation({
      user: userAlice,
      annotation: "nonexistent:ann" as ID,
      newContent: "Should fail.",
    });
    console.log("updateAnnotation non-existent result:", result);
    assertExists(result.error, "Update of non-existent annotation should return an error.");
    assertEquals(result.error, "Annotation not found.");
    console.log("Verified update of non-existent annotation failed.");
  });

  await logAndRunStep(t, "should fail if no fields are provided for update", async () => {
    const result = await concept.updateAnnotation({
      user: userAlice,
      annotation: initialAnn,
    }); // No newColor, newContent, newLocation, newTags
    console.log("updateAnnotation no fields result:", result);
    assertExists(result.error, "Update with no fields should return an error.");
    assertEquals(result.error, "No fields provided for update.");
    console.log("Verified update with no fields failed.");
  });

  await client.close();
});

Deno.test("Annotation Concept: Annotation Search", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  // Setup for Alice: Register docA for Alice
  await concept._registerDocument({ documentId: docA, creatorId: userAlice });

  // Setup for Bob: Register docB for Bob
  await concept._registerDocument({ documentId: docB, creatorId: userBob }); // Register docB for Bob

  // Create tags for Alice
  const tagConcept = (await concept.createTag({ creator: userAlice, title: "concept" })).tag!;
  const tagDesign = (await concept.createTag({ creator: userAlice, title: "Design" })).tag!;
  const tagTesting = (await concept.createTag({ creator: userAlice, title: "Testing" })).tag!;
  assertExists(tagConcept); assertExists(tagDesign); assertExists(tagTesting);

  // Create annotations for Alice on docA
  const ann1 = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "This is a concept design annotation.",
    location: "cfi:/a/1",
    tags: [tagConcept, tagDesign],
  })).annotation!;
  assertExists(ann1);
  const ann2 = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "Another annotation about design.",
    location: "cfi:/a/2",
    tags: [tagDesign],
  })).annotation!;
  assertExists(ann2);
  const ann3 = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "A note on testing implementation.",
    location: "cfi:/a/3",
    tags: [tagTesting],
  })).annotation!;
  assertExists(ann3);
  const ann4 = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "Just some random text.",
    location: "cfi:/a/4",
    tags: [],
  })).annotation!;
  assertExists(ann4);

  // Create an annotation for Bob on docB (This will now succeed as Bob is the creator of docB)
  const annBob = (await concept.createAnnotation({
    creator: userBob,
    document: docB, // Bob annotates docB
    content: "Bob's annotation on his document.",
    location: "cfi:/b/1",
    tags: [],
  })).annotation!;
  assertExists(annBob, "Bob's annotation should now be successfully created on his document.");

  await logAndRunStep(t, "should search by content keyword (case-insensitive)", async () => {
    const result = await concept.search({ user: userAlice, document: docA, criteria: "design" });
    console.log("Search 'design' result:", result.annotations.map(a => a._id));
    assertEquals(result.annotations.length, 2, "Should find 2 annotations matching 'design'.");
    assertArrayIncludes(result.annotations.map(a => a._id), [ann1, ann2]);
    console.log("Verified search by content keyword.");
  });

  await logAndRunStep(t, "should search by tag title (case-insensitive)", async () => {
    const result = await concept.search({ user: userAlice, document: docA, criteria: "testing" });
    console.log("Search 'testing' result:", result.annotations.map(a => a._id));
    assertEquals(result.annotations.length, 1, "Should find 1 annotation matching 'testing' tag.");
    assertArrayIncludes(result.annotations.map(a => a._id), [ann3]);
    console.log("Verified search by tag title.");
  });

  await logAndRunStep(t, "should search by content OR tag", async () => {
    const result = await concept.search({ user: userAlice, document: docA, criteria: "concept" });
    console.log("Search 'concept' result:", result.annotations.map(a => a._id));
    assertEquals(result.annotations.length, 1, "Should find 1 annotation matching 'concept' (content or tag).");
    assertArrayIncludes(result.annotations.map(a => a._id), [ann1]);
    console.log("Verified search by content OR tag.");
  });

  await logAndRunStep(t, "should return an empty list if no annotations match", async () => {
    const result = await concept.search({ user: userAlice, document: docA, criteria: "nonexistent" });
    console.log("Search 'nonexistent' result:", result.annotations);
    assertEquals(result.annotations.length, 0, "Should return an empty list for no matches.");
    console.log("Verified no matches result in empty list.");
  });

  await logAndRunStep(t, "should not return annotations from other users on their documents", async () => {
    // Alice searches on docB (which she doesn't own). The search method should return an error.
    const result = await concept.search({
      user: userAlice,
      document: docB, // Bob's document
      criteria: "Bob's",
    });
    console.log("Alice searching Bob's docB result:", result);
    assertExists(
      result.error,
      "Alice should not be able to search on Bob's document view.",
    );
    assertEquals(result.error, "User is not the creator of this document in Annotation concept's view, and cannot search it.");
    assertEquals(result.annotations.length, 0, "Annotations array should be empty on authorization error.");
    console.log("Verified Alice cannot search on Bob's document and receives an error.");
  });

  await logAndRunStep(t, "should not return other user's annotations even if on a document I own (if such were possible)", async () => {
    // If somehow Bob managed to annotate docA (owned by Alice), Alice's search should still filter them out.
    // (Given the createAnnotation rules, this scenario would typically not happen unless permissions were looser).
    // Here, Bob's actual annotation is on docB, so searching docA for "Bob's" should yield no results.
    const result = await concept.search({ user: userAlice, document: docA, criteria: "Bob's annotation" });
    console.log("Alice searching her docA for 'Bob's annotation' result:", result.annotations);
    assertEquals(result.annotations.length, 0, "Alice's search on her document should not find content that isn't hers (or associated with her tags).");
    console.log("Verified Alice's search on her document correctly finds no results for content not associated with her.");
  });

  await logAndRunStep(t, "Bob should find his own annotation on his document", async () => {
    const resultBob = await concept.search({ user: userBob, document: docB, criteria: "Bob's annotation" });
    console.log("Bob searching his docB for 'Bob's annotation' result:", resultBob.annotations.map(a => a._id));
    assertExists(resultBob.annotations);
    assertEquals(resultBob.annotations.length, 1, "Bob should find his own annotation on his document.");
    assertArrayIncludes(resultBob.annotations.map(a => a._id), [annBob]);
    console.log("Verified Bob can find his own annotation.");
  });

  await logAndRunStep(t, "should fail if document is not found in concept's view", async () => {
    const result = await concept.search({ user: userAlice, document: "nonexistent:doc" as ID, criteria: "any" });
    console.log("Search non-existent doc result:", result);
    assertExists(result.error, "Search on non-existent document should return an error.");
    assertEquals(result.error, "Document not found in Annotation concept's view.");
    assertEquals(result.annotations, [], "Annotations array should be empty on error.");
    console.log("Verified search on non-existent document fails correctly.");
  });

  await client.close();
});

Deno.test("Annotation Concept: Principle Fulfillment Test", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  console.log("\n--- Principle Fulfillment Test: Annotation Concept ---");
  console.log("Principle: When users read a document, they can create and view highlighting or text annotations in the document. Users can label annotations with tags. Users can also search for annotations in a document with specific keywords or about certain ideas.");

  const readerUser = "user:Reader" as ID;
  const bookDoc = "document:TheGreatBook" as ID;

  await logAndRunStep(t, `Step 1: Registering document ${bookDoc} for user ${readerUser}.`, async () => {
    const registerResult = await concept._registerDocument({ documentId: bookDoc, creatorId: readerUser });
    assertEquals(registerResult, {}, "Document registration for principle should succeed.");
  });

  await logAndRunStep(t, `Step 2: ${readerUser} creates tags 'Character' and 'Theme'.`, async () => {
    const charTagResult = await concept.createTag({ creator: readerUser, title: "Character" });
    assertExists(charTagResult.tag, "Character tag creation should succeed.");
    const charTag = charTagResult.tag!;

    const themeTagResult = await concept.createTag({ creator: readerUser, title: "Theme" });
    assertExists(themeTagResult.tag, "Theme tag creation should succeed.");
    const themeTag = themeTagResult.tag!;
    console.log(`Tags created: ${charTag}, ${themeTag}`);

    // Store for later steps in this block if needed
    (t as any).charTag = charTag;
    (t as any).themeTag = themeTag;
  });

  await logAndRunStep(t, `Step 3: ${readerUser} creates multiple annotations on the document.`, async () => {
    const charTag = (t as any).charTag;
    const themeTag = (t as any).themeTag;

    const annCharDescResult = await concept.createAnnotation({
      creator: readerUser,
      document: bookDoc,
      content: "Description of the protagonist's personality.",
      location: "cfi:/p1/ch1",
      tags: [charTag],
    });
    assertExists(annCharDescResult.annotation, "Annotation 1 creation should succeed.");
    const annCharDesc = annCharDescResult.annotation!;
    console.log(`Created annotation 1 (Character description): ${annCharDesc}`);

    const annHighlightThemeResult = await concept.createAnnotation({
      creator: readerUser,
      document: bookDoc,
      color: "#FFFF00", // Yellow highlight
      location: "cfi:/p2/s3",
      tags: [themeTag],
    });
    assertExists(annHighlightThemeResult.annotation, "Annotation 2 creation should succeed.");
    const annHighlightTheme = annHighlightThemeResult.annotation!;
    console.log(`Created annotation 2 (Theme highlight): ${annHighlightTheme}`);

    const annQuestionResult = await concept.createAnnotation({
      creator: readerUser,
      document: bookDoc,
      content: "Is this symbolism or just descriptive language?",
      location: "cfi:/p3/l5",
      tags: [themeTag],
    });
    assertExists(annQuestionResult.annotation, "Annotation 3 creation should succeed.");
    const annQuestion = annQuestionResult.annotation!;
    console.log(`Created annotation 3 (Question about theme): ${annQuestion}`);

    const annNoteResult = await concept.createAnnotation({
      creator: readerUser,
      document: bookDoc,
      content: "Remember to re-read this section later.",
      location: "cfi:/p4/ch2",
      tags: [],
    });
    assertExists(annNoteResult.annotation, "Annotation 4 creation should succeed.");
    const annNote = annNoteResult.annotation!;
    console.log(`Created annotation 4 (General note): ${annNote}`);

    // Store for later steps
    (t as any).annCharDesc = annCharDesc;
    (t as any).annHighlightTheme = annHighlightTheme;
    (t as any).annQuestion = annQuestion;
    (t as any).annNote = annNote;
  });


  await logAndRunStep(t, `Step 4: ${readerUser} searches for annotations with 'personality'.`, async () => {
    const annCharDesc = (t as any).annCharDesc;
    let searchResult1 = await concept.search({ user: readerUser, document: bookDoc, criteria: "personality" });
    console.log("Search result 1 (personality):", searchResult1.annotations.map(a => a._id));
    assertEquals(searchResult1.annotations.length, 1);
    assertArrayIncludes(searchResult1.annotations.map(a => a._id), [annCharDesc]);
    console.log("Verified search by content keyword 'personality'.");
  });


  await logAndRunStep(t, `Step 5: ${readerUser} searches for annotations with tag 'Theme'.`, async () => {
    const annHighlightTheme = (t as any).annHighlightTheme;
    const annQuestion = (t as any).annQuestion;
    let searchResult2 = await concept.search({ user: readerUser, document: bookDoc, criteria: "Theme" });
    console.log("Search result 2 (Theme tag):", searchResult2.annotations.map(a => a._id));
    assertEquals(searchResult2.annotations.length, 2);
    assertArrayIncludes(searchResult2.annotations.map(a => a._id), [annHighlightTheme, annQuestion]);
    console.log("Verified search by tag 'Theme'.");
  });

  await logAndRunStep(t, `Step 6: ${readerUser} searches for annotations with 'language' (matches content) or 'Character' (matches tag).`, async () => {
    const annCharDesc = (t as any).annCharDesc;
    const annQuestion = (t as any).annQuestion;
    let searchResult3 = await concept.search({ user: readerUser, document: bookDoc, criteria: "language" });
    console.log("Search result 3 (language):", searchResult3.annotations.map(a => a._id));
    assertEquals(searchResult3.annotations.length, 1);
    assertArrayIncludes(searchResult3.annotations.map(a => a._id), [annQuestion]);
    console.log("Verified search by content 'language'.");

    searchResult3 = await concept.search({ user: readerUser, document: bookDoc, criteria: "Charac" }); // Partial tag match
    console.log("Search result 3 (Charac tag):", searchResult3.annotations.map(a => a._id));
    assertEquals(searchResult3.annotations.length, 1);
    assertArrayIncludes(searchResult3.annotations.map(a => a._id), [annCharDesc]);
    console.log("Verified search by partial tag 'Charac'.");
  });

  await logAndRunStep(t, `Step 7: ${readerUser} views all annotations in ${bookDoc} (by checking document view directly).`, async () => {
    const annCharDesc = (t as any).annCharDesc;
    const annHighlightTheme = (t as any).annHighlightTheme;
    const annQuestion = (t as any).annQuestion;
    const annNote = (t as any).annNote;

    const docViewAfterAnnotations = await db.collection("Annotation.documentViews").findOne({ _id: bookDoc });
    assertExists(docViewAfterAnnotations, "Document view should exist after creating annotations.");
    assertEquals(docViewAfterAnnotations.annotations.length, 4, "Document view should have all 4 annotations.");
    assertArrayIncludes(docViewAfterAnnotations.annotations, [annCharDesc, annHighlightTheme, annQuestion, annNote]);
    console.log("Verified all annotations can be found/viewed directly from the document view.");
  });

  console.log(`\n${GREEN}Principle successfully demonstrated!${RESET}`);

  await client.close();
});
```

**How to run these tests and see the output:**

1. Save the updated test file.
2. Open your terminal in the project root.
3. Run Deno tests, piping the output to `cat` (Linux/macOS/Git Bash) or `Get-Content -Wait` (PowerShell) to ensure all `console.log` output is shown:

   **Linux/macOS/Git Bash:**

   ```bash
   deno test src/Annotation/AnnotationConcept.test.ts | cat
   ```

   **PowerShell:**

   ```powershell
   deno test src/Annotation/AnnotationConcept.test.ts | Get-Content -Wait
   ```

Now, each test step's individual console output will be followed by a `✔` (green checkmark) if it passes, or a `✖` (red X) if it fails, making it much clearer which specific part of a test passes or fails inline.
