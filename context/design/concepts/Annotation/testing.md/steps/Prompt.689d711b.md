---
timestamp: 'Thu Oct 23 2025 06:12:52 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_061252.62be21bb.md]]'
content_id: 689d711bd2f2f05977b9190c5911703fe4a64055971ff7049f890ec5e0364a94
---

# Prompt: That solved that issue, but there's a different part of the Annotation Search test that is failing. It's in the following t.step:

```
await t.step("should not return annotations from other users", async () => {

    console.log("--- Test: search (other user's annotation) ---");

    // Alice searches on docB (which she doesn't own, and contains Bob's annotation)

    // The first check in search() should catch this if the document view for docB

    // has a creator property that isn't Alice.

    const result = await concept.search({

      user: userAlice,

      document: docB,

      criteria: "Bob's",

    });

    assertExists(

      result.error,

      "Alice should not be able to search on Bob's document view.",

    );
```

The above code gives the following error:

```
AssertionError: Expected actual: "undefined" to not be null or undefined: Alice should not be able to search on Bob's document view.

```
