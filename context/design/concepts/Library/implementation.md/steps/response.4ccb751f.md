---
timestamp: 'Fri Oct 24 2025 21:19:01 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_211901.f441f712.md]]'
content_id: 4ccb751f3c1d8bc9cb30a4b70e08827d6763553c4f343c2616187d4ba2646814
---

# response:

Yes, the backend implementation of the `Library` concept needs a small change to enforce the `.epub` file requirement.

Currently, the `createDocument` action takes `name: String` and `epubContent: BinaryData` (implemented as `string`). It doesn't perform any validation on the `epubContent` itself or the `name` to ensure it's an `.epub` file.

To support this requirement, you should add a **precondition** to the `createDocument` action. The most straightforward way to implement this, given the current input types, is to check if the `name` (which usually includes the file extension) ends with ".epub". More robust validation (like inspecting the binary data's MIME type or internal structure) would typically be handled by a specialized service *before* the data reaches this concept, or would require a more complex `BinaryData` type that includes MIME information. For the `Library` concept itself, a name-based check is suitable and maintains its modularity and independence.

Here's how you would update the concept specification and the TypeScript implementation:

***

### Updated Concept Specification

Modify the `createDocument` action's `requires` clause in your concept definition:

```concept
createDocument(name: String, epubContent: BinaryData, library: Library): (document: Document)
* **requires** library exists, a document with name does not already exist in the given library, AND name ends with ".epub" (case-insensitive)
* **effects** creates a new Document with name and file and adds it to library
```

***

### Updated Backend Implementation

Modify the `createDocument` method in `src/concepts/Library/LibraryConcept.ts` to include this new check:

```typescript
// src/concepts/Library/LibraryConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// ... (existing type definitions and class structure) ...

export default class LibraryConcept {
  // ... (existing collection declarations and constructor) ...

  /**
   * createDocument (name: String, epubContent: BinaryData, library: LibraryID): (document: DocumentID)
   *
   * **requires** library exists and a document with `name` does not already exist in the given `library`,
   *              AND `name` ends with ".epub" (case-insensitive)
   *
   * **effects** creates a new Document with `name` and `epubContent` and adds it to the `library`; returns the new document's ID
   */
  async createDocument({ name, epubContent, library }: { name: string; epubContent: string; library: LibraryID }): Promise<{ document?: DocumentID; error?: string }> {
    // Check precondition: library exists
    const existingLibrary = await this.libraries.findOne({ _id: library });
    if (!existingLibrary) {
      return { error: `Library ${library} does not exist.` };
    }

    // Check precondition: name ends with ".epub"
    if (!name.toLowerCase().endsWith(".epub")) {
      return { error: `Document name '${name}' must have a '.epub' extension.` };
    }

    // Check precondition: a document with name does not already exist in the given library
    const nameExistsInLibrary = await this.documents.findOne({
      _id: { $in: existingLibrary.documents },
      name: name,
    });

    if (nameExistsInLibrary) {
      return { error: `Document with name '${name}' already exists in library ${library}.` };
    }

    const newDocumentId = freshID() as DocumentID;
    const newDocument: DocumentDoc = {
      _id: newDocumentId,
      name,
      epubContent,
    };

    // Effect: creates a new Document
    await this.documents.insertOne(newDocument);

    // Effect: adds it to library's documents set
    await this.libraries.updateOne(
      { _id: library },
      { $push: { documents: newDocumentId } },
    );

    return { document: newDocumentId };
  }

  // ... (rest of the concept actions and queries) ...
}
```
