---
timestamp: 'Mon Nov 10 2025 16:40:53 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_164053.c65f2ae7.md]]'
content_id: 6d850d5a5b808c92948d7b224b7209aec6c9635f1d29a7c8aeb266f4db66e35a
---

# response:

You've hit on a very precise and important TypeScript error related to the branded `ID` type. Excellent catch!

The error message `Argument of type 'string' is not assignable to parameter of type 'ID'` is telling you that even though an `ID` is a `string` at runtime, the type system considers them different because of the type branding. You were correctly casting the value from the frame, but you cast it to `string` when the `.includes()` method was expecting the branded `ID` type.

The fix is simple and direct: we just need to cast to `ID` instead of `string`. This assures TypeScript that we intend for this plain string value from the request to be treated as a branded identifier.

Here is the corrected `focus.sync.ts` file with that one-character fix applied in both synchronizations.
