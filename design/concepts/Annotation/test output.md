```
--- Test: should create a tag successfully ---
createTag result: { tag: "019a10a3-092a-781b-9191-56174dc1b8e1" }
Verified tag exists in DB.
✅ should create a tag successfully

--- Test: should prevent creating a duplicate tag ---
createTag duplicate result: { error: "A tag with this creator and title already exists." }
Verified duplicate tag creation returns an error.
✅ should prevent creating a duplicate tag

--- Test: should register a document view successfully ---
_registerDocument result: {}
Verified document view registered.
✅ should register a document view successfully

--- Test: should prevent registering a duplicate document view ---
_registerDocument duplicate result: { error: "Document already registered in Annotation concept's view." }
Verified duplicate document registration returns an error.
✅ should prevent registering a duplicate document view

--- Test: should delete a document view successfully ---
_deleteDocumentView result: {}
Verified document view and associated annotations deleted.
✅ should delete a document view successfully


--- Test: should create an annotation successfully with content ---
createAnnotation result: { annotation: "019a10a5-1e7e-793a-ad4c-ebe8ca62cc8f" }
Verified annotation created and linked to document view.
✅ should create an annotation successfully with content

--- Test: should create an annotation successfully with color and tags ---
createAnnotation result: { annotation: "019a10a5-1f69-7696-bc24-0e08f6f222aa" }
Verified annotation created with color and tags.
✅ should create an annotation successfully with color and tags

--- Test: should fail if document does not exist in concept's view ---
createAnnotation result: {
  error: "Document does not exist in Annotation concept's view or is not owned by the creator."
}
Verified failure for unregistered document.
✅ should fail if document does not exist in concept's view

--- Test: should fail if creator does not own the document view ---
createAnnotation result: {
  error: "Document does not exist in Annotation concept's view or is not owned by the creator."
}
Verified failure for wrong creator.
✅ should fail if creator does not own the document view

--- Test: should fail if both color and content are omitted ---
createAnnotation result: { error: "Either color or content must be provided." }
Verified failure when both color and content are missing.
✅ should fail if both color and content are omitted

--- Test: should delete an annotation successfully ---
deleteAnnotation result: {}
Verified annotation deleted and removed from document view.
✅ should delete an annotation successfully

--- Test: should fail to delete an annotation if user is not the creator ---
deleteAnnotation unauthorized result: { error: "User is not the creator of this annotation." }
Verified unauthorized deletion failed.
✅ should fail to delete an annotation if user is not the creator

--- Test: should fail to delete a non-existent annotation ---
deleteAnnotation non-existent result: { error: "Annotation not found." }
Verified deletion of non-existent annotation failed.
✅ should fail to delete a non-existent annotation

--- Test: should update an annotation's content and color successfully ---
updateAnnotation result: { annotation: "019a10a5-ab78-78d4-9f27-79a7f46abf5f" }
Verified content and color updated.
✅ should update an annotation's content and color successfully

--- Test: should update an annotation's tags and location successfully ---
updateAnnotation result: { annotation: "019a10a5-ab78-78d4-9f27-79a7f46abf5f" }
Verified tags and location updated.
✅ should update an annotation's tags and location successfully

--- Test: should fail to update if user is not the creator ---
updateAnnotation unauthorized result: { error: "User is not the creator of this annotation." }
Verified unauthorized update failed.
✅ should fail to update if user is not the creator

--- Test: should fail to update a non-existent annotation ---
updateAnnotation non-existent result: { error: "Annotation not found." }
Verified update of non-existent annotation failed.
✅ should fail to update a non-existent annotation

--- Test: should fail if no fields are provided for update ---
updateAnnotation no fields result: { error: "No fields provided for update." }
Verified update with no fields failed.
✅ should fail if no fields are provided for update

--- Test: should search by content keyword (case-insensitive) ---
Search 'design' result: [
  "019a10a5-dc68-748d-8038-e4b8fb2c8f8d",
  "019a10a5-dcaf-76f5-95df-901feff5a601"
]
Verified search by content keyword.
✅ should search by content keyword (case-insensitive)

--- Test: should search by tag title (case-insensitive) ---
Search 'testing' result: [ "019a10a5-dce3-7273-b6c8-37ad36ad7eac" ]
Verified search by tag title.
✅ should search by tag title (case-insensitive)

--- Test: should search by content OR tag ---
Search 'concept' result: [ "019a10a5-dc68-748d-8038-e4b8fb2c8f8d" ]
Verified search by content OR tag.
✅ should search by content OR tag

--- Test: should return an empty list if no annotations match ---
Search 'nonexistent' result: []
Verified no matches result in empty list.
✅ should return an empty list if no annotations match

--- Test: should not return annotations from other users on their documents ---
Alice searching Bob's docB result: {
  annotations: [],
  error: "User is not the creator of this document in Annotation concept's view, and cannot search it."
}
Verified Alice cannot search on Bob's document and receives an error.
✅ should not return annotations from other users on their documents

--- Test: should not return other user's annotations even if on a document I own (if such were possible) ---
Alice searching her docA for 'Bob's annotation' result: []
Verified Alice's search on her document correctly finds no results for content not associated with her.
✅ should not return other user's annotations even if on a document I own (if such were possible)

--- Test: Bob should find his own annotation on his document ---
Bob searching his docB for 'Bob's annotation' result: [ "019a10a5-dd51-73a4-b489-d66dfe367ccd" ]
Verified Bob can find his own annotation.
✅ Bob should find his own annotation on his document

--- Test: should fail if document is not found in concept's view ---
Search non-existent doc result: {
  annotations: [],
  error: "Document not found in Annotation concept's view."
}
Verified search on non-existent document fails correctly.
✅ should fail if document is not found in concept's view

--- Principle Fulfillment Test: Annotation Concept ---
Principle: When users read a document, they can create and view highlighting or text annotations in the document. Users can label annotations with tags. Users can also search for annotations in a document with specific keywords or about certain ideas.

--- Test: Step 1: Registering document document:TheGreatBook for user user:Reader. ---
✅ Step 1: Registering document document:TheGreatBook for user user:Reader.

--- Test: Step 2: user:Reader creates tags 'Character' and 'Theme'. ---
Tags created: 019a10a6-1e11-73cb-823f-60b528e26506, 019a10a6-1e4c-7926-a500-20049c8878a5
✅ Step 2: user:Reader creates tags 'Character' and 'Theme'.

--- Test: Step 3: user:Reader creates multiple annotations on the document. ---
Created annotation 1 (Character description): 019a10a6-1e79-74a5-a0d1-e647c4e2e8b0
Created annotation 2 (Theme highlight): 019a10a6-1ecd-7a15-bf46-d46c239a0810
Created annotation 3 (Question about theme): 019a10a6-1f10-7801-81c8-1be11a696d57
Created annotation 4 (General note): 019a10a6-1f51-7106-90c5-8d24ebbd11f1
✅ Step 3: user:Reader creates multiple annotations on the document.

--- Test: Step 4: user:Reader searches for annotations with 'personality'. ---
Search result 1 (personality): [ "019a10a6-1e79-74a5-a0d1-e647c4e2e8b0" ]
Verified search by content keyword 'personality'.
✅ Step 4: user:Reader searches for annotations with 'personality'.

--- Test: Step 5: user:Reader searches for annotations with tag 'Theme'. ---
Search result 2 (Theme tag): [
  "019a10a6-1ecd-7a15-bf46-d46c239a0810",
  "019a10a6-1f10-7801-81c8-1be11a696d57"
]
Verified search by tag 'Theme'.
✅ Step 5: user:Reader searches for annotations with tag 'Theme'.

--- Test: Step 6: user:Reader searches for annotations with 'language' (matches content) or 'Character' (matches tag). ---
Search result 3 (language): [ "019a10a6-1f10-7801-81c8-1be11a696d57" ]
Verified search by content 'language'.
Search result 3 (Charac tag): [ "019a10a6-1e79-74a5-a0d1-e647c4e2e8b0" ]
Verified search by partial tag 'Charac'.
✅ Step 6: user:Reader searches for annotations with 'language' (matches content) or 'Character' (matches tag).

--- Test: Step 7: user:Reader views all annotations in document:TheGreatBook (by checking document view directly). ---
Verified all annotations can be found/viewed directly from the document view.
✅ Step 7: user:Reader views all annotations in document:TheGreatBook (by checking document view directly).

✅ Principle successfully demonstrated!
```