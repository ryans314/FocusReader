---
timestamp: 'Mon Oct 20 2025 06:27:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_062734.4a1a3aa3.md]]'
content_id: 5cc609e743b2c30fc76528269a50ccdf2f20898337bc585f1d37c89730e3b5aa
---

# response:

That's an excellent and very practical question, and it highlights a common design pattern in APIs!

The Concept Design specification language, as described, doesn't have an explicit `optional` keyword for action parameters within the signature itself (e.g., `param: optional String`). However, it gives us a crucial clue:

> "When actions are implemented in TypeScript code, each action is represented by a method that takes a **dictionary object as input** and returns a dictionary object as output. The fields of the dictionary objects are the input argument and result names."

This implies that the *dictionary object* itself can contain optional fields. In a specification, we represent these as individual parameters, and the mechanism for making them "optional" then comes from how the `effects` clause is written and how the calling mechanism (the syncs, or direct API calls) can omit values.

Here's the recommended way to indicate optional parameters for your `updateAnnotation` action, blending clarity for the specification with its intended implementation:

***

### **1. Use a standard informal notation (like `?`) for clarity in the signature**

While not a formal grammar rule in the provided text, using `?` (as in TypeScript) or explicitly writing `optional` is a widely understood convention for indicating optional parameters in API specifications. This clearly communicates the intent.

### **2. Explicitly describe the conditional effects**

The `effects` clause is where you define the behavior. You must explicitly state that a state component is only updated *if* the corresponding optional parameter is provided.

### **3. Add a clarifying note (optional but good practice)**

If ambiguity might arise, a note can explain how "optional" parameters are handled (e.g., that `null` or `undefined` input for an optional parameter means "no change").

***

Let's apply this to your `updateAnnotation` action:

**Revised `updateAnnotation` Action:**

```
updateAnnotation(
    user: User,
    annotation: Annotation,
    color?: String,         // Optional: if provided, updates the annotation's color
    content?: String,       // Optional: if provided, updates the annotation's content
    location?: Location,    // Optional: if provided, updates the annotation's location
    tags?: Set[Tag]         // Optional: if provided, replaces the annotation's tags for this annotation
)
    **requires** annotation exists AND annotation's creator is user
    **effects**
        IF color IS PROVIDED THEN annotation.color := color
        IF content IS PROVIDED THEN annotation.content := content
        IF location IS PROVIDED THEN annotation.location := location
        IF tags IS PROVIDED THEN annotation.tags := tags
```

**Explanation for this approach:**

* **`color?: String` (and similar for others):** The `?` clearly indicates that these parameters are optional. When implementing in TypeScript, this would directly translate to `color?: string` in the input dictionary interface.
* **`IF ... IS PROVIDED THEN ...` in `effects`:** This explicitly states the conditional logic. If the `color` parameter is present in the input dictionary (and not `undefined` or `null`, if `null` isn't meant to clear the field), then the annotation's color is updated. Otherwise, it remains unchanged.

  * **Important Note on `null` vs. `undefined`**: If a state field (e.g., `color`) is defined as `String` (implying non-null), then providing `null` for `color` as an optional parameter would typically be an error unless specifically defined to clear the field. For simplicity in concept design, `IS PROVIDED` usually means "a non-null, valid value for the type was supplied." If you had `an optional color String` in your state, then `null` as input could explicitly mean "remove the color." Given your current state, `color: String` implies it must always have a string value.

***

This approach is robust, clear, and aligns well with the practical implementation hints provided in the Concept Design documentation.
