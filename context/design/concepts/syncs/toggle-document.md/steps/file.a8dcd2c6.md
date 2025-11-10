---
timestamp: 'Mon Nov 10 2025 15:46:27 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_154627.a474098b.md]]'
content_id: a8dcd2c602ea4eaf19bf872e35e08af40a7c60c544967e73dd6d3a89338f1a87
---

# file: src/concepts/Annotation/AnnotationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

const PREFIX = "Annotation" + "."; // Collection prefix for MongoDB

// Generic types defined by the concept's parameters
type User = ID;
type Document = ID;

// Internal types managed by this concept
type AnnotationID = ID;
type TagID = ID;

/**
 * Interface for the 'Annotations' collection.
 * Corresponds to "a set of Annotations with..." in the concept state.
 */
interface AnnotationDoc {
  _id: AnnotationID;
  creator: User; // Reference to external User ID
  document: Document; // Reference to external Document ID
  color?: string; // Optional HTML color string
  content?: string; // Optional textual content of the annotation
  location: string; // Canonical Fragment Identifier (CFI) string
  tags: TagID[]; // Array of Tag IDs, representing the set of tags
}

/**
 * Interface for the 'Tags' collection.
 * Corresponds to "a set of Tags with..." in the concept state.
 */
interface TagDoc {
  _id: TagID;
  creator: User; // Reference to external User ID (creator of this specific tag)
  title: string; // The title/name of the tag
}

/**
 * Interface for the 'Documents' collection, representing the Annotation concept's
 * specific view and state relevant to documents. This view includes which annotations
 * belong to a document and which user created the document (from the Annotation concept's
 * perspective, used for authorization).
 */
interface DocumentViewDoc {
  _id: Document; // Reference to external Document ID
  annotations: AnnotationID[]; // Array of Annotation IDs associated with this document
  creator: User; // The creator of this document, as known by this concept
}

export default class AnnotationConcept {
  private annotations: Collection<AnnotationDoc>;
  private tags: Collection<TagDoc>;
  private documentViews: Collection<DocumentViewDoc>;

  constructor(private readonly db: Db) {
    this.annotations = this.db.collection(PREFIX + "annotations");
    this.tags = this.db.collection(PREFIX + "tags");
    this.documentViews = this.db.collection(PREFIX + "documentViews");
  }

  /**
   * createTag(creator: User, title: String): (tag: Tag)
   *
   * **requires** a tag with user and title does not already exist
   *
   * **effects** creates a tag with title
   */
  async createTag(
    { creator, title }: { creator: User; title: string },
  ): Promise<{ tag?: TagID; error?: string }> {
    // Check if a tag with the given creator and title already exists
    const existingTag = await this.tags.findOne({ creator, title });
    if (existingTag) {
      return { error: "A tag with this creator and title already exists." };
    }

    const newTagId = freshID() as TagID;
    const newTagDoc: TagDoc = {
      _id: newTagId,
      creator,
      title,
    };

    await this.tags.insertOne(newTagDoc);
    return { tag: newTagId };
  }

  /**
   * createAnnotation(creator: User, document: Document, color: String, content: String, location: String, tags: List[Tag]): (annotation: Annotation)
   *
   * **requires**
   *   - document exists (in Annotation concept's view), and has creator=creator
   *   - location exists and is a well-defined CFI (no programmatic validation here; assumed by external caller for CFI format)
   *   - color is either a valid HTML color, or omitted. At least one of color and content must not be omitted
   *
   * **effects**
   *   - creates and adds annotation with creator, document, color, content, location, and tags to the set of Annotations.
   *   - Adds annotation to the document's set of annotations
   */
  async createAnnotation(
    {
      creator,
      document,
      color,
      content,
      location,
      tags,
    }: {
      creator: User;
      document: Document;
      color?: string;
      content?: string;
      location: string;
      tags: TagID[]; // List[Tag] maps to an array of TagIDs
    },
  ): Promise<{ annotation?: AnnotationID; error?: string }> {
    // Requirement 1: Check if the document (in Annotation concept's view) exists and is owned by the creator
    const docView = await this.documentViews.findOne({ _id: document });
    if (!docView || docView.creator !== creator) {
      return {
        error:
          "Document does not exist in Annotation concept's view or is not owned by the creator.",
      };
    }

    // Requirement 3: At least one of color and content must not be omitted
    if (color === undefined && content === undefined) {
      return { error: "Either color or content must be provided." };
    }

    // A more robust implementation would validate 'location' as a CFI and 'color' as a valid HTML color.
    // At the concept specification level, these are often assumed or handled by presentation logic.

    const newAnnotationId = freshID() as AnnotationID;
    const newAnnotationDoc: AnnotationDoc = {
      _id: newAnnotationId,
      creator,
      document,
      location,
      tags: tags || [], // Ensure tags is an array, even if empty/null from input
      ...(color !== undefined && { color }), // Conditionally add color if provided
      ...(content !== undefined && { content }), // Conditionally add content if provided
    };

    await this.annotations.insertOne(newAnnotationDoc);

    // Update the document's view to include this new annotation
    // Since docView exists per the precondition, we just update it.
    await this.documentViews.updateOne(
      { _id: document },
      { $addToSet: { annotations: newAnnotationId } }, // $addToSet ensures no duplicate annotation IDs
    );

    return { annotation: newAnnotationId };
  }

  /**
   * deleteAnnotation(user: User, annotation: Annotation)
   *
   * **requires** annotation exists and has creator=user
   *
   * **effects** removes annotation from all sets of Annotations
   */
  async deleteAnnotation(
    { user, annotation }: { user: User; annotation: AnnotationID },
  ): Promise<Empty | { error: string }> {
    const existingAnnotation = await this.annotations.findOne({
      _id: annotation,
    });
    if (!existingAnnotation) {
      return { error: "Annotation not found." };
    }
    if (existingAnnotation.creator !== user) {
      return { error: "User is not the creator of this annotation." };
    }

    await this.annotations.deleteOne({ _id: annotation });

    // Remove annotation from the document's view
    await this.documentViews.updateOne(
      { _id: existingAnnotation.document },
      { $pull: { annotations: annotation } }, // $pull removes the annotation ID from the array
    );

    return {};
  }

  /**
   * updateAnnotation(user: User, annotation: Annotation, newColor: String, newContent: String, newLocation: String, newTags: List[Tag]): (annotation: Annotation)
   *
   * **requires** annotation has creator=user, newColor (if provided) is a valid HTML color. Any of newColor, newContent, newLocation, and newTags may be omitted.
   *
   * **effects** modifies annotation to have color=newColor, content=newContent, location=newLocation, tags=newTags (for each attribute that is not omitted)
   */
  async updateAnnotation(
    {
      user,
      annotation,
      newColor,
      newContent,
      newLocation,
      newTags,
    }: {
      user: User;
      annotation: AnnotationID;
      newColor?: string;
      newContent?: string;
      newLocation?: string;
      newTags?: TagID[]; // List[Tag] maps to an array of TagIDs
    },
  ): Promise<{ annotation?: AnnotationID; error?: string }> {
    const existingAnnotation = await this.annotations.findOne({
      _id: annotation,
    });
    if (!existingAnnotation) {
      return { error: "Annotation not found." };
    }
    if (existingAnnotation.creator !== user) {
      return { error: "User is not the creator of this annotation." };
    }

    const updateDoc: Partial<AnnotationDoc> = {};
    if (newColor !== undefined) {
      // Add validation for HTML color if needed, currently assumes input is valid if present
      updateDoc.color = newColor;
    }
    if (newContent !== undefined) {
      updateDoc.content = newContent;
    }
    if (newLocation !== undefined) {
      updateDoc.location = newLocation;
    }
    if (newTags !== undefined) {
      updateDoc.tags = newTags;
    }

    if (Object.keys(updateDoc).length === 0) {
      return { error: "No fields provided for update." };
    }

    await this.annotations.updateOne(
      { _id: annotation },
      { $set: updateDoc },
    );

    return { annotation };
  }

  /**
   * search(user: User, document: Document, criteria: String): (annotations: List[Annotations\])
   *
   * **requires** document exists (in Annotation concept's view)
   *
   * **effects** returns a list of annotations with creator=user in the document that have content or tags matching criteria
   *
   * Queries MUST return an array of dictionaries.
   */
  async search(
    { user, document, criteria }: {
      user: User;
      document: Document;
      criteria: string;
    },
  ): Promise<{ annotations: AnnotationDoc[] | []; error?: string }> {
    // Requirement 1: Check if the document (in Annotation concept's view) exists
    const docView = await this.documentViews.findOne({ _id: document });
    if (!docView) {
      return {
        annotations: [],
        error: "Document not found in Annotation concept's view.",
      };
    }
    // NEW: Add authorization check: User must be the creator of the document (in this concept's view)
    if (docView.creator !== user) {
      return {
        annotations: [], // Still return empty array as per query return type
        error:
          "User is not the creator of this document in Annotation concept's view, and cannot search it.",
      };
    }

    // Find tags that match the criteria for the given user
    const matchingTags = await this.tags.find({
      creator: user,
      title: { $regex: criteria, $options: "i" }, // Case-insensitive regex search
    }).project({ _id: 1 }).toArray(); // Only retrieve _id for matching
    const matchingTagIds = matchingTags.map((tag) => tag._id);

    // Build the query to find annotations matching either content or tags
    const query = {
      creator: user,
      document: document,
      $or: [
        { content: { $regex: criteria, $options: "i" } }, // Case-insensitive regex search in content
        { tags: { $in: matchingTagIds } }, // Search by matching tag IDs
      ],
    };

    const foundAnnotations = await this.annotations.find(query).toArray();

    return { annotations: foundAnnotations };
  }

  // --- Utility Actions (not part of concept spec, but needed for setup/testing external entities) ---
  // A sync would typically call these to populate external generic types
  async _registerDocument(
    { documentId, creatorId }: { documentId: Document; creatorId: User },
  ): Promise<Empty | { error: string }> {
    console.log(
      `[AnnotationConcept._registerDocument] Attempting to register document ${documentId} for creator ${creatorId}`,
    );
    try {
      const existingDocView = await this.documentViews.findOne({
        _id: documentId,
      });
      if (existingDocView) {
        console.error(
          `[AnnotationConcept._registerDocument] Error: Document ${documentId} already registered in Annotation concept's view.`,
        );
        return {
          error: "Document already registered in Annotation concept's view.",
        };
      }
      console.log(
        `[AnnotationConcept._registerDocument] Inserting new document view for ${documentId}.`,
      );
      await this.documentViews.insertOne({
        _id: documentId,
        annotations: [],
        creator: creatorId,
      });
      console.log(
        `[AnnotationConcept._registerDocument] Document ${documentId} registered successfully.`,
      );
      return {};
    } catch (e) {
      console.error(
        `[AnnotationConcept._registerDocument] Unexpected error registering document ${documentId} for creator ${creatorId}:`,
        e,
      );
      return {
        error: `Failed to register document view: ${
          e instanceof Error ? e.message : "unknown error"
        }`,
      };
    }
  }

  //Temporary solution to allow front-end sync. Should probably be replaced by a separate Library action called authenticateDocument(User, Document)
  // Public alias (temporary): expose a non-underscore action so clients can call
  // POST /api/Annotation/registerDocument without relying on underscore-named methods.
  // This simply delegates to the internal _registerDocument implementation.
  registerDocument(
    { documentId, creatorId }: { documentId: Document; creatorId: User },
  ): Promise<Empty | { error: string }> {
    return this._registerDocument({ documentId, creatorId });
  }

  async _deleteDocumentView(
    { documentId }: { documentId: Document },
  ): Promise<Empty | { error: string }> {
    const docView = await this.documentViews.findOne({ _id: documentId });
    if (!docView) {
      return { error: "Document view not found." };
    }
    // Also delete all annotations associated with this document
    await this.annotations.deleteMany({ document: documentId });
    await this.documentViews.deleteOne({ _id: documentId });
    return {};
  }
}

```
