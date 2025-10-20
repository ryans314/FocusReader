---
timestamp: 'Sun Oct 19 2025 23:52:28 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_235228.33f2e6db.md]]'
content_id: 3517bb6cdc46fb7a05362a38c2c0e8c7555ac6102372d7555ceea0df88a62f8c
---

# response:

Yes, you absolutely **still need to use object identifiers** (e.g., `documentIds: DocumentId[]`) rather than embedding the full `Document` objects directly into the `Library` state.

Let's clarify why, based on the assignment description's guidance:

The rule states:

> "Make sure that all of the arguments and results of your actions are either primitive values (strings, numbers, etc) or object identifiers (actually document identifiers in MongoDB). **Composite objects should be used only inside concept implementations and never exposed.**"

While this explicitly mentions action arguments and results, the phrase "Composite objects should be used only inside concept implementations and never exposed" implies a broader design principle for your conceptual model.

Here's a breakdown:

1. **Each `state` entry defines a Top-Level Entity:**
   When you define:
   ```
   a set of Libraries with: ...
   a set of Documents with: ...
   a set of EpubFiles with: ...
   ```
   You are effectively defining the schema for distinct, top-level "collections" or "tables" in your conceptual model (which often maps directly to MongoDB collections or similar database structures). Each `Library`, `Document`, and `EpubFile` is its own independent "composite object."

2. **Embedding Composite Objects in State = Exposing Them:**
   If you were to define `Library` as:
   ```
   a set of Libraries with:
   *   a userId UserId
   *   a set of Documents (where each Document is the full object with name, epubFileId, etc.)
   ```
   This would mean that the `Library` composite object *directly contains* other `Document` composite objects within its own conceptual state definition. This directly "exposes" the `Document` composite object as part of the `Library`'s immediate structure, violating the principle.

3. **Identifiers for Relationships:**
   The intent is that relationships *between* these top-level composite objects should be established using their unique identifiers.
   * A `Library` doesn't *contain* `Document` objects; it *refers to* them via their `DocumentId`s.
   * A `Document` doesn't *contain* an `EpubFile` object; it *refers to* it via its `EpubFileId`.

4. **Why this design is beneficial (and matches MongoDB):**
   * **Normalization/Consistency:** Each type of entity (`Library`, `Document`, `EpubFile`) has a single definition and can be updated independently. If a `Document`'s name changes, you only update that `Document` record, not every `Library` that might have embedded it.
   * **Avoids Deep Nesting:** Embedding full objects can lead to very deep, complex structures, which are harder to manage, query, and update.
   * **Reference by ID is Standard:** This pattern of storing arrays of IDs (like `documentIds`) to represent relationships is a very common and recommended approach for modeling relationships in document databases like MongoDB.
   * **Clearer API:** Your actions then deal with manipulating these identifiers, rather than complex nested object structures.

**Conclusion:**

Yes, maintain the design where `Library` holds `documentIds: DocumentId[]`. This ensures that `Library`, `Document`, `EpubFile`, `TextSettings`, `FocusStats`, and `Annotation` are all treated as distinct, identifiable composite objects, and their relationships are managed through identifiers, adhering to the "no exposed composite objects" rule for your concept's state.
