---
timestamp: 'Thu Oct 23 2025 05:41:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_054132.92b79343.md]]'
content_id: 39ec61e365f4f893c448dac29dd884bbb5113a925555db647751a9fa5d1fe654
---

# response:

```typescript
// file: src/concepts/Annotation/AnnotationConcept.test.ts

import { assertEquals, assertExists, assertObjectMatch } from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import AnnotationConcept, {
  AnnotationID,
  DocumentRef,
  TagID,
  AnnotationDoc,
  DocumentDoc,
  TagDoc, // Added for type consistency in helper
} from "./AnnotationConcept.ts"; // Added imports for internal interfaces
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
    docId: DocumentRef, // Use DocumentRef for clarity
    creatorId: User, // Use User for clarity
  ): Promise<void> => {
    await concept.documents.insertOne({
      _id: docId,
      annotations: [],
      creator: creatorId,
    } satisfies DocumentDoc); // Explicitly satisfy DocumentDoc interface
  };

  // Pre-register documents for testing
  await registerDocument(testDocument1, testUser1);
  await registerDocument(testDocument2, testUser2); // Document 2 owned by User 2

  // --- Test 1: createTag action ---
  await t.step("should successfully create a new tag", async () => {
    const title = "Important";
    console.log(`Attempting to create tag '${title}' for user '${testUser1}'`);
    const result = await concept.createTag({ creator: testUser1, title });

    if ("error" in result) throw new Error(result.error); // Type guard
    const tagId = result.tag;

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
    if ("error" in result1) throw new Error(result1.error);
    const tag1Id = result1.tag;
    assertExists(tag1Id, "Tag ID should be returned for user 1");

    console.log(`Attempting to create tag '${title}' for user '${testUser2}'`);
    const result2 = await concept.createTag({ creator: testUser2, title });
    if ("error" in result2) throw new Error(result2.error);
    const tag2Id = result2.tag;
    assertExists(tag2Id, "Tag ID should be returned for user 2");
    console.log(`Successfully created same-named tags for different users.`);
  });

  // Fetch created tags for later use, using type guards
  const tagImportantResult = await concept._getTagByCreatorAndTitle({ creator: testUser1, title: "Important" });
  if ("error" in tagImportantResult) throw new Error(tagImportantResult.error);
  const tagImportant = tagImportantResult.tag;

  const tagTodoUser1Result = await concept._getTagByCreatorAndTitle({ creator: testUser1, title: "Todo" });
  if ("error" in tagTodoUser1Result) throw new Error(tagTodoUser1Result.error);
  const tagTodoUser1 = tagTodoUser1Result.tag;

  const tagTodoUser2Result = await concept._getTagByCreatorAndTitle({ creator: testUser2, title: "Todo" });
  if ("error" in tagTodoUser2Result) throw new Error(tagTodoUser2Result.error);
  const tagTodoUser2 = tagTodoUser2Result.tag;

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

    if ("error" in result) throw new Error(result.error); // Type guard
    const annotationId = result.annotation;

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

    const docRefResult = await concept._getDocumentRef({ document: testDocument1 }); // Using helper, needs type guard
    if ("error" in docRefResult) throw new Error(docRefResult.error);
    const docRef = docRefResult.document;

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

    if ("error" in result) throw new Error(result.error); // Type guard
    const annotationId = result.annotation;

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

    const docRefResult = await concept._getDocumentRef({ document: testDocument1 }); // Using helper, needs type guard
    if ("error" in docRefResult) throw new Error(docRefResult.error);
    const docRef = docRefResult.document;

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
    const nonExistentDoc: DocumentRef = freshID() as DocumentRef;
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
    const nonExistentTag: TagID = freshID() as TagID;
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

    const initialDocRefResult = await concept._getDocumentRef({ document: testDocument1 }); // Using helper, needs type guard
    if ("error" in initialDocRefResult) throw new Error(initialDocRefResult.error);
    const initialDocAnnotationsCount = initialDocRefResult.document.annotations.length;

    const result = await concept.deleteAnnotation({ user: testUser1, annotation: annotation1Id });
    assertEquals(result, {}, "Empty object should be returned on success");

    // Verify effects
    const foundAnnotation = await concept.annotations.findOne({ _id: annotation1Id });
    assertEquals(foundAnnotation, null, "Annotation should be removed from the database");

    const docRefAfterDeletionResult = await concept._getDocumentRef({ document: testDocument1 }); // Using helper, needs type guard
    if ("error" in docRefAfterDeletionResult) throw new Error(docRefAfterDeletionResult.error);
    const docRef = docRefAfterDeletionResult.document;

    assertEquals(
      docRef.annotations.length,
      initialDocAnnotationsCount - 1,
      "Document should no longer reference the deleted annotation",
    );
    assertEquals(
      docRef.annotations.includes(annotation1Id),
      false,
      "Document should not contain the deleted annotation ID",
    );
    console.log(`Successfully deleted annotation '${annotation1Id}'.`);
  });

  await t.step("should fail to delete a non-existent annotation", async () => {
    const nonExistentAnnotation: AnnotationID = freshID() as AnnotationID;
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
    const newLocation: Location = "loc-section-2-updated" as Location;
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
    const nonExistentAnnotation: AnnotationID = freshID() as AnnotationID;
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
    const nonExistentTag: TagID = freshID() as TagID;
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
    const tempAnnotationCreateResult = await concept.createAnnotation({
      creator: testUser1,
      document: testDocument1,
      color: "#CCCCCC",
      location: testLocation3,
      tags: [],
    });
    if ("error" in tempAnnotationCreateResult) throw new Error(tempAnnotationCreateResult.error); // Type guard
    const tempAnnotationId = tempAnnotationCreateResult.annotation;
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
    assertEquals((result as { error: string }).error, undefined); // Assert no error
    if ("error" in result) throw new Error("Unexpected error in search result"); // Type guard
    const annotations = result.annotations; // Now correctly typed as AnnotationDoc[]
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
    assertEquals((result as { error: string }).error, undefined); // Assert no error
    if ("error" in result) throw new Error("Unexpected error in search result"); // Type guard
    const annotations = result.annotations; // Now correctly typed as AnnotationDoc[]
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
    assertEquals((result as { error: string }).error, undefined); // Assert no error
    if ("error" in result) throw new Error("Unexpected error in search result"); // Type guard
    const annotations = result.annotations; // Now correctly typed as AnnotationDoc[]
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
    assertEquals((result2 as { error: string }).error, undefined); // Assert no error
    if ("error" in result2) throw new Error("Unexpected error in search result"); // Type guard
    const annotations2 = result2.annotations; // Now correctly typed as AnnotationDoc[]
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
    assertEquals((result3 as { error: string }).error, undefined); // Assert no error
    if ("error" in result3) throw new Error("Unexpected error in search result"); // Type guard
    const annotations3 = result3.annotations; // Now correctly typed as AnnotationDoc[]
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
    assertEquals((result as { error: string }).error, undefined); // Assert no error
    if ("error" in result) throw new Error("Unexpected error in search result"); // Type guard
    const annotations = result.annotations; // Now correctly typed as AnnotationDoc[]
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
    assertEquals((result as { error: string }).error, undefined); // Assert no error
    if ("error" in result) throw new Error("Unexpected error in search result"); // Type guard
    const annotations = result.annotations; // Now correctly typed as AnnotationDoc[]
    assertEquals(annotations.length, 1, "Should find all existing annotations (1 remaining)"); // Only one annotation left after deletion
    console.log(`Returned all 1 remaining annotation for empty criteria.`);
  });

  await t.step("should return only annotations for the specified user, not others", async () => {
    // Create an annotation by testUser2 on testDocument2
    const privateTagResult = await concept.createTag({ creator: testUser2, title: "Private" });
    if ("error" in privateTagResult) throw new Error(privateTagResult.error);
    const tagPrivateUser2 = privateTagResult.tag;

    const annotationUser2CreateResult = await concept.createAnnotation({
      creator: testUser2,
      document: testDocument2,
      content: "Secret note for Bob",
      location: testLocation1,
      tags: [tagPrivateUser2],
    });
    if ("error" in annotationUser2CreateResult) throw new Error(annotationUser2CreateResult.error);
    const annotationUser2Id = annotationUser2CreateResult.annotation;
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
    assertEquals((result as { error: string }).error, undefined); // Assert no error
    if ("error" in result) throw new Error("Unexpected error in search result"); // Type guard
    const annotations = result.annotations; // Now correctly typed as AnnotationDoc[]
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
    assertEquals((result2 as { error: string }).error, undefined); // Assert no error
    if ("error" in result2) throw new Error("Unexpected error in search result"); // Type guard
    const annotations2 = result2.annotations; // Now correctly typed as AnnotationDoc[]
    assertEquals(annotations2.length, 1, "User 2 should find their own annotation");
    assertEquals(annotations2[0]._id, annotationUser2Id);
    console.log(`Correctly restricted search results to the requesting user's annotations.`);
  });

  await t.step("should fail to search if document does not exist (in concept's view)", async () => {
    const nonExistentDoc: DocumentRef = freshID() as DocumentRef;
    console.log(
      `Attempting to search for annotations in non-existent document '${nonExistentDoc}'`,
    );
    const result = await concept.search({
      user: testUser1, // Use `user` argument from signature, not `creator`
      document: nonExistentDoc,
      criteria: "any",
    });
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
    if ("error" in aliceTagResult) throw new Error(aliceTagResult.error); // Type guard
    const aliceTagId = aliceTagResult.tag;
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
    if ("error" in highlightAnnotationResult) throw new Error(highlightAnnotationResult.error); // Type guard
    const highlightAnnotationId = highlightAnnotationResult.annotation;
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
    if ("error" in textAnnotationResult) throw new Error(textAnnotationResult.error); // Type guard
    const textAnnotationId = textAnnotationResult.annotation;
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
    if ("error" in taggedAnnotationResult) throw new Error(taggedAnnotationResult.error); // Type guard
    const taggedAnnotationId = taggedAnnotationResult.annotation;
    assertExists(taggedAnnotationId);
    console.log(`Trace: Alice created tagged annotation '${taggedAnnotationId}'.`);

    // Trace step 6: Alice views/searches for annotations
    console.log(`Trace: Alice searches for all annotations in document '${testDocument1}'.`);
    const allAnnotationsResult = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "",
    });
    if ("error" in allAnnotationsResult) throw new Error(allAnnotationsResult.error); // Type guard
    assertEquals(allAnnotationsResult.annotations.length, 3); // excluding the one deleted earlier
    console.log(`Trace: Found 3 annotations for Alice in document '${testDocument1}'.`);

    console.log(`Trace: Alice searches for annotations with keyword 'key'.`);
    const searchByKeyResult = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "key",
    });
    if ("error" in searchByKeyResult) throw new Error(searchByKeyResult.error); // Type guard
    assertEquals(searchByKeyResult.annotations.length, 1);
    assertEquals(searchByKeyResult.annotations[0]._id, textAnnotationId);
    console.log(`Trace: Found 1 annotation with keyword 'key'.`);

    console.log(`Trace: Alice searches for annotations with tag keyword 'important'.`);
    const searchByTagResult = await concept.search({
      user: testUser1,
      document: testDocument1,
      criteria: "important",
    });
    if ("error" in searchByTagResult) throw new Error(searchByTagResult.error); // Type guard
    assertEquals(searchByTagResult.annotations.length, 1);
    assertEquals(searchByTagResult.annotations[0]._id, taggedAnnotationId);
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

    const updatedAnnotationResult = await concept._getAnnotation({ annotation: taggedAnnotationId }); // Using helper, needs type guard
    if ("error" in updatedAnnotationResult) throw new Error(updatedAnnotationResult.error);
    const updatedAnnotation = updatedAnnotationResult.annotation;

    assertEquals(updatedAnnotation.content, newContent);
    assertEquals(updatedAnnotation.color, "#ADD8E6");
    assertEquals(updatedAnnotation.tags.includes(tagTodoUser1), true);
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
