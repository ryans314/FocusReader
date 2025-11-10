---
timestamp: 'Mon Nov 10 2025 10:17:56 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_101756.949a535a.md]]'
content_id: f22e23c9a21c599ce19799d87dd9b9d36dfff1ab4baf83d1389e09230fb768ef
---

# Prompt: one more error:

```
Cannot find name 'document'. Do you need to change your target library? Try changing the 'lib' compiler option to include 'dom'.deno-ts(2584)
```

On the following lines:

```
  then: actions(

    // Proceed to create the document in the Library concept.

    // This action will either return { document: ID } on success or { error: string } on failure.

    [

      Library.createDocument,

      { name, epubContent, library: userOwnedLibraryId },

      { document: document /* symbol for the new document ID */ },

    ],
```
