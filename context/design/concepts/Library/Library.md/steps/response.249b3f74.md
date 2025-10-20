---
timestamp: 'Mon Oct 20 2025 02:42:56 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_024256.70062c88.md]]'
content_id: 249b3f74cce01b057be07a369e2d08ca387b17adbcae9f8e0fc76655141ed9b1
---

# response:

This is a crucial point about how to define the canonical state of a concept versus how different contexts might interact with a subset of that state. You're effectively asking if `Document` should be an "aggregate root" for `TextSettings` and `FocusStats`, or if those concerns should be inverted, with `TextSettings` and `FocusStats` managing their own collections of `Document`s.

Let's break this down, incorporating the `concept-state` document, particularly the "Multiple Structures" section.

***

### Re-evaluating Document's Responsibilities

Your core idea is that `Document`, in certain contexts, only *needs* a subset of its full properties. For example:

* **For `Library`:** `Document` needs `name` and `epubContent` (to be listed and retrieved).
* **For `TextSettings`:** `Document` needs its `TextSettings` (to know *which settings* apply).
* **For `FocusStats`:** `Document` needs its `FocusStats` (to know *which stats* apply).

The challenge is that a concept's `state` definition describes its *full, canonical identity*. It doesn't change based on context. If `Document` *has* `TextSettings` and `FocusStats` as intrinsic parts of its persistent, personalized reading experience, then those references belong in `Document`'s state.

***

### Understanding `concept-state`: "Multiple Structures"

The "Multiple Structures" section states:

> "An object can have multiple data structures (represented as objects) to define different views of the same object. For instance, a document might have a "summary" object and a "detailed" object. Each structure can have a different set of properties defined for it, allowing the same conceptual object to be viewed in different ways."

This guideline is about *internal organization* within a single concept. For example, if your `Document` concept itself became very large, you might refactor its state to be:

```
a set of Documents with:
*   a name String
*   an epubContent BinaryData
*   a displayPreferences DocumentDisplayPreferences // New nested object
*   a readingProgress DocumentReadingProgress     // New nested object
*   a set of Annotations
```

Where `DocumentDisplayPreferences` and `DocumentReadingProgress` would be inline, unnamed composite objects within the `Document`'s state definition, representing structured views *of the Document's properties*.

**Your current design (and my recommended one) already aligns well with the *spirit* of "Multiple Structures":**

Your `Document` concept bundles its `epubContent` with references to `TextSettings`, `FocusStats`, and `Annotations`.

* `epubContent` represents the *content aspect* of the document.
* `textSettings` represents the *display aspect* of the document.
* `focusStats` represents the *progress aspect* of the document.
* `annotations` represents the *interactive notes aspect* of the document.

Each of these is a distinct `concept` (or a `set` of concepts for `Annotations`) that represents a specific "view" or facet of the `Document`'s overall personalized reading experience. `Document` serves as the central orchestrator that *aggregates* these different aspects.

***

### Critique of the Proposed Inversion of Control

Your suggestion is to invert this relationship: `Document` would be minimal, and `TextSettings` and `FocusStats` concepts would *each maintain their own collection of references to `Document`s*.

Let's consider this `TextSettings` concept:

```
a set of TextSettings with:
*   a set of Documents // (Documents that share this specific TextSettings profile)
*   a fontFamily String
*   a fontSize Integer
*   // ... other setting properties
```

Here's why this inversion is generally problematic for your use case, even with "Multiple Structures" in mind:

1. **Loss of Per-Document Specificity (Crucial):**
   * **User Expectation:** As discussed, users *expect* to have unique display settings (and obviously unique reading stats) for *each individual document*.
   * **Proposed Model's Consequence:** For `TextSettings` to apply to *only one* `Document`, you'd need to create a unique `TextSettings` concept instance *for every single `Document`*, where each instance's `set of Documents` contains only that one `Document`. This makes `TextSettings` a "glorified wrapper" around the actual settings data, which then references *one* document. This is verbose and less direct.
   * If `TextSettings` were designed to be shared (e.g., "my default font for all new books"), then it would make sense for `TextSettings` to list the documents that apply it. But even then, an individual `Document` would typically override these global settings, still requiring a direct link from `Document` to its *actual* effective settings.

2. **Inverse Lookups & Performance:**
   * **Current Design:** To get `Document X`'s `TextSettings`, you simply access `Document X.textSettings`. It's a direct conceptual lookup.
   * **Proposed Design:** To get `Document X`'s `TextSettings`, the system would have to search *through all `TextSettings` concepts* in your system to find the specific `TextSettings` instance whose `set of Documents` contains `Document X`. This is an inefficient and conceptually indirect operation. The relationship is hard to navigate from the `Document` side.

3. **Weakened `Document` Cohesion & Identity:**
   * `Document` is the central entity for the reading experience. Stripping it of its `TextSettings`, `FocusStats`, and `Annotations` reduces it to a generic "file object." The "personality" of the user's specific ebook instance is lost.
   * When a user "opens a document," they're not just opening `epubContent`; they're opening *their personalized view of that content*. This includes their settings, their progress, and their notes. `Document`, as the aggregator, accurately represents this.

4. **"Separation of Concerns" Misinterpretation:**
   * While you want separation, you also want **cohesion**. The `Document`'s concern is the *entirety of the user's personalized interaction with a single ebook*. The `TextSettings` concern is the *specific profile of display preferences*. The `FocusStats` concern is the *specific record of reading progress*.
   * In the current design:
     * `Document` is concerned with orchestrating *its* components.
     * `TextSettings` is concerned with its own `fontFamily`, `fontSize`, etc.
     * `FocusStats` is concerned with its own `pagesRead`, `timeSpent`, etc.
   * In the proposed design, `TextSettings` would become concerned with *which documents use it*, which dilutes its primary concern of simply *being a set of settings*. This makes `TextSettings` a "glorified list" of documents that just happen to share settings, rather than a concept primarily defining display preferences.

***

### Conclusion

Your current design, where `Document` holds references to *its specific* `TextSettings`, `FocusStats`, and `Annotations`, is generally the stronger conceptual model.

* It accurately portrays `Document` as the central entity representing a **user's personalized instance of an ebook**, bringing together the content and all associated user data.
* It supports **per-document customization** naturally.
* It maintains **direct, efficient relationships** for accessing a `Document`'s related data.
* It aligns with the *spirit* of `concept-state`'s "Multiple Structures" by allowing `Document` to be seen as having various facets (content, display, progress, notes), each handled by a dedicated (referenced) conceptual object, while maintaining `Document` as the coherent whole.

While `Document` has many properties, they are all conceptually cohesive to define *that specific user's personalized ebook experience*. Refactoring them out into other concepts that then reference `Document` would make `Document` itself less meaningful and complicate the conceptual relationships significantly.
