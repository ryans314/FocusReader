import {
  assertArrayIncludes,
  assertEquals,
  assertExists,
  assertNotEquals,
} from "jsr:@std/assert";
import { testDb } from "@utils/database.ts";
import { ID } from "@utils/types.ts";
import AnnotationConcept from "./AnnotationConcept.ts";

// Test-specific generic IDs
const userAlice = "user:Alice" as ID;
const userBob = "user:Bob" as ID;
const docA = "document:alpha" as ID;
const docB = "document:beta" as ID;

Deno.test("Annotation Concept: Basic Tag Management", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  await t.step("should create a tag successfully", async () => {
    console.log("--- Test: createTag (success) ---");
    const result = await concept.createTag({
      creator: userAlice,
      title: "Important",
    });
    console.log("createTag result:", result);
    assertExists(result.tag, "Tag should be created and returned.");

    const foundTag = await db.collection("Annotation.tags").findOne({
      _id: result.tag,
    });
    assertExists(foundTag, "Tag should exist in the database."); // Added assertExists
    assertEquals(foundTag.title, "Important");
    assertEquals(foundTag.creator, userAlice);
    console.log("Verified tag exists in DB.");
  });

  await t.step("should prevent creating a duplicate tag", async () => {
    console.log("--- Test: createTag (duplicate failure) ---");
    // Create the tag first
    await concept.createTag({ creator: userAlice, title: "DuplicateTag" });

    // Attempt to create it again
    const result = await concept.createTag({
      creator: userAlice,
      title: "DuplicateTag",
    });
    console.log("createTag duplicate result:", result);
    assertExists(
      result.error,
      "Duplicate tag creation should return an error.",
    );
    assertEquals(
      result.error,
      "A tag with this creator and title already exists.",
    );
    console.log("Verified duplicate tag creation returns an error.");
  });

  await client.close();
});

Deno.test("Annotation Concept: Document Registration Utilities", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  await t.step("should register a document view successfully", async () => {
    console.log("--- Test: _registerDocument (success) ---");
    const result = await concept._registerDocument({
      documentId: docA,
      creatorId: userAlice,
    });
    console.log("_registerDocument result:", result);
    assertEquals(result, {}, "Document registration should be successful.");

    const docView = await db.collection("Annotation.documentViews").findOne({
      _id: docA,
    });
    assertExists(docView, "Document view should exist in DB."); // Added assertExists
    assertEquals(docView.creator, userAlice);
    assertEquals(docView.annotations, []);
    console.log("Verified document view registered.");
  });

  await t.step(
    "should prevent registering a duplicate document view",
    async () => {
      console.log("--- Test: _registerDocument (duplicate failure) ---");
      // Register once
      await concept._registerDocument({ documentId: docB, creatorId: userBob });

      // Attempt to register again
      const result = await concept._registerDocument({
        documentId: docB,
        creatorId: userBob,
      });
      console.log("_registerDocument duplicate result:", result);
      assertExists(
        result.error,
        "Duplicate document registration should return an error.",
      );
      assertEquals(
        result.error,
        "Document already registered in Annotation concept's view.",
      );
      console.log("Verified duplicate document registration returns an error.");
    },
  );

  await t.step("should delete a document view successfully", async () => {
    console.log("--- Test: _deleteDocumentView (success) ---");
    // Setup: Register a document and add an annotation to it
    await concept._registerDocument({
      documentId: "doc:toDelete" as ID,
      creatorId: userAlice,
    });
    const tagResult = await concept.createTag({
      creator: userAlice,
      title: "temp-tag",
    });
    const annotationResult = await concept.createAnnotation({
      creator: userAlice,
      document: "doc:toDelete" as ID,
      content: "Annotation to be deleted with document.",
      location: "cfi:/0/0",
      tags: [tagResult.tag!],
    });
    assertExists(annotationResult.annotation);

    const deleteResult = await concept._deleteDocumentView({
      documentId: "doc:toDelete" as ID,
    });
    console.log("_deleteDocumentView result:", deleteResult);
    assertEquals(
      deleteResult,
      {},
      "Document view deletion should be successful.",
    );

    const docView = await db.collection("Annotation.documentViews").findOne({
      _id: "doc:toDelete" as ID,
    });
    assertEquals(docView, null, "Document view should be removed from DB.");

    const deletedAnnotation = await db.collection("Annotation.annotations")
      .findOne({ _id: annotationResult.annotation });
    assertEquals(
      deletedAnnotation,
      null,
      "Associated annotations should also be deleted.",
    );
    console.log("Verified document view and associated annotations deleted.");
  });

  await client.close();
});

Deno.test("Annotation Concept: Annotation Creation", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  // Setup: Register docA for Alice
  await concept._registerDocument({ documentId: docA, creatorId: userAlice });

  await t.step(
    "should create an annotation successfully with content",
    async () => {
      console.log("--- Test: createAnnotation (success with content) ---");
      const result = await concept.createAnnotation({
        creator: userAlice,
        document: docA,
        content: "This is a test annotation.",
        location: "cfi:/0/1",
        tags: [],
      });
      console.log("createAnnotation result:", result);
      assertExists(
        result.annotation,
        "Annotation should be created and returned.",
      );

      const foundAnnotation = await db.collection("Annotation.annotations")
        .findOne({ _id: result.annotation });
      assertExists(foundAnnotation, "Annotation should exist in the database."); // Added assertExists
      assertEquals(foundAnnotation.content, "This is a test annotation.");
      assertEquals(foundAnnotation.creator, userAlice);
      assertEquals(foundAnnotation.document, docA);
      assertEquals(foundAnnotation.location, "cfi:/0/1");
      assertEquals(foundAnnotation.tags, []);

      const docView = await db.collection("Annotation.documentViews").findOne({
        _id: docA,
      });
      assertExists(docView, "Document view should still exist."); // Added assertExists
      assertArrayIncludes(
        docView.annotations,
        [result.annotation!],
        "Document view should include the new annotation.",
      );
      console.log("Verified annotation created and linked to document view.");
    },
  );

  await t.step(
    "should create an annotation successfully with color and tags",
    async () => {
      console.log(
        "--- Test: createAnnotation (success with color and tags) ---",
      );
      const tag1 =
        (await concept.createTag({ creator: userAlice, title: "Highlight" }))
          .tag!;
      const tag2 =
        (await concept.createTag({ creator: userAlice, title: "Review" })).tag!;

      const result = await concept.createAnnotation({
        creator: userAlice,
        document: docA,
        color: "#FF0000",
        location: "cfi:/0/2",
        tags: [tag1, tag2],
      });
      console.log("createAnnotation result:", result);
      assertExists(result.annotation, "Annotation should be created.");

      const foundAnnotation = await db.collection("Annotation.annotations")
        .findOne({ _id: result.annotation });
      assertExists(foundAnnotation, "Annotation should exist in DB."); // Added assertExists
      assertEquals(foundAnnotation.color, "#FF0000");
      assertArrayIncludes(foundAnnotation.tags, [tag1, tag2]);
      assertEquals(
        foundAnnotation.content,
        undefined,
        "Content should be undefined.",
      );
      console.log("Verified annotation created with color and tags.");
    },
  );

  await t.step(
    "should fail if document does not exist in concept's view",
    async () => {
      console.log(
        "--- Test: createAnnotation (document not registered failure) ---",
      );
      const result = await concept.createAnnotation({
        creator: userAlice,
        document: docB, // Not registered
        content: "Should fail.",
        location: "cfi:/0/0",
        tags: [],
      });
      console.log("createAnnotation result:", result);
      assertExists(
        result.error,
        "Should return an error for non-existent document.",
      );
      assertEquals(
        result.error,
        "Document does not exist in Annotation concept's view or is not owned by the creator.",
      );
      console.log("Verified failure for unregistered document.");
    },
  );

  await t.step(
    "should fail if creator does not own the document view",
    async () => {
      console.log("--- Test: createAnnotation (wrong creator failure) ---");
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
      assertExists(
        result.error,
        "Should return an error for unauthorized creator.",
      );
      assertEquals(
        result.error,
        "Document does not exist in Annotation concept's view or is not owned by the creator.",
      );
      console.log("Verified failure for wrong creator.");
    },
  );

  await t.step(
    "should fail if both color and content are omitted",
    async () => {
      console.log(
        "--- Test: createAnnotation (missing color/content failure) ---",
      );
      const result = await concept.createAnnotation({
        creator: userAlice,
        document: docA,
        location: "cfi:/0/3",
        tags: [],
      });
      console.log("createAnnotation result:", result);
      assertExists(
        result.error,
        "Should return an error if both color and content are missing.",
      );
      assertEquals(result.error, "Either color or content must be provided.");
      console.log("Verified failure when both color and content are missing.");
    },
  );

  await client.close();
});

Deno.test("Annotation Concept: Annotation Deletion", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  // Setup: Register docA for Alice
  await concept._registerDocument({ documentId: docA, creatorId: userAlice });
  const tagForDeletion =
    (await concept.createTag({ creator: userAlice, title: "temp" })).tag!;
  const annForDeletion = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "Annotation to delete.",
    location: "cfi:/0/4",
    tags: [tagForDeletion],
  })).annotation!;

  await t.step("should delete an annotation successfully", async () => {
    console.log("--- Test: deleteAnnotation (success) ---");
    const result = await concept.deleteAnnotation({
      user: userAlice,
      annotation: annForDeletion,
    });
    console.log("deleteAnnotation result:", result);
    assertEquals(result, {}, "Annotation deletion should be successful.");

    const foundAnnotation = await db.collection("Annotation.annotations")
      .findOne({ _id: annForDeletion });
    assertEquals(
      foundAnnotation,
      null,
      "Annotation should be removed from the database.",
    );

    const docView = await db.collection("Annotation.documentViews").findOne({
      _id: docA,
    });
    assertExists(docView, "Document view should still exist."); // Added assertExists
    assertNotEquals(
      docView.annotations.includes(annForDeletion),
      true,
      "Document view should not include deleted annotation.",
    );
    console.log("Verified annotation deleted and removed from document view.");
  });

  const annForUnauthorizedDelete = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "Annotation for unauthorized delete test.",
    location: "cfi:/0/5",
    tags: [],
  })).annotation!;

  await t.step(
    "should fail to delete an annotation if user is not the creator",
    async () => {
      console.log("--- Test: deleteAnnotation (unauthorized failure) ---");
      const result = await concept.deleteAnnotation({
        user: userBob,
        annotation: annForUnauthorizedDelete,
      });
      console.log("deleteAnnotation unauthorized result:", result);
      assertExists(
        result.error,
        "Unauthorized deletion should return an error.",
      );
      assertEquals(result.error, "User is not the creator of this annotation.");

      const foundAnnotation = await db.collection("Annotation.annotations")
        .findOne({ _id: annForUnauthorizedDelete });
      assertExists(
        foundAnnotation,
        "Annotation should still exist after unauthorized attempt.",
      ); // Added assertExists
      console.log("Verified unauthorized deletion failed.");
    },
  );

  await t.step("should fail to delete a non-existent annotation", async () => {
    console.log("--- Test: deleteAnnotation (non-existent failure) ---");
    const result = await concept.deleteAnnotation({
      user: userAlice,
      annotation: "nonexistent:ann" as ID,
    });
    console.log("deleteAnnotation non-existent result:", result);
    assertExists(
      result.error,
      "Deletion of non-existent annotation should return an error.",
    );
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
  assertExists(
    initialAnn,
    "Initial annotation must be created for update tests.",
  ); // Added assertExists
  const tagUpdate =
    (await concept.createTag({ creator: userAlice, title: "Updated" })).tag!;
  assertExists(tagUpdate, "Tag for update must be created for update tests."); // Added assertExists

  await t.step(
    "should update an annotation's content and color successfully",
    async () => {
      console.log("--- Test: updateAnnotation (content/color success) ---");
      const result = await concept.updateAnnotation({
        user: userAlice,
        annotation: initialAnn,
        newContent: "Updated content.",
        newColor: "#FFFFFF",
      });
      console.log("updateAnnotation result:", result);
      assertEquals(
        result.annotation,
        initialAnn,
        "Updated annotation ID should be returned.",
      );

      const updatedAnn = await db.collection("Annotation.annotations").findOne({
        _id: initialAnn,
      });
      assertExists(updatedAnn, "Updated annotation should exist in DB."); // Added assertExists
      assertEquals(updatedAnn.content, "Updated content.");
      assertEquals(updatedAnn.color, "#FFFFFF");
      assertEquals(
        updatedAnn.location,
        "cfi:/0/6",
        "Location should remain unchanged.",
      );
      console.log("Verified content and color updated.");
    },
  );

  await t.step(
    "should update an annotation's tags and location successfully",
    async () => {
      console.log("--- Test: updateAnnotation (tags/location success) ---");
      const result = await concept.updateAnnotation({
        user: userAlice,
        annotation: initialAnn,
        newLocation: "cfi:/0/7",
        newTags: [tagUpdate],
      });
      console.log("updateAnnotation result:", result);
      assertEquals(
        result.annotation,
        initialAnn,
        "Updated annotation ID should be returned.",
      );

      const updatedAnn = await db.collection("Annotation.annotations").findOne({
        _id: initialAnn,
      });
      assertExists(updatedAnn, "Updated annotation should exist in DB."); // Added assertExists
      assertEquals(updatedAnn.location, "cfi:/0/7");
      assertArrayIncludes(updatedAnn.tags, [tagUpdate]);
      assertEquals(
        updatedAnn.content,
        "Updated content.",
        "Content should remain unchanged.",
      );
      console.log("Verified tags and location updated.");
    },
  );

  await t.step("should fail to update if user is not the creator", async () => {
    console.log("--- Test: updateAnnotation (unauthorized failure) ---");
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
    console.log("--- Test: updateAnnotation (non-existent failure) ---");
    const result = await concept.updateAnnotation({
      user: userAlice,
      annotation: "nonexistent:ann" as ID,
      newContent: "Should fail.",
    });
    console.log("updateAnnotation non-existent result:", result);
    assertExists(
      result.error,
      "Update of non-existent annotation should return an error.",
    );
    assertEquals(result.error, "Annotation not found.");
    console.log("Verified update of non-existent annotation failed.");
  });

  await t.step("should fail if no fields are provided for update", async () => {
    console.log("--- Test: updateAnnotation (no fields failure) ---");
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
  await concept._registerDocument({ documentId: docB, creatorId: userBob }); // NEW: Register docB for Bob

  // Create tags for Alice
  const tagConcept =
    (await concept.createTag({ creator: userAlice, title: "concept" })).tag!;
  const tagDesign =
    (await concept.createTag({ creator: userAlice, title: "Design" })).tag!;
  const tagTesting =
    (await concept.createTag({ creator: userAlice, title: "Testing" })).tag!;
  assertExists(tagConcept);
  assertExists(tagDesign);
  assertExists(tagTesting);

  // Create annotations for Alice on docA
  const ann1 = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "This is a concept design annotation.",
    location: "cfi:/a/1",
    tags: [tagConcept, tagDesign],
  })).annotation!;
  assertExists(ann1); // Ensure ann1 is not null
  const ann2 = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "Another annotation about design.",
    location: "cfi:/a/2",
    tags: [tagDesign],
  })).annotation!;
  assertExists(ann2); // Ensure ann2 is not null
  const ann3 = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "A note on testing implementation.",
    location: "cfi:/a/3",
    tags: [tagTesting],
  })).annotation!;
  assertExists(ann3); // Ensure ann3 is not null
  const ann4 = (await concept.createAnnotation({
    creator: userAlice,
    document: docA,
    content: "Just some random text.",
    location: "cfi:/a/4",
    tags: [],
  })).annotation!;
  assertExists(ann4); // Ensure ann4 is not null

  // Create an annotation for Bob on docB (This will now succeed as Bob is the creator of docB)
  const annBob = (await concept.createAnnotation({
    creator: userBob,
    document: docB, // CHANGED: Bob annotates docB
    content: "Bob's annotation on his document.",
    location: "cfi:/b/1",
    tags: [],
  })).annotation!;
  assertExists(
    annBob,
    "Bob's annotation should now be successfully created on his document.",
  ); // Ensure annBob is not null

  await t.step(
    "should search by content keyword (case-insensitive)",
    async () => {
      console.log("--- Test: search by content ---");
      const result = await concept.search({
        user: userAlice,
        document: docA,
        criteria: "design",
      });
      console.log(
        "Search 'design' result:",
        result.annotations.map((a) => a._id),
      );
      assertEquals(
        result.annotations.length,
        2,
        "Should find 2 annotations matching 'design'.",
      );
      assertArrayIncludes(result.annotations.map((a) => a._id), [ann1, ann2]);
      console.log("Verified search by content keyword.");
    },
  );

  await t.step("should search by tag title (case-insensitive)", async () => {
    console.log("--- Test: search by tag ---");
    const result = await concept.search({
      user: userAlice,
      document: docA,
      criteria: "testing",
    });
    console.log(
      "Search 'testing' result:",
      result.annotations.map((a) => a._id),
    );
    assertEquals(
      result.annotations.length,
      1,
      "Should find 1 annotation matching 'testing' tag.",
    );
    assertArrayIncludes(result.annotations.map((a) => a._id), [ann3]);
    console.log("Verified search by tag title.");
  });

  await t.step("should search by content OR tag", async () => {
    console.log("--- Test: search by content OR tag ---");
    const result = await concept.search({
      user: userAlice,
      document: docA,
      criteria: "concept",
    });
    console.log(
      "Search 'concept' result:",
      result.annotations.map((a) => a._id),
    );
    assertEquals(
      result.annotations.length,
      1,
      "Should find 1 annotation matching 'concept' (content or tag).",
    );
    assertArrayIncludes(result.annotations.map((a) => a._id), [ann1]);
    console.log("Verified search by content OR tag.");
  });

  await t.step(
    "should return an empty list if no annotations match",
    async () => {
      console.log("--- Test: search (no match) ---");
      const result = await concept.search({
        user: userAlice,
        document: docA,
        criteria: "nonexistent",
      });
      console.log("Search 'nonexistent' result:", result.annotations);
      assertEquals(
        result.annotations.length,
        0,
        "Should return an empty list for no matches.",
      );
      console.log("Verified no matches result in empty list.");
    },
  );

  await t.step(
    "should not return annotations from other users on their documents",
    async () => { // Updated description
      console.log("--- Test: search (other user's document authorization) ---");
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
      assertEquals(
        result.error,
        "User is not the creator of this document in Annotation concept's view, and cannot search it.",
      );
      assertEquals(
        result.annotations.length,
        0,
        "Annotations array should be empty on authorization error.",
      );
      console.log(
        "Verified Alice cannot search on Bob's document and receives an error.",
      );
    },
  );

  await t.step(
    "should not return other user's annotations even if on a document I own (if such were possible)",
    async () => { // Updated description
      console.log(
        "--- Test: search (other user's annotation on my document - filtered by query) ---",
      );
      // If somehow Bob managed to annotate docA (owned by Alice), Alice's search should still filter them out.
      // (Given the createAnnotation rules, this scenario would typically not happen unless permissions were looser).
      // Here, Bob's actual annotation is on docB, so searching docA for "Bob's" should yield no results.
      const result = await concept.search({
        user: userAlice,
        document: docA,
        criteria: "Bob's annotation",
      });
      console.log(
        "Alice searching her docA for 'Bob's annotation' result:",
        result.annotations,
      );
      assertEquals(
        result.annotations.length,
        0,
        "Alice's search on her document should not find content that isn't hers (or associated with her tags).",
      );
      console.log(
        "Verified Alice's search on her document correctly finds no results for content not associated with her.",
      );
    },
  );

  await t.step(
    "Bob should find his own annotation on his document",
    async () => {
      console.log("--- Test: Bob finds his own annotation ---");
      const resultBob = await concept.search({
        user: userBob,
        document: docB,
        criteria: "Bob's annotation",
      });
      console.log(
        "Bob searching his docB for 'Bob's annotation' result:",
        resultBob.annotations.map((a) => a._id),
      );
      assertExists(resultBob.annotations);
      assertEquals(
        resultBob.annotations.length,
        1,
        "Bob should find his own annotation on his document.",
      );
      assertArrayIncludes(resultBob.annotations.map((a) => a._id), [annBob]);
      console.log("Verified Bob can find his own annotation.");
    },
  );

  await t.step(
    "should fail if document is not found in concept's view",
    async () => {
      console.log("--- Test: search (document not registered failure) ---");
      const result = await concept.search({
        user: userAlice,
        document: "nonexistent:doc" as ID,
        criteria: "any",
      });
      console.log("Search non-existent doc result:", result);
      assertExists(
        result.error,
        "Search on non-existent document should return an error.",
      );
      assertEquals(
        result.error,
        "Document not found in Annotation concept's view.",
      );
      assertEquals(
        result.annotations,
        [],
        "Annotations array should be empty on error.",
      );
      console.log("Verified search on non-existent document fails correctly.");
    },
  );

  await client.close();
});

Deno.test("Annotation Concept: Principle Fulfillment Test", async (t) => {
  const [db, client] = await testDb();
  const concept = new AnnotationConcept(db);

  console.log("\n--- Principle Fulfillment Test: Annotation Concept ---");
  console.log(
    "Principle: When users read a document, they can create and view highlighting or text annotations in the document. Users can label annotations with tags. Users can also search for annotations in a document with specific keywords or about certain ideas.",
  );

  const readerUser = "user:Reader" as ID;
  const bookDoc = "document:TheGreatBook" as ID;

  // 1. Setup: Register the document for the reader
  console.log(
    `Step 1: Registering document ${bookDoc} for user ${readerUser}.`,
  );
  const registerResult = await concept._registerDocument({
    documentId: bookDoc,
    creatorId: readerUser,
  });
  assertEquals(
    registerResult,
    {},
    "Document registration for principle should succeed.",
  );

  // 2. User creates tags
  console.log(`Step 2: ${readerUser} creates tags 'Character' and 'Theme'.`);
  const charTagResult = await concept.createTag({
    creator: readerUser,
    title: "Character",
  });
  assertExists(charTagResult.tag, "Character tag creation should succeed.");
  const charTag = charTagResult.tag!;

  const themeTagResult = await concept.createTag({
    creator: readerUser,
    title: "Theme",
  });
  assertExists(themeTagResult.tag, "Theme tag creation should succeed.");
  const themeTag = themeTagResult.tag!;
  console.log(`Tags created: ${charTag}, ${themeTag}`);

  // 3. User creates multiple annotations on the document
  console.log(`Step 3: ${readerUser} creates annotations on ${bookDoc}.`);
  const annCharDescResult = await concept.createAnnotation({
    creator: readerUser,
    document: bookDoc,
    content: "Description of the protagonist's personality.",
    location: "cfi:/p1/ch1",
    tags: [charTag],
  });
  assertExists(
    annCharDescResult.annotation,
    "Annotation 1 creation should succeed.",
  );
  const annCharDesc = annCharDescResult.annotation!;
  console.log(`Created annotation 1 (Character description): ${annCharDesc}`);

  const annHighlightThemeResult = await concept.createAnnotation({
    creator: readerUser,
    document: bookDoc,
    color: "#FFFF00", // Yellow highlight
    location: "cfi:/p2/s3",
    tags: [themeTag],
  });
  assertExists(
    annHighlightThemeResult.annotation,
    "Annotation 2 creation should succeed.",
  );
  const annHighlightTheme = annHighlightThemeResult.annotation!;
  console.log(`Created annotation 2 (Theme highlight): ${annHighlightTheme}`);

  const annQuestionResult = await concept.createAnnotation({
    creator: readerUser,
    document: bookDoc,
    content: "Is this symbolism or just descriptive language?",
    location: "cfi:/p3/l5",
    tags: [themeTag],
  });
  assertExists(
    annQuestionResult.annotation,
    "Annotation 3 creation should succeed.",
  );
  const annQuestion = annQuestionResult.annotation!;
  console.log(`Created annotation 3 (Question about theme): ${annQuestion}`);

  const annNoteResult = await concept.createAnnotation({
    creator: readerUser,
    document: bookDoc,
    content: "Remember to re-read this section later.",
    location: "cfi:/p4/ch2",
    tags: [],
  });
  assertExists(
    annNoteResult.annotation,
    "Annotation 4 creation should succeed.",
  );
  const annNote = annNoteResult.annotation!;
  console.log(`Created annotation 4 (General note): ${annNote}`);

  // 4. User searches for annotations by keyword in content
  console.log(
    `Step 4: ${readerUser} searches for annotations with 'personality'.`,
  );
  let searchResult1 = await concept.search({
    user: readerUser,
    document: bookDoc,
    criteria: "personality",
  });
  console.log(
    "Search result 1 (personality):",
    searchResult1.annotations.map((a) => a._id),
  );
  assertEquals(searchResult1.annotations.length, 1);
  assertArrayIncludes(searchResult1.annotations.map((a) => a._id), [
    annCharDesc,
  ]);
  console.log("Verified search by content keyword 'personality'.");

  // 5. User searches for annotations by tag
  console.log(
    `Step 5: ${readerUser} searches for annotations with tag 'Theme'.`,
  );
  let searchResult2 = await concept.search({
    user: readerUser,
    document: bookDoc,
    criteria: "Theme",
  });
  console.log(
    "Search result 2 (Theme tag):",
    searchResult2.annotations.map((a) => a._id),
  );
  assertEquals(searchResult2.annotations.length, 2);
  assertArrayIncludes(searchResult2.annotations.map((a) => a._id), [
    annHighlightTheme,
    annQuestion,
  ]);
  console.log("Verified search by tag 'Theme'.");

  // 6. User searches for annotations by both (content or tag)
  console.log(
    `Step 6: ${readerUser} searches for annotations with 'language' (matches content) or 'Character' (matches tag).`,
  );
  let searchResult3 = await concept.search({
    user: readerUser,
    document: bookDoc,
    criteria: "language",
  });
  console.log(
    "Search result 3 (language):",
    searchResult3.annotations.map((a) => a._id),
  );
  assertEquals(searchResult3.annotations.length, 1);
  assertArrayIncludes(searchResult3.annotations.map((a) => a._id), [
    annQuestion,
  ]);
  console.log("Verified search by content 'language'.");

  searchResult3 = await concept.search({
    user: readerUser,
    document: bookDoc,
    criteria: "Charac",
  }); // Partial tag match
  console.log(
    "Search result 3 (Charac tag):",
    searchResult3.annotations.map((a) => a._id),
  );
  assertEquals(searchResult3.annotations.length, 1);
  assertArrayIncludes(searchResult3.annotations.map((a) => a._id), [
    annCharDesc,
  ]);
  console.log("Verified search by partial tag 'Charac'.");

  // 7. User views all their annotations in the document (implicitly by searching with broad criteria or no criteria)
  console.log(
    `Step 7: ${readerUser} views all annotations in ${bookDoc} by searching for common term.`,
  );
  // Note: Searching with a very broad criteria that matches all or most annotations.
  // In a real app, a dedicated query like '_getAllAnnotationsForDocument' might be used.
  // Here, we can search for a common string or iterate over the documentViews' annotations array.
  const docViewAfterAnnotations = await db.collection(
    "Annotation.documentViews",
  ).findOne({ _id: bookDoc });
  assertExists(
    docViewAfterAnnotations,
    "Document view should exist after creating annotations.",
  );
  assertEquals(
    docViewAfterAnnotations.annotations.length,
    4,
    "Document view should have all 4 annotations.",
  );
  assertArrayIncludes(docViewAfterAnnotations.annotations, [
    annCharDesc,
    annHighlightTheme,
    annQuestion,
    annNote,
  ]);
  console.log(
    "Verified all annotations can be found/viewed directly from the document view.",
  );

  console.log("\nPrinciple successfully demonstrated!");

  await client.close();
});
