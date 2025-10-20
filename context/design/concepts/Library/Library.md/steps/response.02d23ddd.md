---
timestamp: 'Mon Oct 20 2025 02:55:08 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_025508.8f4946b9.md]]'
content_id: 02d23ddd931bfa20427add08144033aaad6bc6af7170806401f22559623e0eef
---

# response:

You've hit on a very common and important conceptual modeling dilemma, and it's excellent to scrutinize it against the principles of concept design. Let's refer to the provided context, particularly the sections on "Separation of concerns," "Completeness of functionality," and the examples in `concept-state` and the "Concept Design Rubric."

Your concern is that by including references to `TextSettings`, `FocusStats`, and `Annotations` within the `Document` concept's state, it might violate separation of concerns, implying that `Document` is trying to manage too much or "force functionality" from other concepts.

Let's break this down:

### 1. "Separation of Concerns" (from `concept-design-overview`)

The context states:

> "This means that each concept addresses only a single, coherent aspect of the functionality of the application, and does not conflate aspects of functionality that could easily be separated."
>
> **Example of conflation:** "it is common for a *User* class to handle all kinds of functions associated with users: authentication, profiles, naming, choice of communication channels for notification, and more. In a concept design, these would be separated into different concepts: one for authentication, one for profiles, one for naming, one for notification, and so on. The state declaration form makes it easy to associate the appropriate properties or fields with user objects in each concept." (e.g., `UserAuthentication` stores username/password, `Profile` stores bio/thumbnail, `Notification` stores phone/email).

**Application:**
This principle advocates that `TextSettings` should *not* define user authentication details, nor should `FocusStats` define font choices. Each of these concepts (`TextSettings`, `FocusStats`, `Annotation`) is, in your design, a separate, cohesive concept responsible for its own specific set of data and behaviors related to *that specific concern*.

The `Document` concept, by simply holding a *reference* (`a settings TextSettings`, `a stats FocusStats`, `a set of Annotations`), is **not conflating their functionality**.

* `Document` is **not** defining the `font`, `fontSize`, or `lineHeight` properties; `TextSettings` does that.
* `Document` is **not** defining `pagesRead` or `timeSpent`; `FocusStats` does that.
* `Document` is **not** defining the `text` or `location` of an annotation; `Annotation` does that.

Instead, `Document`'s concern is to act as the **aggregator for a single, personalized ebook reading experience**. For a user to read *this specific ebook*, they need to know its content, how it should be displayed (settings), what their progress is (stats), and what notes they've made (annotations). These are all distinct facets that collectively define *that particular document instance for that user*.

### 2. "Completeness of functionality" (from `concept-design-overview`)

The context states:

> "Another key distinction between concept design and traditional design is that concepts are *complete* with respect to their functionality and don't rely on functionality from other concepts. For example, a *Notification* concept that has an action to notify a user cannot "make a call" to an action of an emailing or text messaging context to actually deliver a notification. Instead that functionality would be part of the *Notification* concept itself."

**Application:**
This reinforces that `TextSettings` should contain all its own logic for managing settings, `FocusStats` for stats, etc. `Document` is not "making calls" to these concepts in its own actions; rather, its state *refers* to instances of these concepts. When a `TextSettings` action like `updateFontSize` occurs, it acts solely on the state of the `TextSettings` concept. The `Document` concept doesn't need to know the internal workings of `updateFontSize` to fulfill its own purpose of representing the aggregated ebook instance.

### 3. "Multiple structures" (from `concept-state`)

As we discussed, this section illustrates how:

> "multiple declarations can define structural aspects of the 'same object.' In the two declarations below, for example, a user acquires a username and password from the first, and an avatar and display name from the second. This kind of separation of concerns is a central feature of concept design..."

**Application:**
This pattern shows how a single logical entity (like `User`) can have its properties defined across multiple conceptual contexts (e.g., `UserAuthentication` provides `username/password`, `UserProfile` provides `Avatar/displayName`).

Your `Document` concept is actually aligned with this principle. While `Document` itself aggregates references, the `TextSettings` concept itself, if it were to have properties defined across multiple contexts (e.g., a core `TextSettings` concept defining font/size, and a `Theme` concept defining color palettes that `TextSettings` references), would exemplify this. More directly, the `Document` concept serves as the orchestrating point for these distinct "structural aspects" of *the reading experience*:

* `epubContent` is the content aspect.
* `settings TextSettings` is the display configuration aspect.
* `stats FocusStats` is the reading progress aspect.
* `annotations set of Annotations` is the interactive notes aspect.

Each of these is a distinct, referencable entity. `Document`'s responsibility is to bind them together for *this specific instance*.

### 4. "Concept Design Rubric" - "Separation of concerns" criterion

The rubric advises against:

> "The state admits a factoring into two or more independent parts (eg, a user concept mixes preferences and profile fields)."
> "The concept contains references to external objects and stores properties of them that are not needed for this concept (eg, references to users along with their names, which would better be stored in a separate profile concept)."

**Application:**
The key here is "mixes preferences and profile fields" (meaning, the raw data fields, not just references) or "stores properties of them that are not needed."

* `Document` is *not* mixing `TextSettings`' raw fields into its own state. It's not declaring `font String`, `fontSize Number` directly within `Document`. It's storing a *reference* (`a settings TextSettings`) to an instance of the separate `TextSettings` concept.
* These references (`a settings TextSettings`, `a stats FocusStats`, `a set of Annotations`) *are* needed for the `Document` concept's core purpose: to represent the complete, personalized ebook instance. Without them, `Document` would just be raw binary data, devoid of the user-specific context that makes it a "document" in the user's library.

### Conclusion

Based on the provided context, having `Document` reference `TextSettings`, `FocusStats`, and `Annotations` does **not violate separation of concerns**. Instead, it's a correct application of the principles:

1. **Each of `TextSettings`, `FocusStats`, and `Annotation` remains a distinct, independent concept**, managing its own specific data and behavior.
2. The **`Document` concept's "single, coherent aspect of functionality" is to represent the *personalized ebook instance***, which inherently means bringing together its content with its unique display settings, reading progress, and annotations.
3. By storing *references* to these other concepts, `Document` maintains its cohesion without conflating the specific responsibilities of `TextSettings`, `FocusStats`, or `Annotation`. This aligns with the authoritative `concept-state` example provided, which explicitly shows `Document` having `a settings TextSettings` and `a stats FocusStats`.

The `Library` concept, in turn, manages a collection of these fully realized `Document` concepts, keeping its own concern focused on the collection aspect.
