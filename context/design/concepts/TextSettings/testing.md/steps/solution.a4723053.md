---
timestamp: 'Thu Oct 23 2025 04:31:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_043134.d472dbbd.md]]'
content_id: a4723053295f5d2f418f9b31cea59a130785afde0eac88f354c7cede5531828d
---

# solution: Handling Cross-Concept Interactions with Synchronizations (Syncs)

To adhere to Concept Design principles, especially **Concept Independence** and **Separation of Concerns**, the problematic effect in `createUserSettings` must be removed from the `TextSettings` concept's direct responsibility. Instead, this cross-concept interaction should be orchestrated by a **Synchronization (Sync)**.

**Proposed Revised `createUserSettings` Effects (within `TextSettings`):**

The `createUserSettings` action in `TextSettings` should *only* focus on its core responsibility:

* Creates settings with font, fontSize, lineHeight.
* Sets the user's default to these settings.
* Returns the ID of the created `TextSettings`.

The implementation of `createUserSettings` in `src/TextSettings/TextSettingsConcept.ts` has already followed this revised interpretation, omitting the problematic clause.

**Proposed Sync to Achieve the Desired "Default Settings on New Document" Behavior:**

The original principle states: "When opening a new document, users will have their default display settings loaded in." This can be achieved with a sync that listens for a new document being created and then applies the user's default settings.

Let's assume there's a `Document` concept with an action `createDocument(userId: User): (document: Document)` and a `Session` concept that tracks the `user` of a `session`.

```
sync ApplyUserDefaultSettingsToNewDocument
when
    Document.create(d, u) // When a document 'd' is created by user 'u' (assuming 'u' is passed to Document.create or implied by session)
where
    in TextSettings: userDefaults of u is dsId // Query TextSettings to get the default settings ID for user 'u'
    in TextSettings: textSettings of dsId has font f, fontSize s, lineHeight lh // Query TextSettings to get the details of the default settings
then
    TextSettings.createDocumentSettings(font: f, fontSize: s, lineHeight: lh, document: d) // Use TextSettings action to set current settings for document 'd'
```

**Explanation of the Sync:**

* **`when Document.create(d, u)`**: This clause listens for the `create` action in a separate `Document` concept. It captures the new `document`'s ID (`d`) and the `user` who created it (`u`).
* **`where` clauses**:
  * `in TextSettings: userDefaults of u is dsId`: This queries the `TextSettings` concept's `userDefaults` state to find the `ID` (`dsId`) of the default `TextSettings` associated with `user` `u`.
  * `in TextSettings: textSettings of dsId has font f, fontSize s, lineHeight lh`: This further queries the `TextSettings` concept to retrieve the actual font, fontSize, and lineHeight values (`f`, `s`, `lh`) for the default settings configuration identified by `dsId`.
* **`then TextSettings.createDocumentSettings(...)`**: This calls an action on the `TextSettings` concept itself, using the retrieved details (`f`, `s`, `lh`) and the new `document` ID (`d`) to establish the document's current settings.

This synchronization properly separates concerns:

* `Document` concept focuses solely on managing documents.
* `TextSettings` concept focuses solely on managing text settings and their associations.
* The `sync` provides the declarative glue that connects their behaviors to fulfill the overall application principle, without either concept having direct knowledge of the other's internal logic.
