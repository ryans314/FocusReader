---
timestamp: 'Thu Oct 23 2025 05:25:45 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_052545.47443578.md]]'
content_id: ce54e62c860fbc534b42491317f95da01b8e9a24071796e9d1ef0b24e666f40d
---

# Test: Annotation

## file: src/concepts/Annotation/AnnotationConcept.test.ts

```typescript
import { assertEquals, assertExists, assertInstanceOf, assertNotEquals, assertArrayIncludes } from "jsr:@std/assert";
import { testDb, freshID } from "@utils/database.ts";
import AnnotationConcept from "./AnnotationConcept.ts";
import { AnnotationDoc, TagDoc, DocumentDoc } from "./AnnotationConcept.ts"; // Import interfaces for type checking
import { ID } from "@utils/types.ts";

// Define mock GeminiLLM for testing
interface MockLLM {
  processAnnotations: (
    description: string,
    allAnnotations: AnnotationDoc[],
  ) => Promise<ID[]>;
}

const mockLLM: MockLLM = {
  processAnnotations: async (description: string, allAnnotations: AnnotationDoc[]): Promise<ID[]> => {
    if (description.includes("highlighted important parts")) {
      return allAnnotations.filter((ann) => ann.content?.includes("important")).map((ann) => ann._id);
    }
    if (description.includes("red annotations")) {
      return allAnnotations.filter((ann) => ann.color === "#FF0000").map((ann) => ann._id);
    }
    if (description.includes("general comments")) {
      return allAnnotations.filter((ann) => ann.content && !ann.color).map((ann) => ann._id);
    }
    if (description.includes("no matches")) {
      return [];
    }
    return allAnnotations.map((ann) => ann._id); // Default: return all annotations
  },
};

Deno.test("Annotation Concept Tests", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  // Mock external IDs
  const user1 = "user:Alice" as ID;
  const user2 = "user:Bob" as ID;
  const document1 = "document:Article1" as ID;
  const document2 = "document:Report2" as ID;
  const location1 = "location:para1_word5" as ID;
  const location2 = "location:page2_line10" as ID;
  const location3 = "location:char_index_100_200" as ID;
  const location4 = "location:fig3_caption" as ID;

  // Helper to pre-populate a document into the Annotation concept's view
  const setupDocument = async (docId: ID, creator: ID) => {
    await concept.documents.insertOne({
      _id: docId,
      creator: creator,
      annotations: [],
    });
    console.log(`  Setup: Document ${docId} created by ${creator}`);
  };

  Deno.test(t, "1. Principle: basic annotation lifecycle and search", async () => {
    console.log("\n--- Trace: Principle ---");

    // 1. Setup: Create documents in the concept's view
    await setupDocument(document1, user1);

    // 2. User creates tags
    console.log("  Action: User1 creates tag 'Important'");
    const tagResult1 = await concept.createTag({ creator: user1, title: "Important" });
    assertExists(tagResult1.tag);
    const tag1 = tagResult1.tag;
    console.log(`    Tag 'Important' created with ID: ${tag1}`);

    console.log("  Action: User1 creates tag 'Clarification'");
    const tagResult2 = await concept.createTag({ creator: user1, title: "Clarification" });
    assertExists(tagResult2.tag);
    const tag2 = tagResult2.tag;
    console.log(`    Tag 'Clarification' created with ID: ${tag2}`);

    // 3. User creates annotations
    console.log("  Action: User1 creates first annotation (highlight)");
    const annResult1 = await concept.createAnnotation({
      creator: user1,
      document: document1,
      color: "#FFFF00", // Yellow highlight
      content: undefined,
      location: location1,
      tags: [tag1],
    });
    assertExists(annResult1.annotation);
    const annotation1 = annResult1.annotation;
    console.log(`    Annotation 1 (highlight) created with ID: ${annotation1}`);

    console.log("  Action: User1 creates second annotation (text comment)");
    const annResult2 = await concept.createAnnotation({
      creator: user1,
      document: document1,
      color: undefined,
      content: "This part is important for the conclusion.",
      location: location2,
      tags: [tag1, tag2],
    });
    assertExists(annResult2.annotation);
    const annotation2 = annResult2.annotation;
    console.log(`    Annotation 2 (comment) created with ID: ${annotation2}`);

    console.log("  Action: User1 creates third annotation (red comment)");
    const annResult3 = await concept.createAnnotation({
      creator: user1,
      document: document1,
      color: "#FF0000", // Red comment
      content: "Consider this alternative perspective.",
      location: location3,
      tags: [],
    });
    assertExists(annResult3.annotation);
    const annotation3 = annResult3.annotation;
    console.log(`    Annotation 3 (red comment) created with ID: ${annotation3}`);

    // Verify initial state
    const docState = await concept._getDocumentRef({ document: document1 });
    assertExists(docState.document);
    assertEquals(docState.document.annotations.length, 3);
    assertArrayIncludes(docState.document.annotations, [annotation1, annotation2, annotation3]);
    console.log(`    Confirmed: Document ${document1} has 3 annotations.`);

    // 4. User searches for annotations by keyword
    console.log("  Action: User1 searches for 'important' annotations in Document1");
    const searchResult1 = await concept.search({ user: user1, document: document1, criteria: "important" });
    assertExists(searchResult1.annotations);
    assertEquals(searchResult1.annotations.length, 1); // Only annotation2 has "important" in content
    assertEquals(searchResult1.annotations[0]._id, annotation2);
    console.log(`    Search 1 found: ${searchResult1.annotations.length} annotations matching 'important'.`);

    // 5. User searches for annotations by tag
    console.log("  Action: User1 searches for annotations tagged 'Clarification'");
    const searchResult2 = await concept.search({ user: user1, document: document1, criteria: "Clarification" });
    assertExists(searchResult2.annotations);
    assertEquals(searchResult2.annotations.length, 1); // Only annotation2 has tag2
    assertEquals(searchResult2.annotations[0]._id, annotation2);
    console.log(`    Search 2 found: ${searchResult2.annotations.length} annotations tagged 'Clarification'.`);

    // 6. User searches using LLM for "highlighted important parts"
    console.log("  Action: User1 searches using LLM for 'highlighted important parts' in Document1");
    const searchLLMResult1 = await concept.searchLLM({
      user: user1,
      document: document1,
      description: "annotations that highlighted important parts",
      llm: mockLLM,
    });
    assertExists(searchLLMResult1.annotations);
    assertEquals(searchLLMResult1.annotations.length, 1);
    assertEquals(searchLLMResult1.annotations[0]._id, annotation2); // Matches content "important"
    console.log(`    LLM Search 1 found: ${searchLLMResult1.annotations.length} annotations.`);

    // 7. User searches using LLM for "red annotations"
    console.log("  Action: User1 searches using LLM for 'red annotations' in Document1");
    const searchLLMResult2 = await concept.searchLLM({
      user: user1,
      document: document1,
      description: "red annotations",
      llm: mockLLM,
    });
    assertExists(searchLLMResult2.annotations);
    assertEquals(searchLLMResult2.annotations.length, 1);
    assertEquals(searchLLMResult2.annotations[0]._id, annotation3); // Matches color #FF0000
    console.log(`    LLM Search 2 found: ${searchLLMResult2.annotations.length} annotations.`);

    console.log("--- End Trace: Principle ---");
  });

  Deno.test(t, "2. createTag action", async (t_action) => {
    console.log("\n--- Testing createTag ---");
    // Test 2.1: Successful tag creation
    await t_action.step("should create a tag successfully", async () => {
      console.log("  Action: createTag for User1, 'Code Review'");
      const result = await concept.createTag({ creator: user1, title: "Code Review" });
      assertExists(result.tag, "Expected a tag ID to be returned");
      const tagId = result.tag;
      console.log(`    Tag created with ID: ${tagId}`);

      // Verify effect: tag exists in state
      const queryResult = await concept._getTagByCreatorAndTitle({ creator: user1, title: "Code Review" });
      assertExists(queryResult.tag, "Expected to find the created tag via query");
      assertEquals(queryResult.tag, tagId);
      console.log("    Effect confirmed: Tag found in state.");
    });

    // Test 2.2: Cannot create duplicate tag
    await t_action.step("should return an error for duplicate tag creation", async () => {
      console.log("  Action: createTag for User1, 'Code Review' (duplicate)");
      const result = await concept.createTag({ creator: user1, title: "Code Review" });
      assertExists(result.error, "Expected an error for duplicate tag");
      assertEquals(
        result.error,
        `Tag with title 'Code Review' already exists for creator ${user1}.`,
      );
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 2.3: Another user can create a tag with the same title
    await t_action.step("should allow a different user to create a tag with the same title", async () => {
      console.log("  Action: createTag for User2, 'Code Review'");
      const result = await concept.createTag({ creator: user2, title: "Code Review" });
      assertExists(result.tag, "Expected tag creation to succeed for different user");
      const tagId = result.tag;
      console.log(`    Tag created by User2 with ID: ${tagId}`);

      const queryResult = await concept._getTagByCreatorAndTitle({ creator: user2, title: "Code Review" });
      assertExists(queryResult.tag, "Expected to find the created tag by User2");
      assertEquals(queryResult.tag, tagId);
      console.log("    Effect confirmed: Tag found for User2.");
    });
    console.log("--- End createTag ---");
  });

  Deno.test(t, "3. createAnnotation action", async (t_action) => {
    console.log("\n--- Testing createAnnotation ---");
    await setupDocument(document2, user1); // Setup a document for annotations
    const tag1Result = await concept.createTag({ creator: user1, title: "Question" });
    const tag1Id = tag1Result.tag as ID;
    const tag2Result = await concept.createTag({ creator: user1, title: "Todo" });
    const tag2Id = tag2Result.tag as ID;
    const tagOtherUserResult = await concept.createTag({ creator: user2, title: "User2Tag" });
    const tagOtherUserId = tagOtherUserResult.tag as ID;

    // Test 3.1: Successful annotation creation with color and tags
    await t_action.step("should create an annotation with color and tags successfully", async () => {
      console.log("  Action: createAnnotation for User1 on Document2 with color and tags");
      const result = await concept.createAnnotation({
        creator: user1,
        document: document2,
        color: "#123456",
        content: undefined,
        location: location1,
        tags: [tag1Id, tag2Id],
      });
      assertExists(result.annotation, "Expected an annotation ID to be returned");
      const annId = result.annotation;
      console.log(`    Annotation created with ID: ${annId}`);

      // Verify effects
      const ann = await concept._getAnnotation({ annotation: annId });
      assertExists(ann.annotation);
      assertEquals(ann.annotation.creator, user1);
      assertEquals(ann.annotation.document, document2);
      assertEquals(ann.annotation.color, "#123456");
      assertEquals(ann.annotation.content, undefined);
      assertEquals(ann.annotation.location, location1);
      assertArrayIncludes(ann.annotation.tags, [tag1Id, tag2Id]);
      console.log("    Effect 1 confirmed: Annotation details match.");

      const doc = await concept._getDocumentRef({ document: document2 });
      assertExists(doc.document);
      assertArrayIncludes(doc.document.annotations, [annId]);
      console.log("    Effect 2 confirmed: Annotation added to document's list.");
    });

    // Test 3.2: Successful annotation creation with content only
    await t_action.step("should create an annotation with content only", async () => {
      console.log("  Action: createAnnotation for User1 on Document2 with content only");
      const result = await concept.createAnnotation({
        creator: user1,
        document: document2,
        color: undefined,
        content: "This is a comment.",
        location: location2,
        tags: [],
      });
      assertExists(result.annotation);
      const annId = result.annotation;
      console.log(`    Annotation created with ID: ${annId}`);

      const ann = await concept._getAnnotation({ annotation: annId });
      assertExists(ann.annotation);
      assertEquals(ann.annotation.content, "This is a comment.");
      assertEquals(ann.annotation.color, undefined);
    });

    // Test 3.3: Error: Document not found
    await t_action.step("should return an error if document does not exist", async () => {
      console.log("  Action: createAnnotation on non-existent document");
      const result = await concept.createAnnotation({
        creator: user1,
        document: "nonexistentDoc" as ID,
        color: "#ABCDEF",
        content: "Foo",
        location: location1,
        tags: [],
      });
      assertExists(result.error, "Expected error for non-existent document");
      assertEquals(result.error, `Document with ID 'nonexistentDoc' not found in Annotation concept's view.`);
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 3.4: Error: Document not created by user
    await t_action.step("should return an error if document creator does not match annotation creator", async () => {
      console.log("  Action: createAnnotation by User2 on Document2 (created by User1)");
      const result = await concept.createAnnotation({
        creator: user2,
        document: document2,
        color: "#ABCDEF",
        content: "Foo",
        location: location1,
        tags: [],
      });
      assertExists(result.error, "Expected error for mismatched creator");
      assertEquals(result.error, `Document with ID '${document2}' was not created by user '${user2}'.`);
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 3.5: Error: Missing both color and content
    await t_action.step("should return an error if both color and content are omitted", async () => {
      console.log("  Action: createAnnotation with no color or content");
      const result = await concept.createAnnotation({
        creator: user1,
        document: document2,
        color: undefined,
        content: undefined,
        location: location1,
        tags: [],
      });
      assertExists(result.error, "Expected error for missing color/content");
      assertEquals(result.error, "At least one of 'color' or 'content' must be provided.");
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 3.6: Error: Invalid color format
    await t_action.step("should return an error for invalid color format", async () => {
      console.log("  Action: createAnnotation with invalid color '#GGGGGG'");
      const result = await concept.createAnnotation({
        creator: user1,
        document: document2,
        color: "#GGGGGG",
        content: "Valid content",
        location: location1,
        tags: [],
      });
      assertExists(result.error, "Expected error for invalid color");
      assertEquals(result.error, "Provided 'color' is not a valid HTML hex color string.");
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 3.7: Error: Non-existent tags
    await t_action.step("should return an error for non-existent tags", async () => {
      console.log("  Action: createAnnotation with non-existent tag");
      const result = await concept.createAnnotation({
        creator: user1,
        document: document2,
        color: "#000000",
        location: location1,
        tags: [freshID()],
      });
      assertExists(result.error, "Expected error for non-existent tag");
      assertExists(result.error.includes("One or more tags not found"));
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 3.8: Error: Tags not owned by creator
    await t_action.step("should return an error for tags not created by the annotation creator", async () => {
      console.log("  Action: createAnnotation by User1 with User2's tag");
      const result = await concept.createAnnotation({
        creator: user1,
        document: document2,
        color: "#000000",
        location: location1,
        tags: [tagOtherUserId],
      });
      assertExists(result.error, "Expected error for tag not owned by creator");
      assertExists(result.error.includes("One or more tags not found or not created by user"));
      console.log(`    Error confirmed: "${result.error}"`);
    });
    console.log("--- End createAnnotation ---");
  });

  Deno.test(t, "4. deleteAnnotation action", async (t_action) => {
    console.log("\n--- Testing deleteAnnotation ---");
    await setupDocument(document1, user1); // Re-use document1, ensure it's clean for this test
    const annResult1 = await concept.createAnnotation({
      creator: user1,
      document: document1,
      content: "ToDelete",
      location: location1,
      tags: [],
    });
    const annId1 = annResult1.annotation as ID;
    console.log(`  Setup: Annotation ${annId1} created by User1 on Document1.`);

    // Test 4.1: Successful deletion
    await t_action.step("should delete an annotation successfully", async () => {
      console.log("  Action: deleteAnnotation for User1, Annotation1");
      const result = await concept.deleteAnnotation({ user: user1, annotation: annId1 });
      assertNotEquals((result as { error: string }).error, "Expected no error for successful deletion");
      console.log("    Deletion successful.");

      // Verify effects: annotation removed from collection
      const ann = await concept._getAnnotation({ annotation: annId1 });
      assertExists(ann.error, "Expected annotation to be gone");
      console.log("    Effect 1 confirmed: Annotation not found in collection.");

      // Verify effects: annotation removed from document's list
      const doc = await concept._getDocumentRef({ document: document1 });
      assertExists(doc.document);
      assertEquals(doc.document.annotations.includes(annId1), false, "Expected annotation to be removed from document list");
      console.log("    Effect 2 confirmed: Annotation removed from document's list.");
    });

    // Test 4.2: Error: Annotation not found
    await t_action.step("should return an error if annotation does not exist", async () => {
      console.log("  Action: deleteAnnotation for non-existent annotation");
      const result = await concept.deleteAnnotation({ user: user1, annotation: "nonexistentAnn" as ID });
      assertExists(result.error, "Expected error for non-existent annotation");
      assertEquals(result.error, "Annotation with ID 'nonexistentAnn' not found.");
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 4.3: Error: User not creator
    await t_action.step("should return an error if user is not the creator", async () => {
      const annResult2 = await concept.createAnnotation({
        creator: user1,
        document: document1,
        content: "AnotherToDelete",
        location: location2,
        tags: [],
      });
      const annId2 = annResult2.annotation as ID;
      console.log(`  Setup: Annotation ${annId2} created by User1 on Document1.`);

      console.log("  Action: deleteAnnotation for User2 (not creator) on Annotation2");
      const result = await concept.deleteAnnotation({ user: user2, annotation: annId2 });
      assertExists(result.error, "Expected error for non-creator deletion");
      assertEquals(result.error, `User '${user2}' is not the creator of annotation '${annId2}'.`);
      console.log(`    Error confirmed: "${result.error}"`);

      // Cleanup to avoid test interference
      await concept.deleteAnnotation({ user: user1, annotation: annId2 });
    });
    console.log("--- End deleteAnnotation ---");
  });

  Deno.test(t, "5. updateAnnotation action", async (t_action) => {
    console.log("\n--- Testing updateAnnotation ---");
    await setupDocument(document1, user1);
    const tag1Result = await concept.createTag({ creator: user1, title: "Revised" });
    const tag1Id = tag1Result.tag as ID;
    const tag2Result = await concept.createTag({ creator: user1, title: "FollowUp" });
    const tag2Id = tag2Result.tag as ID;
    const tagOtherUserResult = await concept.createTag({ creator: user2, title: "U2Tag" });
    const tagOtherUserId = tagOtherUserResult.tag as ID;

    const initialAnnResult = await concept.createAnnotation({
      creator: user1,
      document: document1,
      color: "#0000FF",
      content: "Initial content",
      location: location1,
      tags: [tag1Id],
    });
    const annId = initialAnnResult.annotation as ID;
    console.log(`  Setup: Annotation ${annId} created for updates.`);

    // Test 5.1: Update color and content
    await t_action.step("should update color and content successfully", async () => {
      console.log("  Action: updateAnnotation - change color and content");
      const result = await concept.updateAnnotation({
        user: user1,
        annotation: annId,
        newColor: "#FF0000",
        newContent: "Updated content",
      });
      assertNotEquals((result as { error: string }).error, "Expected no error");
      console.log("    Update successful.");

      const updatedAnn = await concept._getAnnotation({ annotation: annId });
      assertExists(updatedAnn.annotation);
      assertEquals(updatedAnn.annotation.color, "#FF0000");
      assertEquals(updatedAnn.annotation.content, "Updated content");
      console.log("    Effects confirmed: Color and content updated.");
    });

    // Test 5.2: Update location and tags
    await t_action.step("should update location and tags successfully", async () => {
      console.log("  Action: updateAnnotation - change location and tags");
      const result = await concept.updateAnnotation({
        user: user1,
        annotation: annId,
        newLocation: location2,
        newTags: [tag2Id],
      });
      assertNotEquals((result as { error: string }).error, "Expected no error");
      console.log("    Update successful.");

      const updatedAnn = await concept._getAnnotation({ annotation: annId });
      assertExists(updatedAnn.annotation);
      assertEquals(updatedAnn.annotation.location, location2);
      assertEquals(updatedAnn.annotation.tags, [tag2Id]);
      console.log("    Effects confirmed: Location and tags updated.");
    });

    // Test 5.3: Error: Annotation not found
    await t_action.step("should return an error if annotation does not exist", async () => {
      console.log("  Action: updateAnnotation for non-existent annotation");
      const result = await concept.updateAnnotation({
        user: user1,
        annotation: "nonexistentAnn" as ID,
        newContent: "Test",
      });
      assertExists(result.error);
      assertEquals(result.error, "Annotation with ID 'nonexistentAnn' not found.");
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 5.4: Error: User not creator
    await t_action.step("should return an error if user is not the creator", async () => {
      console.log("  Action: updateAnnotation by User2 (not creator)");
      const result = await concept.updateAnnotation({
        user: user2,
        annotation: annId,
        newContent: "Attempt by wrong user",
      });
      assertExists(result.error);
      assertEquals(result.error, `User '${user2}' is not the creator of annotation '${annId}'.`);
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 5.5: Error: Invalid newColor format
    await t_action.step("should return an error for invalid newColor format", async () => {
      console.log("  Action: updateAnnotation with invalid newColor '#GGG'");
      const result = await concept.updateAnnotation({
        user: user1,
        annotation: annId,
        newColor: "#GGG",
      });
      assertExists(result.error);
      assertEquals(result.error, "Provided 'newColor' is not a valid HTML hex color string.");
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 5.6: Error: Update would result in both color and content being omitted
    await t_action.step("should return an error if update results in both color and content being omitted", async () => {
      // Create an annotation that initially only has a color
      const annOnlyColorResult = await concept.createAnnotation({
        creator: user1,
        document: document1,
        color: "#00FF00",
        location: location3,
        tags: [],
      });
      const annOnlyColorId = annOnlyColorResult.annotation as ID;
      console.log(`  Setup: Annotation ${annOnlyColorId} created with only color.`);

      console.log("  Action: updateAnnotation - remove color and content (which is already undefined)");
      const result = await concept.updateAnnotation({
        user: user1,
        annotation: annOnlyColorId,
        newColor: undefined,
        newContent: undefined,
      });
      assertExists(result.error);
      assertEquals(result.error, "Updating this annotation would result in both 'color' and 'content' being omitted.");
      console.log(`    Error confirmed: "${result.error}"`);

      // Ensure that if content is defined, removing color is fine
      await concept.updateAnnotation({
        user: user1,
        annotation: annOnlyColorId,
        newContent: "Some content now",
      });
      const currentAnn = await concept._getAnnotation({ annotation: annOnlyColorId });
      assertExists(currentAnn.annotation);
      assertNotEquals(currentAnn.annotation.content, undefined);

      const result2 = await concept.updateAnnotation({
        user: user1,
        annotation: annOnlyColorId,
        newColor: undefined, // remove color
      });
      assertNotEquals((result2 as { error: string }).error, "Expected no error, as content is present");
      const finalAnn = await concept._getAnnotation({ annotation: annOnlyColorId });
      assertExists(finalAnn.annotation);
      assertEquals(finalAnn.annotation.color, undefined);
      assertNotEquals(finalAnn.annotation.content, undefined);
    });

    // Test 5.7: Error: Non-existent tags in newTags
    await t_action.step("should return an error for non-existent tags in newTags", async () => {
      console.log("  Action: updateAnnotation with non-existent tag in newTags");
      const result = await concept.updateAnnotation({
        user: user1,
        annotation: annId,
        newTags: [freshID()],
      });
      assertExists(result.error);
      assertExists(result.error.includes("One or more 'newTags' not found"));
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 5.8: Error: Tags not owned by creator in newTags
    await t_action.step("should return an error for tags not created by the annotation creator in newTags", async () => {
      console.log("  Action: updateAnnotation by User1 with User2's tag");
      const result = await concept.updateAnnotation({
        user: user1,
        annotation: annId,
        newTags: [tagOtherUserId],
      });
      assertExists(result.error);
      assertExists(result.error.includes("One or more 'newTags' not found or not created by user"));
      console.log(`    Error confirmed: "${result.error}"`);
    });
    console.log("--- End updateAnnotation ---");
  });

  Deno.test(t, "6. search action", async (t_action) => {
    console.log("\n--- Testing search ---");
    await setupDocument(document1, user1);
    await setupDocument(document2, user2); // Setup doc for user2
    const tag1Result = await concept.createTag({ creator: user1, title: "ConceptDesign" });
    const tag1Id = tag1Result.tag as ID;
    const tag2Result = await concept.createTag({ creator: user1, title: "Modularity" });
    const tag2Id = tag2Result.tag as ID;

    const ann1Result = await concept.createAnnotation({
      creator: user1,
      document: document1,
      content: "This is a comment about concept design.",
      location: location1,
      tags: [tag1Id],
    });
    const ann1Id = ann1Result.annotation as ID;
    console.log(`  Setup: Annotation ${ann1Id} by User1 on Document1 (content: "concept design", tag: "ConceptDesign").`);

    const ann2Result = await concept.createAnnotation({
      creator: user1,
      document: document1,
      content: "Modularity is key for software architecture.",
      location: location2,
      tags: [tag2Id],
    });
    const ann2Id = ann2Result.annotation as ID;
    console.log(`  Setup: Annotation ${ann2Id} by User1 on Document1 (content: "Modularity", tag: "Modularity").`);

    const ann3Result = await concept.createAnnotation({
      creator: user1,
      document: document1,
      color: "#FF0000",
      content: "A red highlight.",
      location: location3,
      tags: [],
    });
    const ann3Id = ann3Result.annotation as ID;
    console.log(`  Setup: Annotation ${ann3Id} by User1 on Document1 (content: "red", no tags).`);

    const ann4Result = await concept.createAnnotation({
      creator: user2,
      document: document2,
      content: "User2's private comment.",
      location: location4,
      tags: [],
    });
    const ann4Id = ann4Result.annotation as ID;
    console.log(`  Setup: Annotation ${ann4Id} by User2 on Document2.`);

    // Test 6.1: Search by content keyword (case-insensitive)
    await t_action.step("should find annotations by content keyword (case-insensitive)", async () => {
      console.log("  Action: search for 'design' by User1 on Document1");
      const result = await concept.search({ user: user1, document: document1, criteria: "design" });
      assertExists(result.annotations);
      assertEquals(result.annotations.length, 1);
      assertEquals(result.annotations[0]._id, ann1Id);
      console.log(`    Found ${result.annotations.length} annotations.`);
    });

    // Test 6.2: Search by tag title keyword (case-insensitive)
    await t_action.step("should find annotations by tag title keyword (case-insensitive)", async () => {
      console.log("  Action: search for 'modularity' by User1 on Document1");
      const result = await concept.search({ user: user1, document: document1, criteria: "modularity" });
      assertExists(result.annotations);
      assertEquals(result.annotations.length, 1);
      assertEquals(result.annotations[0]._id, ann2Id);
      console.log(`    Found ${result.annotations.length} annotations.`);
    });

    // Test 6.3: Search by both content and tag
    await t_action.step("should find annotations matching either content or tag", async () => {
      console.log("  Action: search for 'red' by User1 on Document1 (matches content)");
      const result = await concept.search({ user: user1, document: document1, criteria: "red" });
      assertExists(result.annotations);
      assertEquals(result.annotations.length, 1);
      assertEquals(result.annotations[0]._id, ann3Id);
      console.log(`    Found ${result.annotations.length} annotations.`);
    });

    // Test 6.4: No matches
    await t_action.step("should return an empty list if no matches are found", async () => {
      console.log("  Action: search for 'nonexistent' by User1 on Document1");
      const result = await concept.search({ user: user1, document: document1, criteria: "nonexistent" });
      assertExists(result.annotations);
      assertEquals(result.annotations.length, 0);
      console.log(`    Found ${result.annotations.length} annotations.`);
    });

    // Test 6.5: Error: Document not found
    await t_action.step("should return an error if document does not exist", async () => {
      console.log("  Action: search for 'test' on non-existent document");
      const result = await concept.search({ user: user1, document: "badDoc" as ID, criteria: "test" });
      assertExists(result.error);
      assertEquals(result.error, `Document with ID 'badDoc' not found in Annotation concept's view.`);
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 6.6: Search by wrong user (should not find private annotations)
    await t_action.step("should not find annotations if user is not the creator", async () => {
      console.log("  Action: search by User1 on Document2 (User2's document)");
      const result = await concept.search({ user: user1, document: document2, criteria: "comment" });
      assertExists(result.annotations);
      assertEquals(result.annotations.length, 0);
      console.log(`    Found ${result.annotations.length} annotations (expected 0).`);
    });

    // Test 6.7: Empty criteria returns all user's annotations in document
    await t_action.step("should return all user's annotations in document if criteria is empty", async () => {
      console.log("  Action: search with empty criteria by User1 on Document1");
      const result = await concept.search({ user: user1, document: document1, criteria: "" });
      assertExists(result.annotations);
      assertEquals(result.annotations.length, 3);
      assertArrayIncludes(result.annotations.map(a => a._id), [ann1Id, ann2Id, ann3Id]);
      console.log(`    Found ${result.annotations.length} annotations.`);
    });
    console.log("--- End search ---");
  });

  Deno.test(t, "7. searchLLM action", async (t_action) => {
    console.log("\n--- Testing searchLLM ---");
    await setupDocument(document1, user1);
    const ann1Result = await concept.createAnnotation({
      creator: user1,
      document: document1,
      content: "This is an important note.",
      location: location1,
      tags: [],
    });
    const ann1Id = ann1Result.annotation as ID;
    const ann2Result = await concept.createAnnotation({
      creator: user1,
      document: document1,
      color: "#FF0000",
      content: "A quick thought.",
      location: location2,
      tags: [],
    });
    const ann2Id = ann2Result.annotation as ID;
    const ann3Result = await concept.createAnnotation({
      creator: user1,
      document: document1,
      content: "Just a general comment.",
      location: location3,
      tags: [],
    });
    const ann3Id = ann3Result.annotation as ID;
    console.log(`  Setup: Annotations ${ann1Id} (important content), ${ann2Id} (red color), ${ann3Id} (general comment) created.`);

    // Test 7.1: Successful LLM search for 'important' annotations
    await t_action.step("should find annotations described by LLM (content match)", async () => {
      console.log("  Action: searchLLM for 'annotations that highlighted important parts'");
      const result = await concept.searchLLM({
        user: user1,
        document: document1,
        description: "annotations that highlighted important parts",
        llm: mockLLM,
      });
      assertExists(result.annotations);
      assertEquals(result.annotations.length, 1);
      assertEquals(result.annotations[0]._id, ann1Id);
      console.log(`    Found ${result.annotations.length} annotations matching description.`);
    });

    // Test 7.2: Successful LLM search for 'red' annotations
    await t_action.step("should find annotations described by LLM (color match)", async () => {
      console.log("  Action: searchLLM for 'red annotations'");
      const result = await concept.searchLLM({
        user: user1,
        document: document1,
        description: "red annotations",
        llm: mockLLM,
      });
      assertExists(result.annotations);
      assertEquals(result.annotations.length, 1);
      assertEquals(result.annotations[0]._id, ann2Id);
      console.log(`    Found ${result.annotations.length} annotations matching description.`);
    });

    // Test 7.3: Successful LLM search for 'general comments'
    await t_action.step("should find annotations described by LLM (general comment)", async () => {
      console.log("  Action: searchLLM for 'general comments'");
      const result = await concept.searchLLM({
        user: user1,
        document: document1,
        description: "general comments",
        llm: mockLLM,
      });
      assertExists(result.annotations);
      assertEquals(result.annotations.length, 1);
      assertEquals(result.annotations[0]._id, ann3Id);
      console.log(`    Found ${result.annotations.length} annotations matching description.`);
    });

    // Test 7.4: LLM search returns no matches
    await t_action.step("should return an empty list if LLM finds no matches", async () => {
      console.log("  Action: searchLLM for 'no matches'");
      const result = await concept.searchLLM({
        user: user1,
        document: document1,
        description: "no matches",
        llm: mockLLM,
      });
      assertExists(result.annotations);
      assertEquals(result.annotations.length, 0);
      console.log(`    Found ${result.annotations.length} annotations.`);
    });

    // Test 7.5: Error: Document not found
    await t_action.step("should return an error if document does not exist", async () => {
      console.log("  Action: searchLLM on non-existent document");
      const result = await concept.searchLLM({
        user: user1,
        document: "badDoc" as ID,
        description: "any",
        llm: mockLLM,
      });
      assertExists(result.error);
      assertEquals(result.error, `Document with ID 'badDoc' not found in Annotation concept's view.`);
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 7.6: Error: Invalid LLM instance
    await t_action.step("should return an error for invalid LLM instance", async () => {
      console.log("  Action: searchLLM with invalid LLM object");
      const result = await concept.searchLLM({
        user: user1,
        document: document1,
        description: "any",
        llm: {} as MockLLM, // Invalid mock
      });
      assertExists(result.error);
      assertEquals(result.error, "LLM instance is invalid or not provided.");
      console.log(`    Error confirmed: "${result.error}"`);
    });

    // Test 7.7: LLM processing error
    const brokenLLM: MockLLM = {
      processAnnotations: async () => {
        throw new Error("LLM internal error");
      },
    };
    await t_action.step("should return an error if LLM processing fails", async () => {
      console.log("  Action: searchLLM with an LLM that throws an error");
      const result = await concept.searchLLM({
        user: user1,
        document: document1,
        description: "any",
        llm: brokenLLM,
      });
      assertExists(result.error);
      assertEquals(result.error, "LLM processing failed: LLM internal error");
      console.log(`    Error confirmed: "${result.error}"`);
    });
    console.log("--- End searchLLM ---");
  });

  // Ensure to close the MongoDB client after all tests in this file
  await client.close();
});
```
