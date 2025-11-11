---
timestamp: 'Tue Nov 11 2025 01:00:52 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251111_010052.aa757fb1.md]]'
content_id: 75d555f3f7f63f954608913a1fdb1cc26f7fa374c7a67725fd415ca6253b3825
---

# file: src/concepts/Library/LibraryConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix, use concept name
const PREFIX = "Library" + ".";

// Generic types of this concept
type User = ID;
type LibraryID = ID; // Renamed to LibraryID to avoid conflict with Collection name
type DocumentID = ID; // Renamed to DocumentID to avoid conflict with Collection name

/**
 * State: a set of Libraries with:
 *   a user User
 *   a documents set of Documents
 *
 * NOTE: The 'export' keyword is added here so we can import this type in our syncs.
 */
export interface LibraryDoc {
  _id: LibraryID;
  user: User;
  documents: DocumentID[];
}

/**
 * State: a set of Documents with:
 *   a name String
 *   an epubContent BinaryData (represented as a string, e.g., base64 encoded data or a URL)
 */
interface DocumentDoc {
  _id: DocumentID;
  name: string;
  epubContent: string; // Assuming BinaryData is stored as a base64 string or a similar string representation
}

/**
 * Library concept:
 *
 * purpose:
 * allow users to add, remove, view, and access their uploaded documents
 *
 * principle:
 * A user can upload documents (.epub) to their library, view all of their uploaded documents,
 * and remove or open and read any of the documents in their library.
 */
export default class LibraryConcept {
  libraries: Collection<LibraryDoc>;
  documents: Collection<DocumentDoc>;

  constructor(private readonly db: Db) {
    this.libraries = this.db.collection(PREFIX + "libraries");
    this.documents = this.db.collection(PREFIX + "documents");
  }

  /**
   * createLibrary (user: User): (library: LibraryID)
   *
   * **requires** user is not already associated with a library
   *
   * **effects** creates a new library with user and an empty set of documents; returns the new library's ID
   */
  async createLibrary(
    { user }: { user: User },
  ): Promise<{ library?: LibraryID; error?: string }> {
    const existingLibrary = await this.libraries.findOne({ user });
    if (existingLibrary) {
      return { error: `User ${user} already has a library.` };
    }

    const newLibraryId = freshID() as LibraryID;
    const newLibrary: LibraryDoc = {
      _id: newLibraryId,
      user: user,
      documents: [],
    };

    await this.libraries.insertOne(newLibrary);
    return { library: newLibraryId };
  }

  /**
   * removeDocument (library: LibraryID, document: DocumentID): Empty
   *
   * **requires** library exists and document is in library
   *
   * **effects** removes document from the set of documents and from library's documents set
   */
  async removeDocument(
    { library, document }: { library: LibraryID; document: DocumentID },
  ): Promise<Empty | { error: string }> {
    const existingLibrary = await this.libraries.findOne({ _id: library });
    if (!existingLibrary) {
      return { error: `Library ${library} does not exist.` };
    }

    if (!existingLibrary.documents.includes(document)) {
      return { error: `Document ${document} is not in library ${library}.` };
    }

    await this.libraries.updateOne(
      { _id: library },
      { $pull: { documents: document } },
    );

    await this.documents.deleteOne({ _id: document });

    return {};
  }

  /**
   * createDocument (name: String, epubContent: BinaryData, library: LibraryID): (document: DocumentID)
   *
   * **requires** library exists and a document with `name` does not already exist in the given `library`
   *
   * **effects** creates a new Document with `name` and `epubContent` and adds it to the `library`; returns the new document's ID
   */
  async createDocument(
    { name, epubContent, library }: {
      name: string;
      epubContent: string;
      library: LibraryID;
    },
  ): Promise<{ document?: DocumentID; error?: string }> {
    console.log(
      `[LibraryConcept.createDocument] Attempting to create document '${name}' in library ${library}`,
    );
    try {
      const existingLibrary = await this.libraries.findOne({ _id: library });
      if (!existingLibrary) {
        console.error(
          `[LibraryConcept.createDocument] Error: Library ${library} does not exist.`,
        );
        return { error: `Library ${library} does not exist.` };
      }

      const nameExistsInLibrary = await this.documents.findOne({
        _id: { $in: existingLibrary.documents },
        name: name,
      });

      if (nameExistsInLibrary) {
        console.error(
          `[LibraryConcept.createDocument] Error: Document with name '${name}' already exists in library ${library}.`,
        );
        return {
          error:
            `Document with name '${name}' already exists in library ${library}.`,
        };
      }

      const newDocumentId = freshID() as DocumentID;
      const newDocument: DocumentDoc = {
        _id: newDocumentId,
        name,
        epubContent,
      };

      console.log(
        `[LibraryConcept.createDocument] Inserting new document record: ${newDocumentId}`,
      );
      await this.documents.insertOne(newDocument);
      console.log(
        `[LibraryConcept.createDocument] Document record inserted. Updating library ${library}.`,
      );

      await this.libraries.updateOne(
        { _id: library },
        { $push: { documents: newDocumentId } },
      );
      console.log(
        `[LibraryConcept.createDocument] Library ${library} updated with new document.`,
      );

      return { document: newDocumentId };
    } catch (e) {
      console.error(
        `[LibraryConcept.createDocument] Unexpected error creating document '${name}' for library ${library}:`,
        e,
      );
      return {
        error: `Failed to create document: ${
          e instanceof Error ? e.message : "unknown error"
        }`,
      };
    }
  }

  /**
   * renameDocument (user: User, newName: String, document: DocumentID): (document: DocumentID)
   *
   * **requires** document exists and is associated with a library owned by `user`,
   *              and `newName` is not the name of an existing document within that user's library (excluding the document being renamed)
   *
   * **effects** changes document's name to `newName`; returns the document's ID
   */
  async renameDocument(
    { user, newName, document }: {
      user: User;
      newName: string;
      document: DocumentID;
    },
  ): Promise<{ document?: DocumentID; error?: string }> {
    const existingDocument = await this.documents.findOne({ _id: document });
    if (!existingDocument) {
      return { error: `Document ${document} does not exist.` };
    }

    const userLibrary = await this.libraries.findOne({ user });
    if (!userLibrary) {
      return { error: `User ${user} does not have a library.` };
    }

    if (!userLibrary.documents.includes(document)) {
      return {
        error: `Document ${document} is not in user ${user}'s library.`,
      };
    }

    const nameExistsInLibrary = await this.documents.findOne({
      _id: { $in: userLibrary.documents, $ne: document }, // documents in library, but not the current document
      name: newName,
    });

    if (nameExistsInLibrary) {
      return {
        error:
          `Document with name '${newName}' already exists in user ${user}'s library.`,
      };
    }

    await this.documents.updateOne(
      { _id: document },
      { $set: { name: newName } },
    );

    return { document: document };
  }

  /**
   * openDocument (user: User, document: DocumentID): (document: DocumentID)
   *
   * **requires** user is in a library with `document`
   *
   * **effects** confirms the document is accessible to the user; returns the document's ID.
   */
  async openDocument(
    { user, document }: { user: User; document: DocumentID },
  ): Promise<{ document?: DocumentID; error?: string }> {
    const userLibrary = await this.libraries.findOne({ user });
    if (!userLibrary) {
      return { error: `User ${user} does not have a library.` };
    }

    const docExists = await this.documents.findOne({ _id: document });
    if (!docExists || !userLibrary.documents.includes(document)) {
      return {
        error:
          `Document ${document} does not exist or is not in user ${user}'s library.`,
      };
    }

    return { document: document };
  }

  /**
   * closeDocument (user: User, document: DocumentID): (document: DocumentID)
   *
   * **requires** user is in a library with `document`
   *
   * **effects** confirms the document is no longer actively being accessed by the user; returns the document's ID.
   */
  async closeDocument(
    { user, document }: { user: User; document: DocumentID },
  ): Promise<{ document?: DocumentID; error?: string }> {
    const userLibrary = await this.libraries.findOne({ user });
    if (!userLibrary) {
      return { error: `User ${user} does not have a library.` };
    }

    const docExists = await this.documents.findOne({ _id: document });
    if (!docExists || !userLibrary.documents.includes(document)) {
      return {
        error:
          `Document ${document} does not exist or is not in user ${user}'s library.`,
      };
    }

    return { document: document };
  }

  // --- Queries (not explicitly in concept spec, but useful for interaction and testing) ---

  /**
   * _getLibraryByUser (user: User): (library: LibraryDoc)
   *
   * **requires** user exists and has a library
   *
   * **effects** returns the library document associated with the user
   */
  async _getLibraryByUser(
    { user }: { user: User },
  ): Promise<{ library?: LibraryDoc; error?: string }[]> {
    console.log("starting _getLibraryByUser for user:", user);
    const library = await this.libraries.findOne({ user });

    if (!library) {
      console.log("error in _getLibraryByUser for user:", user);
      return [{ error: `No library found for user ${user}.` }];
    }
    console.log("success in _getLibraryByUser for user:", user);
    return [{ library: library }];
  }

  /**
   * _getDocumentsInLibrary (library: LibraryID): (document: DocumentDoc)
   *
   * **requires** library exists
   *
   * **effects** returns all documents (including their name and epub content) that are part of the given library
   */
  async _getDocumentsInLibrary(
    { library }: { library: LibraryID },
  ): Promise<{ document?: DocumentDoc; error?: string }[]> {
    const existingLibrary = await this.libraries.findOne({ _id: library });
    if (!existingLibrary) {
      return [{ error: `Library ${library} does not exist.` }];
    }

    const documents = await this.documents.find({
      _id: { $in: existingLibrary.documents },
    }).toArray();
    return documents.map((doc) => ({ document: doc }));
  }

  /**
   * _getDocumentDetails (document: DocumentID): (document: DocumentDoc)
   *
   * **requires** document exists
   *
   * **effects** returns the details (name, epubContent) of the specified document
   */
  async _getDocumentDetails(
    { document }: { document: DocumentID },
  ): Promise<{ document?: DocumentDoc; error?: string }[]> {
    const doc = await this.documents.findOne({ _id: document });
    if (!doc) {
      return [{ error: `Document ${document} does not exist.` }];
    }
    return [{ document: doc }];
  }
}

```
