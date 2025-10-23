---
timestamp: 'Thu Oct 23 2025 05:37:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_053749.086b2e5a.md]]'
content_id: 664622dab8464fa81ab37638d8b3e13b92aa0d37a141e1bd6873a035675dc041
---

# response:

```typescript
// file: src/concepts/Annotation/AnnotationConcept.test.ts

import { assertEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import AnnotationConcept from "./AnnotationConcept.ts";
import { ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

Deno.test("Annotation Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  // Define some test IDs
  const testUser1: ID = "user-alice" as ID;
  const testUser2: ID = "user-bob" as ID;
  const testDocument1: ID = "doc-report-123" as ID;
  const testDocument2: ID = "doc-memo-456" as ID;
  const testLocation1: ID = "loc-para-1" as ID;
  const testLocation2: ID = "loc-section-2-line-10" as ID;
  const testLocation3: ID = "loc-page-5-highlight-area" as ID;

  // Helper to pre-register documents within the Annotation concept's view
  // This simulates the integration with a Document concept via syncs
  const registerDocument = async (
    docId: ID,
    creatorId: ID,
  ): Promise<void> => {
    await concept.documents.insertOne({
      _id: docId,
      annotations: [],
      creator: creatorId,
    });
  };

  // Pre-register documents for testing
  await registerDocument(testDocument1, testUser1);
  await registerDocument(testDocument2, testUser2); // Document 2 owned by User 2

  // --- Test 1: createTag action ---
  await t.step("should successfully create a new tag", async () => {
    const title = "Important";
    console.log(`Attempting to create tag '${title}' for user '${testUser1}'`);
    const result = await concept.createTag({ creator: testUser1, title });

    assertExists((result as { tag: ID }).tag, "Tag ID should be returned");
    const tagId = (result as { tag: ID }).tag;

    // Verify effect: tag exists in DB
    const foundTag = await concept.tags.findOne({ _id: tagId });
    assertExists(foundTag, "Tag should be found in the database");
    assertObjectMatch(foundTag, { creator: testUser1, title: title });
    console.log(`Successfully created tag with ID: ${tagId}`);
  });

  await t.step("should fail to create a duplicate tag", async () => {
    const title = "Important"; // Same title, same user
    console.log(`Attempting to create duplicate tag '${title}' for user '${testUser1}'`);
    const result = await concept.createTag({ creator: testUser1, title });

    assertExists((result as { error: string }).error, "Error should be returned for duplicate tag");
    assertEquals(
      (result as { error: string }).error,
      `Tag with title 'Important' already exists for creator ${testUser1}.`,
      "Error message should indicate duplicate tag",
    );
    console.log(`Correctly prevented duplicate tag creation.`);
  });

  await t.step("should allow creating tags with same title by different users", async () => {
    const title = "Todo";
    console.log(`Attempting to create tag '${title}' for user '${testUser1}'`);
    const result1 = await concept.createTag({ creator: testUser1, title });
    assertExists((result1 as { tag: ID }).tag, "Tag ID should be returned for user 1");
    console.log(`Attempting to create tag '${title}' for user '${testUser2}'`);
    const result2 = await concept.createTag({ creator: testUser2, title });
    assertExists((result2 as { tag: ID }).tag, "Tag ID should be returned for user 2");
    console.log(`Successfully created same-named tags for different users.`);
  });

  // Fetch created tags for later use
  const tagImportant = (await concept._getTagByCreatorAndTitle({ creator: testUser1, title: "Important" }))
    .tag as TagID;
  const tagTodoUser1 = (await concept._getTagByCreatorAndTitle({ creator: testUser1, title: "Todo" }))
    .tag as TagID;
  const tagTodoUser2 = (await concept._getTagByCreatorAndTitle({ creator: testUser2, title: "Todo" }))
    .tag as TagID;

  // --- Test 2: createAnnotation action ---
  await t.step("should successfully create an annotation with color", async () => {
    console.log(
      `Attempting to create annotation for user '${testUser1}', doc '${testDocument1}', color '#FF0000'`,
    );
    const result = await concept.createAnnotation({
      creator: testUser1,
      document: testDocument1,
      color: "#FF0000",
      location: testLocation1,
      tags: [],
    });

    assertExists((result as { annotation: ID }).annotation, "Annotation ID should be returned");
    const annotationId = (result as { annotation: ID }).annotation;

    // Verify effects
    const foundAnnotation = await concept.annotations.findOne({ _id: annotationId });
    assertExists(foundAnnotation, "Annotation should be found in the database");
    assertObjectMatch(foundAnnotation, {
      creator: testUser1,
      document: testDocument1,
      color: "#FF0000",
      content: undefined,
      location: testLocation1,
      tags: [],
    });

    const docRef = await concept.documents.findOne({ _id: testDocument1 });
    assertExists(docRef, "Document reference should exist");
    assertEquals(
      docRef.annotations.includes(annotationId),
      true,
      "Document should reference the new annotation",
    );
    console.log(`Successfully created annotation with ID: ${annotationId} (color only).`);
  });

  await t.step("should successfully create an annotation with content and tags", async () => {
    console.log(
      `Attempting to create annotation for user '${testUser1}', doc '${testDocument1}', content 'Review this' with tags '[${tagImportant}, ${tagTodoUser1}]'`,
    );
    const result = await concept.createAnnotation({
      creator: testUser1,
      document: testDocument1,
      content: "Review this section",
      location: testLocation2,
      tags: [tagImportant, tagTodoUser1],
    });

    assertExists((result as { annotation: ID }).annotation, "Annotation ID should be returned");
    const annotationId = (result as { annotation: ID }).annotation;

    const foundAnnotation = await concept.annotations.findOne({ _id: annotationId });
    assertExists(foundAnnotation, "Annotation should be found in the database");
    assertObjectMatch(foundAnnotation, {
      creator: testUser1,
      document: testDocument1,
      color: undefined,
      content: "Review this section",
      location: testLocation2,
      tags: [tagImportant, tagTodoUser1],
    });

    const docRef = await concept.documents.findOne({ _id: testDocument1 });
    assertEquals(
      docRef?.annotations.includes(annotationId),
      true,
      "Document should reference the new annotation",
    );
    console.log(
      `Successfully created annotation with ID: ${annotationId} (content and tags).`,
    );
  });

  await t.step("should fail to create annotation if document does not exist (in concept's view)", async () => {
    const nonExistentDoc: ID = freshID();
    console.log(
      `Attempting to create annotation for non-existent document '${nonExistentDoc}'`,
    );
    const result = await concept.createAnnotation({
      creator: testUser1,
      document: nonExistentDoc,
      content: "Invalid doc",
      location: testLocation1,
      tags: [],
    });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      `Document with ID '${nonExistentDoc}' not found in Annotation concept's view.`,
      "Error message should indicate missing document",
    );
    console.log(`Correctly prevented annotation for non-existent document.`);
  });

  await t.step("should fail to create annotation if document creator does not match", async () => {
    console.log(
      `Attempting to create annotation for doc '${testDocument1}' (owner ${testUser1}) by user '${testUser2}'`,
    );
    const result = await concept.createAnnotation({
      creator: testUser2, // Wrong creator
      document: testDocument1, // Owned by testUser1
      content: "Unauthorized attempt",
      location: testLocation1,
      tags: [],
    });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      `Document with ID '${testDocument1}' was not created by user '${testUser2}'.`,
      "Error message should indicate wrong creator",
    );
    console.log(`Correctly prevented annotation by unauthorized user.`);
  });

  await t.step("should fail to create annotation if both color and content are omitted", async () => {
    console.log(
      `Attempting to create annotation for user '${testUser1}', doc '${testDocument1}' with no color or content`,
    );
    const result = await concept.createAnnotation({
      creator: testUser1,
      document: testDocument1,
      location: testLocation1,
      tags: [],
    });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      "At least one of 'color' or 'content' must be provided.",
      "Error message should indicate missing color/content",
    );
    console.log(`Correctly prevented annotation without color or content.`);
  });

  await t.step("should fail to create annotation with invalid color format", async () => {
    console.log(
      `Attempting to create annotation for user '${testUser1}', doc '${testDocument1}' with invalid color 'RED'`,
    );
    const result = await concept.createAnnotation({
      creator: testUser1,
      document: testDocument1,
      color: "RED", // Invalid HTML color
      content: "Some text",
      location: testLocation1,
      tags: [],
    });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      "Provided 'color' is not a valid HTML hex color string.",
      "Error message should indicate invalid color format",
    );
    console.log(`Correctly prevented annotation with invalid color.`);
  });

  await t.step("should fail to create annotation with non-existent tags", async () => {
    const nonExistentTag: ID = freshID();
    console.log(
      `Attempting to create annotation with non-existent tag '${nonExistentTag}'`,
    );
    const result = await concept.createAnnotation({
      creator: testUser1,
      document: testDocument1,
      content: "Test with invalid tag",
      location: testLocation1,
      tags: [nonExistentTag],
    });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      `One or more tags not found or not created by user '${testUser1}': ${nonExistentTag}`,
      "Error message should indicate missing tags",
    );
    console.log(`Correctly prevented annotation with non-existent tag.`);
  });

  await t.step("should fail to create annotation with tags not created by the user", async () => {
    console.log(
      `Attempting to create annotation with tag '${tagTodoUser2}' (created by ${testUser2}) by user '${testUser1}'`,
    );
    const result = await concept.createAnnotation({
      creator: testUser1,
      document: testDocument1,
      content: "Test with unauthorized tag",
      location: testLocation1,
      tags: [tagTodoUser2],
    });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      `One or more tags not found or not created by user '${testUser1}': ${tagTodoUser2}`,
      "Error message should indicate unauthorized tag",
    );
    console.log(`Correctly prevented annotation with unauthorized tag.`);
  });

  // Fetch created annotation IDs for later use
  const annotationsForDoc1 = (await concept.annotations.find({ creator: testUser1, document: testDocument1 }).toArray());
  const annotation1Id = annotationsForDoc1.find((a) => a.color === "#FF0000")!._id;
  const annotation2Id = annotationsForDoc1.find((a) => a.content === "Review this section")!._id;

  // --- Test 3: deleteAnnotation action ---
  await t.step("should successfully delete an annotation", async () => {
    console.log(`Attempting to delete annotation '${annotation1Id}' by user '${testUser1}'`);
    const initialDocAnnotationsCount = (await concept._getDocumentRef({ document: testDocument1 }))
      .document
      .annotations.length;

    const result = await concept.deleteAnnotation({ user: testUser1, annotation: annotation1Id });
    assertEquals(result, {}, "Empty object should be returned on success");

    // Verify effects
    const foundAnnotation = await concept.annotations.findOne({ _id: annotation1Id });
    assertEquals(foundAnnotation, null, "Annotation should be removed from the database");

    const docRef = await concept._getDocumentRef({ document: testDocument1 });
    assertEquals(
      docRef.document.annotations.length,
      initialDocAnnotationsCount - 1,
      "Document should no longer reference the deleted annotation",
    );
    assertEquals(
      docRef.document.annotations.includes(annotation1Id),
      false,
      "Document should not contain the deleted annotation ID",
    );
    console.log(`Successfully deleted annotation '${annotation1Id}'.`);
  });

  await t.step("should fail to delete a non-existent annotation", async () => {
    const nonExistentAnnotation: ID = freshID();
    console.log(
      `Attempting to delete non-existent annotation '${nonExistentAnnotation}' by user '${testUser1}'`,
    );
    const result = await concept.deleteAnnotation({
      user: testUser1,
      annotation: nonExistentAnnotation,
    });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      `Annotation with ID '${nonExistentAnnotation}' not found.`,
      "Error message should indicate missing annotation",
    );
    console.log(`Correctly prevented deletion of non-existent annotation.`);
  });

  await t.step("should fail to delete an annotation if user is not the creator", async () => {
    // annotation2Id is created by testUser1
    console.log(
      `Attempting to delete annotation '${annotation2Id}' (creator ${testUser1}) by user '${testUser2}'`,
    );
    const result = await concept.deleteAnnotation({ user: testUser2, annotation: annotation2Id });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      `User '${testUser2}' is not the creator of annotation '${annotation2Id}'.`,
      "Error message should indicate wrong creator",
    );
    console.log(`Correctly prevented deletion by unauthorized user.`);
  });

  // --- Test 4: updateAnnotation action ---
  const annotationToUpdateId = annotation2Id; // This one still exists
  await t.step("should successfully update an annotation's content and location", async () => {
    const newContent = "Updated content for review";
    const newLocation: ID = "loc-section-2-updated" as ID;
    console.log(
      `Attempting to update annotation '${annotationToUpdateId}' with new content '${newContent}' and location '${newLocation}'`,
    );
    const result = await concept.updateAnnotation({
      user: testUser1,
      annotation: annotationToUpdateId,
      newContent,
      newLocation,
    });
    assertEquals(result, {}, "Empty object should be returned on success");

    // Verify effects
    const updatedAnnotation = await concept.annotations.findOne({ _id: annotationToUpdateId });
    assertExists(updatedAnnotation, "Annotation should still exist");
    assertObjectMatch(updatedAnnotation, {
      content: newContent,
      location: newLocation,
      creator: testUser1, // Other fields should remain unchanged
    });
    console.log(`Successfully updated annotation '${annotationToUpdateId}'.`);
  });

  await t.step("should successfully update an annotation's color and tags", async () => {
    const newColor = "#00FF00";
    const newTags: TagID[] = [tagTodoUser1];
    console.log(
      `Attempting to update annotation '${annotationToUpdateId}' with new color '${newColor}' and tags '${newTags}'`,
    );
    const result = await concept.updateAnnotation({
      user: testUser1,
      annotation: annotationToUpdateId,
      newColor,
      newTags,
    });
    assertEquals(result, {}, "Empty object should be returned on success");

    // Verify effects
    const updatedAnnotation = await concept.annotations.findOne({ _id: annotationToUpdateId });
    assertExists(updatedAnnotation, "Annotation should still exist");
    assertObjectMatch(updatedAnnotation, {
      color: newColor,
      tags: newTags,
      creator: testUser1,
    });
    // Ensure content (previously "Updated content for review") is still present as it wasn't omitted
    assertEquals(updatedAnnotation?.content, "Updated content for review", "Content should not be removed");
    console.log(`Successfully updated annotation '${annotationToUpdateId}' color and tags.`);
  });

  await t.step("should fail to update a non-existent annotation", async () => {
    const nonExistentAnnotation: ID = freshID();
    console.log(
      `Attempting to update non-existent annotation '${nonExistentAnnotation}' by user '${testUser1}'`,
    );
    const result = await concept.updateAnnotation({
      user: testUser1,
      annotation: nonExistentAnnotation,
      newContent: "Nope",
    });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      `Annotation with ID '${nonExistentAnnotation}' not found.`,
      "Error message should indicate missing annotation",
    );
    console.log(`Correctly prevented update of non-existent annotation.`);
  });

  await t.step("should fail to update an annotation if user is not the creator", async () => {
    // annotationToUpdateId is created by testUser1
    console.log(
      `Attempting to update annotation '${annotationToUpdateId}' (creator ${testUser1}) by user '${testUser2}'`,
    );
    const result = await concept.updateAnnotation({
      user: testUser2, // Wrong creator
      annotation: annotationToUpdateId,
      newContent: "Unauthorized update",
    });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      `User '${testUser2}' is not the creator of annotation '${annotationToUpdateId}'.`,
      "Error message should indicate wrong creator",
    );
    console.log(`Correctly prevented unauthorized annotation update.`);
  });

  await t.step("should fail to update annotation with invalid new color format", async () => {
    console.log(
      `Attempting to update annotation '${annotationToUpdateId}' with invalid new color 'BLUE'`,
    );
    const result = await concept.updateAnnotation({
      user: testUser1,
      annotation: annotationToUpdateId,
      newColor: "BLUE",
    });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      "Provided 'newColor' is not a valid HTML hex color string.",
      "Error message should indicate invalid color format",
    );
    console.log(`Correctly prevented update with invalid new color.`);
  });

  await t.step("should fail to update annotation with non-existent new tags", async () => {
    const nonExistentTag: ID = freshID();
    console.log(
      `Attempting to update annotation '${annotationToUpdateId}' with non-existent new tag '${nonExistentTag}'`,
    );
    const result = await concept.updateAnnotation({
      user: testUser1,
      annotation: annotationToUpdateId,
      newTags: [nonExistentTag],
    });
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      `One or more 'newTags' not found or not created by user '${testUser1}': ${nonExistentTag}`,
      "Error message should indicate missing new tags",
    );
    console.log(`Correctly prevented update with non-existent new tag.`);
  });

  await t.step("should fail to update annotation such that both color and content become omitted", async () => {
    // Current annotationToUpdateId has color and content.
    // Let's create a new one that starts with only color or only content to properly test this.
    console.log(`Creating a temporary annotation with only color for specific update test.`);
    const tempAnnotationResult = await concept.createAnnotation({
      creator: testUser1,
      document: testDocument1,
      color: "#CCCCCC",
      location: testLocation3,
      tags: [],
    });
    const tempAnnotationId = (tempAnnotationResult as { annotation: ID }).annotation;
    assertExists(tempAnnotationId);
    console.log(`Temporary annotation created: ${tempAnnotationId}.`);

    console.log(
      `Attempting to update temporary annotation '${tempAnnotationId}' by setting content to undefined and not providing color.`,
    );
    const result = await concept.updateAnnotation({
      user: testUser1,
      annotation: tempAnnotationId,
      newContent: undefined, // Explicitly remove content
      // newColor is omitted, so it would remain undefined from initial state
    });

    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      "Updating this annotation would result in both 'color' and 'content' being omitted.",
      "Error message should indicate that both color and content would be omitted",
    );

    // Clean up temporary annotation
    await concept.annotations.deleteOne({ _id: tempAnnotationId });
    await concept.documents.updateOne(
      { _id: testDocument1 },
      { $pull: { annotations: tempAnnotationId } },
    );
    console.log(`Correctly prevented update resulting in both color and content omitted. Temporary annotation cleaned up.`);
  });

  // --- Test 5: search action ---
  await t.step("should search by content keyword (case-insensitive)", async () => {
    console.log(
      `Searching for annotations by user '${testUser1}' in doc '${testDocument1}' with criteria 'review'`,
    );
    const result = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "review",
    });
    assertEquals((result as { error: string }).error, undefined);
    const annotations = (result as { annotations: any[] }).annotations;
    assertEquals(annotations.length, 1, "Should find one matching annotation");
    assertEquals(
      annotations[0].content,
      "Updated content for review",
      "Found annotation content should match",
    );
    console.log(`Found 1 annotation matching 'review'.`);
  });

  await t.step("should search by tag title keyword (case-insensitive)", async () => {
    console.log(
      `Searching for annotations by user '${testUser1}' in doc '${testDocument1}' with criteria 'important'`,
    );
    const result = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "important",
    });
    assertEquals((result as { error: string }).error, undefined);
    const annotations = (result as { annotations: any[] }).annotations;
    assertEquals(annotations.length, 1, "Should find one matching annotation");
    assertEquals(
      annotations[0].tags.includes(tagImportant),
      true,
      "Found annotation should have the 'important' tag",
    );
    console.log(`Found 1 annotation matching 'important' tag.`);
  });

  await t.step("should search by both content or tag keyword (OR logic)", async () => {
    console.log(
      `Searching for annotations by user '${testUser1}' in doc '${testDocument1}' with criteria 'updated'`,
    );
    const result = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "updated",
    });
    assertEquals((result as { error: string }).error, undefined);
    const annotations = (result as { annotations: any[] }).annotations;
    assertEquals(annotations.length, 1, "Should find one matching annotation");
    assertEquals(annotations[0].content, "Updated content for review");

    console.log(
      `Searching for annotations by user '${testUser1}' in doc '${testDocument1}' with criteria 'todo'`,
    );
    const result2 = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "todo",
    });
    assertEquals((result2 as { error: string }).error, undefined);
    const annotations2 = (result2 as { annotations: any[] }).annotations;
    assertEquals(annotations2.length, 1, "Should find one matching annotation");
    assertEquals(annotations2[0].tags.includes(tagTodoUser1), true);

    console.log(
      `Searching for annotations by user '${testUser1}' in doc '${testDocument1}' with criteria 'review' (should match both content and tags)`,
    );
    const result3 = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "review", // Assuming original 'Review this section' has been updated
    });
    assertEquals((result3 as { error: string }).error, undefined);
    const annotations3 = (result3 as { annotations: any[] }).annotations;
    assertEquals(annotations3.length, 1, "Should find one matching annotation");
    assertEquals(annotations3[0].content, "Updated content for review");

    console.log(`Demonstrated OR logic search.`);
  });

  await t.step("should return an empty list if no annotations match", async () => {
    console.log(
      `Searching for annotations by user '${testUser1}' in doc '${testDocument1}' with criteria 'nomatch'`,
    );
    const result = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "nomatch",
    });
    assertEquals((result as { error: string }).error, undefined);
    const annotations = (result as { annotations: any[] }).annotations;
    assertEquals(annotations.length, 0, "Should find no matching annotations");
    console.log(`Correctly returned empty list for no match.`);
  });

  await t.step("should return all annotations for the user and document if criteria is empty", async () => {
    console.log(
      `Searching for all annotations by user '${testUser1}' in doc '${testDocument1}' with empty criteria`,
    );
    const result = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "",
    });
    assertEquals((result as { error: string }).error, undefined);
    const annotations = (result as { annotations: any[] }).annotations;
    assertEquals(annotations.length, 1, "Should find all existing annotations (1 remaining)"); // Only one annotation left after deletion
    console.log(`Returned all 1 remaining annotation for empty criteria.`);
  });

  await t.step("should return only annotations for the specified user, not others", async () => {
    // Create an annotation by testUser2 on testDocument2
    await concept.createTag({ creator: testUser2, title: "Private" });
    const tagPrivateUser2 = (await concept._getTagByCreatorAndTitle({ creator: testUser2, title: "Private" }))
      .tag as TagID;

    const annotationUser2Result = await concept.createAnnotation({
      creator: testUser2,
      document: testDocument2,
      content: "Secret note for Bob",
      location: testLocation1,
      tags: [tagPrivateUser2],
    });
    const annotationUser2Id = (annotationUser2Result as { annotation: ID }).annotation;
    assertExists(annotationUser2Id);
    console.log(`Created annotation '${annotationUser2Id}' for user '${testUser2}' on doc '${testDocument2}'.`);

    console.log(
      `Searching for annotations by user '${testUser1}' in doc '${testDocument2}' with criteria 'Secret'`,
    );
    const result = await concept.search({
      user: testUser1,
      document: testDocument2,
      criteria: "Secret",
    });
    assertEquals((result as { error: string }).error, undefined);
    const annotations = (result as { annotations: any[] }).annotations;
    assertEquals(
      annotations.length,
      0,
      "User 1 should not find annotations by User 2, even on same document (if accessible, which it's not here)",
    );

    console.log(
      `Searching for annotations by user '${testUser2}' in doc '${testDocument2}' with criteria 'Secret'`,
    );
    const result2 = await concept.search({
      user: testUser2,
      document: testDocument2,
      criteria: "Secret",
    });
    assertEquals((result2 as { error: string }).error, undefined);
    const annotations2 = (result2 as { annotations: any[] }).annotations;
    assertEquals(annotations2.length, 1, "User 2 should find their own annotation");
    assertEquals(annotations2[0]._id, annotationUser2Id);
    console.log(`Correctly restricted search results to the requesting user's annotations.`);
  });

  await t.step("should fail to search if document does not exist (in concept's view)", async () => {
    const nonExistentDoc: ID = freshID();
    console.log(
      `Attempting to search for annotations in non-existent document '${nonExistentDoc}'`,
    );
    const result = await concept.search({
      creator: testUser1,
      document: nonExistentDoc,
      criteria: "any",
    } as any); // Type assertion as 'creator' is not an argument in search
    assertExists((result as { error: string }).error, "Error should be returned");
    assertEquals(
      (result as { error: string }).error,
      `Document with ID '${nonExistentDoc}' not found in Annotation concept's view.`,
      "Error message should indicate missing document",
    );
    console.log(`Correctly prevented search for non-existent document.`);
  });

  // --- Principle Trace Test ---
  await t.step("Principle Trace: users can create, view, label, search, update and delete annotations", async () => {
    console.log("\n--- Starting Principle Trace ---");

    // Trace step 1: Alice (testUser1) reads a document (testDocument1)
    // Document is already registered for testUser1.

    // Trace step 2: Alice creates a tag
    const aliceTagResult = await concept.createTag({ creator: testUser1, title: "Important Note" });
    const aliceTagId = (aliceTagResult as { tag: ID }).tag;
    assertExists(aliceTagId);
    console.log(`Trace: Alice created tag '${aliceTagId}' ('Important Note').`);

    // Trace step 3: Alice creates a highlighting annotation (color only)
    const highlightAnnotationResult = await concept.createAnnotation({
      creator: testUser1,
      document: testDocument1,
      color: "#FFFF00", // Yellow highlight
      location: testLocation1,
      tags: [],
    });
    const highlightAnnotationId = (highlightAnnotationResult as { annotation: ID }).annotation;
    assertExists(highlightAnnotationId);
    console.log(`Trace: Alice created highlight annotation '${highlightAnnotationId}'.`);

    // Trace step 4: Alice creates a text annotation (content only)
    const textAnnotationResult = await concept.createAnnotation({
      creator: testUser1,
      document: testDocument1,
      content: "This is a key point to remember.",
      location: testLocation2,
      tags: [],
    });
    const textAnnotationId = (textAnnotationResult as { annotation: ID }).annotation;
    assertExists(textAnnotationId);
    console.log(`Trace: Alice created text annotation '${textAnnotationId}'.`);

    // Trace step 5: Alice creates another text annotation with the tag
    const taggedAnnotationResult = await concept.createAnnotation({
      creator: testUser1,
      document: testDocument1,
      content: "Follow-up required on this paragraph.",
      location: testLocation3,
      tags: [aliceTagId],
    });
    const taggedAnnotationId = (taggedAnnotationResult as { annotation: ID }).annotation;
    assertExists(taggedAnnotationId);
    console.log(`Trace: Alice created tagged annotation '${taggedAnnotationId}'.`);

    // Trace step 6: Alice views/searches for annotations
    console.log(`Trace: Alice searches for all annotations in document '${testDocument1}'.`);
    const allAnnotationsResult = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "",
    });
    assertEquals((allAnnotationsResult as { annotations: any[] }).annotations.length, 3); // excluding the one deleted earlier
    console.log(`Trace: Found 3 annotations for Alice in document '${testDocument1}'.`);

    console.log(`Trace: Alice searches for annotations with keyword 'key'.`);
    const searchByKeyResult = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "key",
    });
    assertEquals((searchByKeyResult as { annotations: any[] }).annotations.length, 1);
    assertEquals((searchByKeyResult as { annotations: any[] }).annotations[0]._id, textAnnotationId);
    console.log(`Trace: Found 1 annotation with keyword 'key'.`);

    console.log(`Trace: Alice searches for annotations with tag keyword 'important'.`);
    const searchByTagResult = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "important",
    });
    assertEquals((searchByTagResult as { annotations: any[] }).annotations.length, 1);
    assertEquals((searchByTagResult as { annotations: any[] }).annotations[0]._id, taggedAnnotationId);
    console.log(`Trace: Found 1 annotation with tag keyword 'important'.`);

    // Trace step 7: Alice updates an annotation
    const newContent = "Updated important note for follow-up.";
    console.log(`Trace: Alice updates tagged annotation '${taggedAnnotationId}' with new content.`);
    const updateResult = await concept.updateAnnotation({
      user: testUser1,
      annotation: taggedAnnotationId,
      newContent: newContent,
      newColor: "#ADD8E6", // Light Blue
      newTags: [aliceTagId, tagTodoUser1],
    });
    assertEquals(updateResult, {}, "Update should be successful");

    const updatedAnnotation = await concept._getAnnotation({ annotation: taggedAnnotationId });
    assertEquals((updatedAnnotation as any).annotation.content, newContent);
    assertEquals((updatedAnnotation as any).annotation.color, "#ADD8E6");
    assertEquals((updatedAnnotation as any).annotation.tags.includes(tagTodoUser1), true);
    console.log(`Trace: Tagged annotation '${taggedAnnotationId}' successfully updated.`);

    // Trace step 8: Alice deletes an annotation
    console.log(`Trace: Alice deletes highlight annotation '${highlightAnnotationId}'.`);
    const deleteResult = await concept.deleteAnnotation({ user: testUser1, annotation: highlightAnnotationId });
    assertEquals(deleteResult, {}, "Deletion should be successful");

    const deletedAnnotation = await concept.annotations.findOne({ _id: highlightAnnotationId });
    assertEquals(deletedAnnotation, null, "Annotation should be gone after deletion");
    console.log(`Trace: Highlight annotation '${highlightAnnotationId}' successfully deleted.`);

    console.log("--- Principle Trace Complete ---");
  });

  await client.close();
});
```
