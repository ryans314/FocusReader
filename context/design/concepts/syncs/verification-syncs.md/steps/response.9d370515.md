---
timestamp: 'Mon Nov 10 2025 17:23:45 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_172345.45dfe5d2.md]]'
content_id: 9d370515179554634bba11715df506baa7cbb8f28a62113ebb66a2ff6905fc1f
---

# response:

You are right, my apologies. That bug is subtle and relates to how the `actions` helper function expects its mapping function to be structured.

Let me repeat your prompt to ensure I'm addressing the correct issue.

**Prompt:** Mostly worked, but still getting one bug: `Type '({ [library]: libResult }: {}) => { library: any; document: symbol; }' is not assignable to type 'Mapping'. Index signature for type 'string' is missing in type '({ [library]: libResult }: {}) => { library: any; document: symbol; }'.deno-ts(2322)` for the then in `RemoveDocumentRequest`.

***

### Analysis and Fix

The error occurs because the type definition for the mapping function inside a `then` clause is more specific than what standard TypeScript destructuring allows in this context. The `actions` helper expects a function that takes the *entire frame* as a single argument (conventionally named `$`) and returns a record of the inputs for the action.

Your previous code attempted to destructure the frame directly in the function's arguments: `({ [library]: libResult }) => ...`.

The correct pattern is to take the whole frame `$` and access its properties using `$[variable]`.

Here is the corrected `then` clause for `RemoveDocumentRequest`:

```typescript
  then: actions([
    Library.removeDocument,
    // FIX: The mapping function must take the entire frame ($) as its argument.
    // We then access the variables from the frame to build the action's input object.
    ($) => ({
      library: ($[library] as any)[0].library._id,
      document: $[document],
    }),
  ]),
```

I have applied this fix to the complete `verification.sync.ts` file below.

***
