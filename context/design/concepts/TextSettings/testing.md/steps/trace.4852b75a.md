---
timestamp: 'Thu Oct 23 2025 04:32:46 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_043246.f4380e77.md]]'
content_id: 4852b75a3409eca90f3a14e6818e5e7626b257629cd0d2525e2dcf2726e2e3bc
---

# trace:

**Principle Trace: Default settings loaded for new document, then customized**

This trace demonstrates the core principle of the `TextSettings` concept: a user sets up default preferences, a new document picks them up, and then the user can customize those settings specifically for that document, with the changes being remembered.

1. **Action: `createUserSettings`** (for `user:PrincipleUser`)
   * **Input:** `user: "user:PrincipleUser"`, `font: "DefaultFont"`, `fontSize: 10`, `lineHeight: 15`
   * **Requires:** User "user:PrincipleUser" exists (assumed by external concept), no default settings yet for this user, valid font/size/height. (All met)
   * **Effects:** A new `TextSettings` document is created in `textSettingsCollection` with the provided font, size, and height. An entry in `userDefaultsCollection` is created linking "user:PrincipleUser" to this new `TextSettings` ID. The ID of the new settings is returned.
   * **Verification:** Query `_getUserDefaultSettings("user:PrincipleUser")` to confirm that the default settings are correctly stored and match the input values.

2. **Simulated Sync Action: `createDocumentSettings`** (for `doc:PrincipleDoc`)
   * *(Note: This step simulates the behavior that would typically be orchestrated by a `sync` that triggers when a `Document` is created by a `User`, and retrieves that `User`'s default settings from this `TextSettings` concept.)*
   * **Input:** `document: "doc:PrincipleDoc"`, `font: "DefaultFont"`, `fontSize: 10`, `lineHeight: 15` (These are the values fetched from the user's default settings via the hypothetical sync).
   * **Requires:** Document "doc:PrincipleDoc" exists (assumed by external concept), no current settings yet for this document, valid font/size/height. (All met)
   * **Effects:** A new `TextSettings` document is created in `textSettingsCollection` (if a distinct one is needed for the document, or possibly reusing the user's default `TextSettings` ID if the concept allows direct reuse). An entry in `documentCurrentsCollection` is created linking "doc:PrincipleDoc" to the `TextSettings` ID, reflecting the user's default settings. The ID of the new settings is returned.
   * **Verification:** Query `_getDocumentCurrentSettings("doc:PrincipleDoc")` to confirm that the document's current settings are set and match the user's default values.

3. **Action: `editSettings`** (to customize `doc:PrincipleDoc`)
   * **Input:** `textSettings: <documentCurrentSettingsId>`, `font: "CustomFont"`, `fontSize: 12`, `lineHeight: 18`
   * **Requires:** `documentCurrentSettingsId` exists, valid font/size/height. (All met)
   * **Effects:** The `TextSettings` document identified by `documentCurrentSettingsId` in `textSettingsCollection` is updated to have `font: "CustomFont"`, `fontSize: 12`, `lineHeight: 18`. An empty object `{}` is returned on success.
   * **Verification:** Query `_getDocumentCurrentSettings("doc:PrincipleDoc")` again to confirm that the document's current settings now reflect the `CustomFont`, `customFontSize`, and `customLineHeight`.

This trace confirms that:

* Users can establish personal default text settings.
* Documents can be initialized with these defaults (via an external trigger).
* Document-specific settings can then be modified and are persisted, overriding the user's default for that particular document.
