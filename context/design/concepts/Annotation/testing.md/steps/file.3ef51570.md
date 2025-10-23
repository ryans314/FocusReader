---
timestamp: 'Thu Oct 23 2025 06:24:40 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_062440.d1dbcbba.md]]'
content_id: 3ef51570ffd9475d3444089e8dcbbab1d727c68f14d1bf0e0eaab42adaaea2fd
---

# file: src/Annotation/AnnotationConcept.test.ts

```typescript
import { assertEquals, assertExists, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import AnnotationConcept from "./AnnotationConcept.ts";
import { MongoClient } from "npm:mongodb";

// Test-specific generic IDs
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const docA = "document:alpha" as ID;
const docB = "document:beta" as ID; // Will be used for Bob's document

Deno.test("Annotation Concept: Comprehensive Test Suite", async (t) => {
  let db;
  let client: MongoClient;
  let concept: AnnotationConcept;

  try {
    [db, client] = await testDb();
    concept = new AnnotationConcept(db);

    // --- Basic Tag Management ---
    await t.step("should create a tag successfully", async () => {
      console.log("\n--- Test: createTag (success) ---");
      const result = await concept.createTag({ creator: userAlice, title: "Important" });
      console.log("createTag result:", result);
      assertExists(result.tag, "Tag should be created and returned.");

      const foundTag = await db.collection("Annotation.tags").findOne({ _id: result.tag });
      assertExists(foundTag, "Tag should exist in the database.");
      assertEquals(foundTag.title, "Important");
      assertEquals(foundTag.creator, userAlice);
      console.log("Verified tag exists in DB.");
    });

    await t.step("should prevent creating a duplicate tag", async () => {
      console.log("\n--- Test: createTag (duplicate failure) ---");
      // This tag might have been created in a previous step if tests were less isolated.
      // For this consolidated suite, we create it here to ensure it's a true duplicate attempt.
      await concept.createTag({ creator: userAlice, title: "DuplicateTag" }); // Ensure it exists once
      const result = await concept.createTag({ creator: userAlice, title: "DuplicateTag" });
      console.log("createTag duplicate result:", result);
      assertExists(result.error, "Duplicate tag creation should return an error.");
      assertEquals(result.error, "A tag with this creator and title already exists.");
      console.log("Verified duplicate tag creation returns an error.");
    });

    // --- Document Registration Utilities ---
    await t.step("should register a document view successfully", async () => {
      console.log("\n--- Test: _registerDocument (success) ---");
      const result = await concept._registerDocument({ documentId: docA, creatorId: userAlice });
      console.log("_registerDocument result:", result);
      assertEquals(result, {}, "Document registration should be successful.");

      const docView = await db.collection("Annotation.documentViews").findOne({ _id: docA });
      assertExists(docView, "Document view should exist in DB.");
      assertEquals(docView.creator, userAlice);
      assertEquals(docView.annotations, []);
      console.log("Verified document view registered.");
    });

    await t.step("should prevent registering a duplicate document view", async () => {
      console.log("\n--- Test: _registerDocument (duplicate failure) ---");
      // docA is already registered. Now register docB.
      await concept._registerDocument({ documentId: docB, creatorId: userBob }); // Register docB once
      const result = await concept._registerDocument({ documentId: docB, creatorId: userBob });
      console.log("_registerDocument duplicate result:", result);
      assertExists(result.error, "Duplicate document registration should return an error.");
      assertEquals(result.error, "Document already registered in Annotation concept's view.");
      console.log("Verified duplicate document registration returns an error.");
    });

    await t.step("should delete a document view successfully", async () => {
      console.log("\n--- Test: _deleteDocumentView (success) ---");
      const docToDelete = "doc:tempDelete" as ID;
      await concept._registerDocument({ documentId: docToDelete, creatorId: userAlice });
      const tagResult = await concept.createTag({ creator: userAlice, title: "temp-tag-for-delete" });
      const annotationResult = await concept.createAnnotation({
        creator: userAlice,
        document: docToDelete,
        content: "Annotation to be deleted with document.",
        location: "cfi:/0/0",
        tags: [tagResult.tag!],
      });
      assertExists(annotationResult.annotation);

      const deleteResult = await concept._deleteDocumentView({ documentId: docToDelete });
      console.log("_deleteDocumentView result:", deleteResult);
      assertEquals(deleteResult, {}, "Document view deletion should be successful.");

      const docView = await db.collection("Annotation.documentViews").findOne({ _id: docToDelete });
      assertEquals(docView, null, "Document view should be removed from DB.");

      const deletedAnnotation = await db.collection("Annotation.annotations").findOne({ _id: annotationResult.annotation });
      assertEquals(deletedAnnotation, null, "Associated annotations should also be deleted.");
      console.log("Verified document view and associated annotations deleted.");
    });

    // --- Annotation Creation ---
    let ann1: ID, ann2: ID, ann3: ID, ann4: ID, annBob: ID; // Declare annotation IDs for later use
    let tagConcept: ID, tagDesign: ID, tagTesting: ID; // Declare tag IDs for later use

    await t.step("should create an annotation successfully with content", async () => {
      console.log("\n--- Test: createAnnotation (success with content) ---");
      const result = await concept.createAnnotation({
        creator: userAlice,
        document: docA,
        content: "This is a test annotation.",
        location: "cfi:/0/1",
        tags: [],
      });
      console.log("createAnnotation result:", result);
      assertExists(result.annotation, "Annotation should be created and returned.");
      ann1 = result.annotation!; // Store for later use

      const foundAnnotation = await db.collection("Annotation.annotations").findOne({ _id: ann1 });
      assertExists(foundAnnotation, "Annotation should exist in the database.");
      assertEquals(foundAnnotation.content, "This is a test annotation.");
      assertEquals(foundAnnotation.creator, userAlice);
      assertEquals(foundAnnotation.document, docA);
      assertEquals(foundAnnotation.location, "cfi:/0/1");
      assertEquals(foundAnnotation.tags, []);

      const docView = await db.collection("Annotation.documentViews").findOne({ _id: docA });
      assertExists(docView, "Document view should still exist.");
      assertArrayIncludes(docView.annotations, [ann1], "Document view should include the new annotation.");
      console.log("Verified annotation created and linked to document view.");
    });

    await t.step("should create an annotation successfully with color and tags", async () => {
      console.log("\n--- Test: createAnnotation (success with color and tags) ---");
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
      ann2 = result.annotation!; // Store for later use

      const foundAnnotation = await db.collection("Annotation.annotations").findOne({ _id: ann2 });
      assertExists(foundAnnotation, "Annotation should exist in DB.");
      assertEquals(foundAnnotation.color, "#FF0000");
      assertArrayIncludes(foundAnnotation.tags, [tag1, tag2]);
      assertEquals(foundAnnotation.content, undefined, "Content should be undefined.");
      console.log("Verified annotation created with color and tags.");
    });

    await t.step("should fail if document does not exist in concept's view", async () => {
      console.log("\n--- Test: createAnnotation (document not registered failure) ---");
      const result = await concept.createAnnotation({
        creator: userAlice,
        document: "nonexistent:doc" as ID, // Not registered
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

    await t.step("should fail if creator does not own the document view", async () => {
      console.log("\n--- Test: createAnnotation (wrong creator failure) ---");
      // docB is already registered for Bob from previous step
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

    await t.step("should fail if both color and content are omitted", async () => {
      console.log("\n--- Test: createAnnotation (missing color/content failure) ---");
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

    // --- Annotation Deletion ---
    let annForDeletion: ID;
    await t.step("setup for deletion test: create annotation", async () => {
      const tagTemp = (await concept.createTag({ creator: userAlice, title: "temp-del" })).tag!;
      const result = await concept.createAnnotation({
        creator: userAlice,
        document: docA,
        content: "Annotation to delete.",
        location: "cfi:/0/4",
        tags: [tagTemp],
      });
      assertExists(result.annotation);
      annForDeletion = result.annotation!;
      console.log(`Setup: created annotation ${annForDeletion} for deletion tests.`);
    });

    await t.step("should delete an annotation successfully", async () => {
      console.log("\n--- Test: deleteAnnotation (success) ---");
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

    let annForUnauthorizedDelete: ID;
    await t.step("setup for unauthorized deletion test: create annotation", async () => {
      const result = await concept.createAnnotation({
        creator: userAlice,
        document: docA,
        content: "Annotation for unauthorized delete test.",
        location: "cfi:/0/5",
        tags: [],
      });
      assertExists(result.annotation);
      annForUnauthorizedDelete = result.annotation!;
      console.log(`Setup: created annotation ${annForUnauthorizedDelete} for unauthorized deletion tests.`);
    });

    await t.step("should fail to delete an annotation if user is not the creator", async () => {
      console.log("\n--- Test: deleteAnnotation (unauthorized failure) ---");
      const result = await concept.deleteAnnotation({ user: userBob, annotation: annForUnauthorizedDelete });
      console.log("deleteAnnotation unauthorized result:", result);
      assertExists(result.error, "Unauthorized deletion should return an error.");
      assertEquals(result.error, "User is not the creator of this annotation.");

      const foundAnnotation = await db.collection("Annotation.annotations").findOne({ _id: annForUnauthorizedDelete });
      assertExists(foundAnnotation, "Annotation should still exist after unauthorized attempt.");
      console.log("Verified unauthorized deletion failed.");
    });

    await t.step("should fail to delete a non-existent annotation", async () => {
      console.log("\n--- Test: deleteAnnotation (non-existent failure) ---");
      const result = await concept.deleteAnnotation({ user: userAlice, annotation: "nonexistent:ann" as ID });
      console.log("deleteAnnotation non-existent result:", result);
      assertExists(result.error, "Deletion of non-existent annotation should return an error.");
      assertEquals(result.error, "Annotation not found.");
      console.log("Verified deletion of non-existent annotation failed.");
    });

    // --- Annotation Update ---
    let initialAnn: ID;
    let tagUpdate: ID;
    await t.step("setup for update test: create annotation and tag", async () => {
      const annResult = await concept.createAnnotation({
        creator: userAlice,
        document: docA,
        content: "Initial content.",
        color: "#000000",
        location: "cfi:/0/6",
        tags: [],
      });
      assertExists(annResult.annotation, "Initial annotation must be created for update tests.");
      initialAnn = annResult.annotation!;

      const tagResult = await concept.createTag({ creator: userAlice, title: "Updated" });
      assertExists(tagResult.tag, "Tag for update must be created for update tests.");
      tagUpdate = tagResult.tag!;
      console.log(`Setup: created annotation ${initialAnn} and tag ${tagUpdate} for update tests.`);
    });

    await t.step("should update an annotation's content and color successfully", async () => {
      console.log("\n--- Test: updateAnnotation (content/color success) ---");
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

    await t.step("should update an annotation's tags and location successfully", async () => {
      console.log("\n--- Test: updateAnnotation (tags/location success) ---");
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

    await t.step("should fail to update if user is not the creator", async () => {
      console.log("\n--- Test: updateAnnotation (unauthorized failure) ---");
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

    await t.step("should fail to update a non-existent annotation", async () => {
      console.log("\n--- Test: updateAnnotation (non-existent failure) ---");
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

    await t.step("should fail if no fields are provided for update", async () => {
      console.log("\n--- Test: updateAnnotation (no fields failure) ---");
      const result = await concept.updateAnnotation({
        user: userAlice,
        annotation: initialAnn,
      }); // No newColor, newContent, newLocation, newTags
      console.log("updateAnnotation no fields result:", result);
      assertExists(result.error, "Update with no fields should return an error.");
      assertEquals(result.error, "No fields provided for update.");
      console.log("Verified update with no fields failed.");
    });

    // --- Annotation Search ---
    await t.step("setup for search test: create additional tags and annotations", async () => {
      tagConcept = (await concept.createTag({ creator: userAlice, title: "concept" })).tag!;
      tagDesign = (await concept.createTag({ creator: userAlice, title: "Design" })).tag!;
      tagTesting = (await concept.createTag({ creator: userAlice, title: "Testing" })).tag!;
      assertExists(tagConcept); assertExists(tagDesign); assertExists(tagTesting);

      // Create annotations for Alice on docA (these IDs are different from ann1/ann2 earlier)
      const r_ann_1 = await concept.createAnnotation({
        creator: userAlice,
        document: docA,
        content: "This is a concept design annotation.",
        location: "cfi:/a/1",
        tags: [tagConcept, tagDesign],
      });
      assertExists(r_ann_1.annotation); ann1 = r_ann_1.annotation!; // Re-assign ann1 for search context

      const r_ann_2 = await concept.createAnnotation({
        creator: userAlice,
        document: docA,
        content: "Another annotation about design.",
        location: "cfi:/a/2",
        tags: [tagDesign],
      });
      assertExists(r_ann_2.annotation); ann2 = r_ann_2.annotation!; // Re-assign ann2 for search context

      const r_ann_3 = await concept.createAnnotation({
        creator: userAlice,
        document: docA,
        content: "A note on testing implementation.",
        location: "cfi:/a/3",
        tags: [tagTesting],
      });
      assertExists(r_ann_3.annotation); ann3 = r_ann_3.annotation!; // Assign ann3 for search context

      const r_ann_4 = await concept.createAnnotation({
        creator: userAlice,
        document: docA,
        content: "Just some random text.",
        location: "cfi:/a/4",
        tags: [],
      });
      assertExists(r_ann_4.annotation); ann4 = r_ann_4.annotation!; // Assign ann4 for search context

      // Create an annotation for Bob on docB (This will now succeed as docB is registered for Bob)
      const r_ann_bob = await concept.createAnnotation({
        creator: userBob,
        document: docB,
        content: "Bob's annotation on his document.",
        location: "cfi:/b/1",
        tags: [],
      });
      assertExists(r_ann_bob.annotation, "Bob's annotation should now be successfully created on his document.");
      annBob = r_ann_bob.annotation!;
      console.log("Setup for search tests complete.");
    });

    await t.step("should search by content keyword (case-insensitive)", async () => {
      console.log("\n--- Test: search by content ---");
      const result = await concept.search({ user: userAlice, document: docA, criteria: "design" });
      console.log("Search 'design' result:", result.annotations.map(a => a._id));
      assertEquals(result.annotations.length, 2, "Should find 2 annotations matching 'design'.");
      assertArrayIncludes(result.annotations.map(a => a._id), [ann1, ann2]);
      console.log("Verified search by content keyword.");
    });

    await t.step("should search by tag title (case-insensitive)", async () => {
      console.log("\n--- Test: search by tag ---");
      const result = await concept.search({ user: userAlice, document: docA, criteria: "testing" });
      console.log("Search 'testing' result:", result.annotations.map(a => a._id));
      assertEquals(result.annotations.length, 1, "Should find 1 annotation matching 'testing' tag.");
      assertArrayIncludes(result.annotations.map(a => a._id), [ann3]);
      console.log("Verified search by tag title.");
    });

    await t.step("should search by content OR tag", async () => {
      console.log("\n--- Test: search by content OR tag ---");
      const result = await concept.search({ user: userAlice, document: docA, criteria: "concept" });
      console.log("Search 'concept' result:", result.annotations.map(a => a._id));
      assertEquals(result.annotations.length, 1, "Should find 1 annotation matching 'concept' (content or tag).");
      assertArrayIncludes(result.annotations.map(a => a._id), [ann1]);
      console.log("Verified search by content OR tag.");
    });

    await t.step("should return an empty list if no annotations match", async () => {
      console.log("\n--- Test: search (no match) ---");
      const result = await concept.search({ user: userAlice, document: docA, criteria: "nonexistent" });
      console.log("Search 'nonexistent' result:", result.annotations);
      assertEquals(result.annotations.length, 0, "Should return an empty list for no matches.");
      console.log("Verified no matches result in empty list.");
    });

    await t.step("should not return annotations from other users on their documents", async () => {
      console.log("\n--- Test: search (other user's document authorization) ---");
      // Alice searches on docB (which she doesn't own). The search method should return an error.
      const result = await concept.search({
        user: userAlice,
        document: docB, // Bob's document
        criteria: "Bob's",
      });
      console.log("Alice searching Bob's docB result:", result);
      assertExists(result.error, "Alice should not be able to search on Bob's document view.");
      assertEquals(result.error, "User is not the creator of this document in Annotation concept's view, and cannot search it.");
      assertEquals(result.annotations.length, 0, "Annotations array should be empty on authorization error.");
      console.log("Verified Alice cannot search on Bob's document and receives an error.");
    });

    await t.step("should not return other user's annotations even if on a document I own (if such were possible)", async () => {
      console.log("\n--- Test: search (other user's annotation on my document - filtered by query) ---");
      // If somehow Bob managed to annotate docA (owned by Alice), Alice's search should still filter them out.
      // (Given the createAnnotation rules, this scenario would typically not happen unless permissions were looser).
      // Here, Bob's actual annotation is on docB, so searching docA for "Bob's" should yield no results.
      const result = await concept.search({ user: userAlice, document: docA, criteria: "Bob's annotation" });
      console.log("Alice searching her docA for 'Bob's annotation' result:", result.annotations);
      assertEquals(result.annotations.length, 0, "Alice's search on her document should not find content that isn't hers (or associated with her tags).");
      console.log("Verified Alice's search on her document correctly finds no results for content not associated with her.");
    });

    await t.step("Bob should find his own annotation on his document", async () => {
      console.log("\n--- Test: Bob finds his own annotation ---");
      const resultBob = await concept.search({ user: userBob, document: docB, criteria: "Bob's annotation" });
      console.log("Bob searching his docB for 'Bob's annotation' result:", resultBob.annotations.map(a => a._id));
      assertExists(resultBob.annotations);
      assertEquals(resultBob.annotations.length, 1, "Bob should find his own annotation on his document.");
      assertArrayIncludes(resultBob.annotations.map(a => a._id), [annBob]);
      console.log("Verified Bob can find his own annotation.");
    });

    await t.step("should fail if document is not found in concept's view", async () => {
      console.log("\n--- Test: search (document not registered failure) ---");
      const result = await concept.search({ user: userAlice, document: "nonexistent:doc" as ID, criteria: "any" });
      console.log("Search non-existent doc result:", result);
      assertExists(result.error, "Search on non-existent document should return an error.");
      assertEquals(result.error, "Document not found in Annotation concept's view.");
      assertEquals(result.annotations, [], "Annotations array should be empty on error.");
      console.log("Verified search on non-existent document fails correctly.");
    });

    // --- Principle Fulfillment Test ---
    await t.step("Annotation Concept: Principle Fulfillment Test", async () => {
      console.log("\n--- Principle Fulfillment Test: Annotation Concept ---");
      console.log("Principle: When users read a document, they can create and view highlighting or text annotations in the document. Users can label annotations with tags. Users can also search for annotations in a document with specific keywords or about certain ideas.");

      const readerUser = "user:Reader" as ID;
      const bookDoc = "document:TheGreatBook" as ID;

      // Ensure fresh state for Principle Test (manually clear related collections if testDb doesn't provide a unique DB)
      // Since this is now within a single Deno.test block, and previous steps already populated the DB,
      // we need to ensure unique IDs or clean up explicitly for this sub-test, or use a distinct test flow.
      // For simplicity, we'll create new unique IDs for this principle fulfillment test.
      const principleDoc = "document:PrincipleBook" as ID;
      const principleUser = "user:PrincipleReader" as ID;


      // 1. Setup: Register the document for the reader
      console.log(`Step 1: Registering document ${principleDoc} for user ${principleUser}.`);
      const registerResult = await concept._registerDocument({ documentId: principleDoc, creatorId: principleUser });
      assertEquals(registerResult, {}, "Document registration for principle should succeed.");

      // 2. User creates tags
      console.log(`Step 2: ${principleUser} creates tags 'Character' and 'Theme'.`);
      const charTagResult = await concept.createTag({ creator: principleUser, title: "PrincipleCharacter" });
      assertExists(charTagResult.tag, "Character tag creation should succeed.");
      const principleCharTag = charTagResult.tag!;

      const themeTagResult = await concept.createTag({ creator: principleUser, title: "PrincipleTheme" });
      assertExists(themeTagResult.tag, "Theme tag creation should succeed.");
      const principleThemeTag = themeTagResult.tag!;
      console.log(`Tags created: ${principleCharTag}, ${principleThemeTag}`);

      // 3. User creates multiple annotations on the document
      console.log(`Step 3: ${principleUser} creates annotations on ${principleDoc}.`);
      const annCharDescResult = await concept.createAnnotation({
        creator: principleUser,
        document: principleDoc,
        content: "Description of the protagonist's personality in the principle book.",
        location: "cfi:/p1/ch1",
        tags: [principleCharTag],
      });
      assertExists(annCharDescResult.annotation, "Annotation 1 creation should succeed.");
      const principleAnnCharDesc = annCharDescResult.annotation!;
      console.log(`Created annotation 1 (Character description): ${principleAnnCharDesc}`);

      const annHighlightThemeResult = await concept.createAnnotation({
        creator: principleUser,
        document: principleDoc,
        color: "#FFFF00", // Yellow highlight
        location: "cfi:/p2/s3",
        tags: [principleThemeTag],
      });
      assertExists(annHighlightThemeResult.annotation, "Annotation 2 creation should succeed.");
      const principleAnnHighlightTheme = annHighlightThemeResult.annotation!;
      console.log(`Created annotation 2 (Theme highlight): ${principleAnnHighlightTheme}`);

      const annQuestionResult = await concept.createAnnotation({
        creator: principleUser,
        document: principleDoc,
        content: "Is this symbolism or just descriptive language in the principle book?",
        location: "cfi:/p3/l5",
        tags: [principleThemeTag],
      });
      assertExists(annQuestionResult.annotation, "Annotation 3 creation should succeed.");
      const principleAnnQuestion = annQuestionResult.annotation!;
      console.log(`Created annotation 3 (Question about theme): ${principleAnnQuestion}`);

      const annNoteResult = await concept.createAnnotation({
        creator: principleUser,
        document: principleDoc,
        content: "Remember to re-read this section later in the principle book.",
        location: "cfi:/p4/ch2",
        tags: [],
      });
      assertExists(annNoteResult.annotation, "Annotation 4 creation should succeed.");
      const principleAnnNote = annNoteResult.annotation!;
      console.log(`Created annotation 4 (General note): ${principleAnnNote}`);


      // 4. User searches for annotations by keyword in content
      console.log(`Step 4: ${principleUser} searches for annotations with 'personality'.`);
      let searchResult1 = await concept.search({ user: principleUser, document: principleDoc, criteria: "personality" });
      console.log("Search result 1 (personality):", searchResult1.annotations.map(a => a._id));
      assertEquals(searchResult1.annotations.length, 1);
      assertArrayIncludes(searchResult1.annotations.map(a => a._id), [principleAnnCharDesc]);
      console.log("Verified search by content keyword 'personality'.");


      // 5. User searches for annotations by tag
      console.log(`Step 5: ${principleUser} searches for annotations with tag 'Theme'.`);
      let searchResult2 = await concept.search({ user: principleUser, document: principleDoc, criteria: "PrincipleTheme" });
      console.log("Search result 2 (Theme tag):", searchResult2.annotations.map(a => a._id));
      assertEquals(searchResult2.annotations.length, 2);
      assertArrayIncludes(searchResult2.annotations.map(a => a._id), [principleAnnHighlightTheme, principleAnnQuestion]);
      console.log("Verified search by tag 'Theme'.");

      // 6. User searches for annotations by both (content or tag)
      console.log(`Step 6: ${principleUser} searches for annotations with 'language' (matches content) or 'Character' (matches tag).`);
      let searchResult3 = await concept.search({ user: principleUser, document: principleDoc, criteria: "language" });
      console.log("Search result 3 (language):", searchResult3.annotations.map(a => a._id));
      assertEquals(searchResult3.annotations.length, 1);
      assertArrayIncludes(searchResult3.annotations.map(a => a._id), [principleAnnQuestion]);
      console.log("Verified search by content 'language'.");

      searchResult3 = await concept.search({ user: principleUser, document: principleDoc, criteria: "Charac" }); // Partial tag match
      console.log("Search result 3 (Charac tag):", searchResult3.annotations.map(a => a._id));
      assertEquals(searchResult3.annotations.length, 1);
      assertArrayIncludes(searchResult3.annotations.map(a => a._id), [principleAnnCharDesc]);
      console.log("Verified search by partial tag 'Charac'.");

      // 7. User views all their annotations in the document (implicitly by searching with broad criteria or no criteria)
      console.log(`Step 7: ${principleUser} views all annotations in ${principleDoc}.`);
      const docViewAfterAnnotations = await db.collection("Annotation.documentViews").findOne({ _id: principleDoc });
      assertExists(docViewAfterAnnotations, "Document view should exist after creating annotations.");
      assertEquals(docViewAfterAnnotations.annotations.length, 4, "Document view should have all 4 annotations.");
      assertArrayIncludes(docViewAfterAnnotations.annotations, [principleAnnCharDesc, principleAnnHighlightTheme, principleAnnQuestion, principleAnnNote]);
      console.log("Verified all annotations can be found/viewed directly from the document view.");

      console.log("\nPrinciple successfully demonstrated!");
    });
  } finally {
    if (client) {
      await client.close();
      console.log("MongoDB client closed.");
    }
  }
});

```
