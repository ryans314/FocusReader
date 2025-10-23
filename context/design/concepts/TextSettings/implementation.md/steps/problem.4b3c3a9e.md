---
timestamp: 'Thu Oct 23 2025 04:29:01 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_042901.e6691e23.md]]'
content_id: 4b3c3a9eaf41ee9f612efacba47ba02df89ea35c82b6abff100f9497788bb4eb
---

# problem: Concept Independence Violation in `createUserSettings` Effect

The `TextSettings` concept specification includes the following effect in `createUserSettings`:

> **effects**
>
> * Creates settings with font, fontSize, lineHeight
> * Set's user's default to settings
> * **if locale is a Document, set document's current to settings**

This particular effect clause presents a significant problem in the context of Concept Design principles, specifically violating **Concept Independence** and **Separation of Concerns**.

1. **Violation of Concept Independence:** The `TextSettings` concept's primary responsibility is managing text display configurations and their association with users (defaults) and documents (currents) *within its own scope*. Directly instructing `TextSettings` to modify the "current settings" of a `Document` (an external generic type) couples this concept to the internal state and actions of a hypothetical `Document` concept. This breaks the rule that "Each concept is defined without reference to any other concepts, and can be understood in isolation." The `TextSettings` concept should not know about the internal mechanism by which a `Document` receives its "current settings."

2. **Ambiguity of "locale":** The term "locale" is undefined within the concept specification for `TextSettings` and is not provided as an argument to `createUserSettings`. This makes the condition "if locale is a Document" impossible to evaluate or implement without making external assumptions or introducing undeclared dependencies.

3. **Completeness/Responsibility Blurring:** The action of setting a document's current settings rightfully belongs either to the `Document` concept itself (which would accept `TextSettings` as an argument to its own `setCurrentSettings` action) or to an external orchestrating mechanism. For `TextSettings` to directly perform this action compromises the clear boundaries of responsibility that concept design aims to achieve.
