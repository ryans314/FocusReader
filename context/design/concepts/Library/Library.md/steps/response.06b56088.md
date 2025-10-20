---
timestamp: 'Mon Oct 20 2025 00:06:05 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_000605.d53e58f4.md]]'
content_id: 06b56088ea15283398a491ff008bd8a2486ad33cc275f13733d07847a682810a
---

# response:

That's an excellent question, and it highlights a subtle point of interpretation when working with conceptual models and specific constraints!

Let's re-examine the `concept-state` document's wording carefully:

> "These object types can contain a specific type (String, Integer, Float, Boolean, Date, etc.) or **a reference to another object** (e.g. User, Document)."

This sentence, taken in isolation, *could* be interpreted in two ways:

1. **Literal interpretation (embedding):** "A reference to another object" means you write `user User` or `document Document` in the state, implying the *full conceptual object* `User` or `Document` is conceptually nested/embedded.
2. **Identifier interpretation (linking):** "A reference to another object" is a conceptual shorthand for "a mechanism to locate and relate to another object," which in a practical system (especially one using object IDs like MongoDB) is achieved by storing its unique identifier.

**Given the full context of your project, especially the specific assignment description, I still come to the same conclusion: you must use `ConceptId` (e.g., `UserId`, `DocumentId`) rather than directly naming the conceptual object (`User`, `Document`) in the `state` definition of another concept.**

Here's why:

1. **The Overriding Assignment Rule:** The most critical piece of information is the explicit rule you provided:

   > "Make sure that all of the arguments and results of your actions are either primitive values (strings, numbers, etc) or object identifiers (actually document identifiers in MongoDB). **Composite objects should be used only inside concept implementations and never exposed.**"

   * **"Composite objects... never exposed":** If `User` itself is a composite object (which it is, as it would likely have attributes like `name`, `email`, `passwordHash`, etc.), and `Document` is definitely a composite object (with `name`, `epubFileId`, `textSettingsId`, etc.), then listing `user User` or `document Document` directly within the state of `Library` *would be exposing a composite object* as part of `Library`'s immediate structure.
   * **Consistency:** While the rule explicitly mentions action arguments/results, the "never exposed" part applies more broadly to how concepts relate to each other in the model. If you use IDs for actions, it makes logical sense to use them for state relationships too.

2. **Interpretation of "Reference to another object":** In the context of database design and robust conceptual modeling, when a concept "references" another, it almost invariably does so via a unique identifier. The `concept-state` document is providing a general guideline, and its examples (`User`, `Document`) are *names* of other conceptual entities. How you actually establish that "reference" is then determined by more specific constraints (like your assignment description).

3. **Practical Implications (as discussed before):**
   * **Normalization:** Each `User`, `Document`, `EpubFile`, etc., is a top-level entity with its own definition. Embedding full objects would lead to denormalization.
   * **Single Source of Truth:** Changes to a `Document`'s properties (like its `name` or `textSettingsId`) should only need to be updated in one place (the `Document` itself), not in every `Library` that might contain it.
   * **Scalability:** Storing IDs is lightweight. Storing potentially large, nested objects (especially if `Document` has many `Annotation` IDs, and `Annotation` could eventually become composite) within another object can lead to oversized database documents and performance issues.

**Conclusion:**

While the `concept-state` document uses the phrase "a reference to another object (e.g. User, Document)", given the strict "Composite objects should be used only inside concept implementations and never exposed" rule, the *only way* to represent that reference without exposing the composite object is by using its unique identifier.

Therefore, for your `Library` concept, you should absolutely continue to use `userId: UserId` and `documentIds: DocumentId[]`. This adheres to the spirit of "referencing another object" in a robust, normalized way, and critically, it respects the explicit constraint of your assignment.
