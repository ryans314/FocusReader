---
timestamp: 'Thu Oct 23 2025 06:14:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_061414.b332f3cc.md]]'
content_id: ca9dcda799b0db11f5e96b74d9f974b2d2159e8974a7368fc1c226d4227749ad
---

# response:

You've pinpointed the exact issue! The failure in the `should not return annotations from other users` test step occurs because the `search` method in `AnnotationConcept.ts` *does not currently include an authorization check* that `user` must be the `creator` of the `document` being searched, unlike the `createAnnotation` method.

Let's trace it:

1. **Test Setup:**
   * `docA` is registered with `creatorId: userAlice`.
   * `docB` is registered with `creatorId: userBob`.
   * `annBob` is successfully created *by `userBob` on `docB`*. (This was the previous fix, enabling `annBob` to exist).

2. **Failing Test Line:**
   ```typescript
   const result = await concept.search({
     user: userAlice,
     document: docB, // Alice tries to search Bob's document
     criteria: "Bob's",
   });
   assertExists(result.error, "Alice should not be able to search on Bob's document view.");
   ```

3. **`AnnotationConcept.ts` `search` method logic:**
   ```typescript
   async search({ user, document, criteria }) {
       const docView = await this.documentViews.findOne({ _id: document });
       if (!docView) {
           // This is hit if 'document' itself doesn't exist in our documentViews collection.
           // But docB *does* exist, created by userBob.
           return { annotations: [], error: "Document not found in Annotation concept's view." };
       }
       // !!! MISSING AUTHORIZATION CHECK HERE !!!
       // If docView exists, the code proceeds. It does not check if docView.creator === user.

       // It then constructs a query that *does* include `creator: user`.
       // This means it will search for *Alice's* annotations on *Bob's* document.
       // Since Alice has no annotations on Bob's document, the query will return an empty array,
       // but *without* an error.
       const query = {
         creator: user, // <--- This filters results, but doesn't prevent the search attempt itself
         document: document,
         // ...
       };
       // ...
       return { annotations: foundAnnotations }; // foundAnnotations will be empty []
   }
   ```

The comment in your test, `// The first check in search() should catch this if the document view for docB // has a creator property that isn't Alice.`, explicitly states the intended authorization. The current implementation of `search` only checks if the document *exists*, not if the `user` attempting the search is the `creator` of that document (from the concept's `documentViews`).

**The Solution:**

We need to add an explicit authorization check within the `search` method, similar to the `createAnnotation` method. A user should only be able to search a document that they are considered the `creator` of within the `Annotation` concept's `documentViews`.

Here's the updated `AnnotationConcept.ts` and the corrected test file.

***
