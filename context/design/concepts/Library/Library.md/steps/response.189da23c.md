---
timestamp: 'Mon Oct 20 2025 02:52:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_025231.ec22804d.md]]'
content_id: 189da23c6a66975c4f12c7e2bd44d885a7d1df00fc3d38f11cc4b4d4aae8cc63
---

# response:

Thank you for providing the exact quote and for holding me to the highest sources of truth. I appreciate the precise re-direction.

Let's re-evaluate the proposal to separate `TextSettings` and `FocusStats` from `Document` (specifically, by having `TextSettings` and `FocusStats` contain `a set of Documents`) by strictly interpreting the "Multiple structures" section from the `concept-state` document:

The "Multiple structures" section states:

> "The relational view makes it easier to understand how multiple declarations can define structural aspects of the 'same object.' In the two declarations below, for example, a user acquires a username and password from the first, and an avatar and display name from the second. This kind of separation of concerns is a central feature of concept design and is not easily explained using traditional object-oriented notions that require an object to have a single global definition.
>
> ````
> a set of Users with
>   a username String
>   a password String
>
> a set of Users with
>   an Avatar
>   a displayName String
> ```"
> ````

This section describes a pattern where:

1. There is an underlying common "object" (e.g., `User`).
2. **Multiple distinct `set of <Object>` declarations** (potentially belonging to different concepts) *each define different properties or "structural aspects" for that same underlying object.*

**How this applies to your situation:**

If we were to apply the "Multiple structures" pattern to your `Document` concept, it would suggest that:

* A **`DocumentContent` concept** might define the core content aspects:
  ```
  a set of Documents with
    a name String
    an epubContent BinaryData
  ```
* A **`DocumentPersonalization` concept** might define the user-specific aspects for the *same `Document` object*:
  ```
  a set of Documents with
    a settings TextSettings
    a stats FocusStats
    a set of Annotations
  ```

In this scenario, `Document` remains the core conceptual entity, and different concepts provide different "views" by defining different properties *for that `Document` object*. This would be a valid application of the "Multiple structures" pattern, allowing `Document`'s full definition to be distributed across concerns.

**However, your proposal is different:**

Your proposal is to simplify `Document` and, instead, have:

* **`TextSettings` concept** containing:
  ```
  a set of TextSettings with
    a set of Documents // This concept lists documents that use its settings
    a font Font
    a fontSize Number
    // ... other settings ...
  ```
* **`FocusStats` concept** containing:
  ```
  a set of FocusStats with
    a set of Documents // This concept lists documents that share its stats
    a pagesRead Number
    a timeSpent Number
    // ... other stats ...
  ```

This proposed structure **does NOT align with the "Multiple structures" pattern**.

The "Multiple structures" pattern is about concepts defining properties *of the shared underlying object* (`User` in the example, or `Document` in our case).

Your proposal, in contrast, defines properties *of the `TextSettings` object* and *of the `FocusStats` object*. One of these properties happens to be a collection of `Document`s. This is an **inversion of the relationship** where `TextSettings` and `FocusStats` become the "owners" of the document list, rather than `Document` having its own specific `TextSettings` and `FocusStats`.

The "Multiple structures" example explicitly shows `a set of Users with ...` defining attributes of `Users`. It does not show `a set of AuthConcepts with a set of Users` or `a set of ProfileConcepts with a set of Users`. It's the `User` entity itself whose properties are being partitioned.

**Conclusion using "Multiple structures":**

While the "Multiple structures" section encourages separating concerns by defining different properties for the same logical object across multiple concepts, it does not support *inverting the primary relationship* as you proposed. The pattern shown is about enriching a common entity (`User` or `Document`) with different facets, not about having those facets collect references to the common entity.

Therefore, separating `Document` in the manner you proposed (where `TextSettings` and `FocusStats` contain a `set of Documents`) would **not** be a valid application of the "Multiple structures" principle. The authoritative example for `Document`'s state (which you previously provided and is "guaranteed correct") further reinforces that `Document` is intended to directly reference its `settings TextSettings` and `stats FocusStats`.
