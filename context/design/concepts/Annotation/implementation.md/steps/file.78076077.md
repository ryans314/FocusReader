---
timestamp: 'Mon Oct 20 2025 21:35:24 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_213524.bff14397.md]]'
content_id: 780760771b0061a58cd4b039c7ce3411f6fa7bb56e47b2055c3e402c97ff5605
---

# file: src/concepts/AnnotationConcept.ts

```typescript
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts";

// Declare collection prefix for MongoDB, using the concept name
const PREFIX = "Annotation" + ".";

// Generic types for this concept, represented as branded IDs
type User = ID;
type Document = ID;
type Location = ID; // Generic representation of a location within a document
type Tag = ID;
type Annotation = ID;

/**
 * Interface for the 'Tags' collection documents.
 * a set of Tags with:
 *   a creator User
 *   a title String
 */
interface TagsDoc {
  _id: Tag;
  creator: User;
  title: string;
}

/**
 * Interface for the 'Documents' collection documents managed by this concept.
 * a set of Documents with:
 *   an annotations set of Annotations
 *   a creator User
 *
 * This collection stores minimal information about documents relevant to annotations,
 * specifically their ID, creator, and associated annotations, rather than full document content.
 */
interface DocumentsDoc {
  _id: Document;
  creator: User;
  annotations: Annotation[];
}

/**
 * Interface for the 'Annotations' collection documents.
 * a set of Annotations with:
 *   a creator User
 *   a document Document
 *   an optional color String
 *   an optional content String
 *   a location Location
 *   a tags set of Tags
 */
interface AnnotationsDoc {
  _id: Annotation;
  creator: User;
  document: Document;
  color?: string; // Optional
  content?: string; // Optional
  location: Location;
  tags: Tag[]; // Array of Tag IDs
}

/**
 * Mock interface for a Large Language Model (LLM) like Gemini.
 * This is a placeholder; a real implementation would integrate with an actual LLM service.
 */
interface GeminiLLM {
  /**
   * Hypothetical method for an LLM to search for annotations based on a description.
   * In a real scenario, `documentContent` would be fetched from a dedicated Document concept.
   */
  searchAnnotations(
    documentContent: string,
    description: string,
    existingAnnotations: AnnotationsDoc[]
  ): Promise<AnnotationsDoc[]>;
}

/**
 * @concept Annotation
 * @purpose allow users to create annotations within documents and search amongst their annotations
 * @principle When users read a document, they can create and view highlighting or text annotations in the document. Users can label annotations with tags. Users can also search for annotations in a document with specific keywords or about certain ideas.
 */
export default class AnnotationConcept {
  tags: Collection<TagsDoc>;
  documents: Collection<DocumentsDoc>;
  annotations: Collection<AnnotationsDoc>;

  constructor(private readonly db: Db) {
    this.tags = this.db.collection(PREFIX + "tags");
    this.documents = this.db.collection(PREFIX + "documents");
    this.annotations = this.db.collection(PREFIX + "annotations");
  }

  /**
   * createTag(creator: User, title: String): (tag: Tag)
   *
   * @requires a tag with user and title does not already exist
   * @effects creates a tag with title for the creator and returns its ID
   */
  async createTag({
    creator,
    title,
  }: {
    creator: User;
    title: string;
  }): Promise<{ tag: Tag } | { error: string }> {
    // Precondition: check if tag with user and title already exists
    const existingTag = await this.tags.findOne({ creator, title });
    if (existingTag) {
      return { error: `Tag with title '${title}' for creator '${creator}' already exists.` };
    }

    const newTagId = freshID() as Tag;
    const newTag: TagsDoc = {
      _id: newTagId,
      creator,
      title,
    };
    await this.tags.insertOne(newTag);
    return { tag: newTagId };
  }

  /**
   * createAnnotation(creator: User, document: Document, color?: String, content?: String, location: Location, tags: List[Tag]): (annotation: Annotation)
   *
   * @requires
   *   - document exists, and has creator=creator (in this concept's documents collection)
   *   - location exists and is well-defined (non-null/undefined)
   *   - color (if provided) is either a valid HTML color, or omitted. (Assuming valid if provided for simplicity, no actual validation here)
   *   - At least one of color and content must not be omitted
   * @effects
   *   - creates and adds annotation with creator, document, color, content, location, and tags to the set of Annotations.
   *   - Adds annotation to the document's set of annotations
   */
  async createAnnotation({
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
    location: Location;
    tags?: Tag[]; // Make tags optional in input as it can be an empty list
  }): Promise<{ annotation: Annotation } | { error: string }> {
    // Precondition: document exists and has creator=creator in THIS concept's documents collection
    const targetDocument = await this.documents.findOne({ _id: document, creator });
    if (!targetDocument) {
      return { error: `Document '${document}' either does not exist or is not associated with creator '${creator}' in this concept.` };
    }

    // Precondition: location is well-defined (checking for non-null/undefined)
    if (!location) {
      return { error: "Location must be well-defined (non-null/undefined)." };
    }

    // Precondition: At least one of color or content must not be omitted
    if (!color && !content) {
      return { error: "At least one of 'color' or 'content' must be provided for the annotation." };
    }

    // (Skipping detailed HTML color validation for 'color' property for brevity)

    const newAnnotationId = freshID() as Annotation;
    const newAnnotation: AnnotationsDoc = {
      _id: newAnnotationId,
      creator,
      document,
      color,
      content,
      location,
      tags: tags || [], // Ensure tags is an array, even if omitted or undefined in input
    };

    await this.annotations.insertOne(newAnnotation);

    // Effect: Add annotation to the document's set of annotations
    await this.documents.updateOne(
      { _id: document },
      { $addToSet: { annotations: newAnnotationId } }
    );

    return { annotation: newAnnotationId };
  }

  /**
   * deleteAnnotation(user: User, annotation: Annotation)
   *
   * @requires annotation exists and has creator=user
   * @effects removes annotation from the 'annotations' collection and from the document's annotations list
   */
  async deleteAnnotation({
    user,
    annotation,
  }: {
    user: User;
    annotation: Annotation;
  }): Promise<Empty | { error: string }> {
    // Precondition: annotation exists and has creator=user
    const targetAnnotation = await this.annotations.findOne({
      _id: annotation,
      creator: user,
    });
    if (!targetAnnotation) {
      return { error: `Annotation '${annotation}' either does not exist or does not belong to user '${user}'.` };
    }

    // Effect: removes annotation from the annotations collection
    await this.annotations.deleteOne({ _id: annotation });

    // Effect: remove annotation from the document's annotations list
    await this.documents.updateOne(
      { _id: targetAnnotation.document },
      { $pull: { annotations: annotation } }
    );

    return {};
  }

  /**
   * updateAnnotation(user: User, annotation: Annotation, newColor?: String, newContent?: String, newLocation?: Location, newTags?: List[Tag]): (annotation: Annotation)
   *
   * @requires annotation has creator=user, newColor (if provided) is a valid HTML color. Any of newColor, newContent, newLocation, and newTags may be omitted.
   * @effects modifies annotation to have color=newColor, content=newContent, location=newLocation, tags=newTags (for each attribute that is not omitted); returns the updated annotation ID
   */
  async updateAnnotation({
    user,
    annotation,
    newColor,
    newContent,
    newLocation,
    newTags,
  }: {
    user: User;
    annotation: Annotation;
    newColor?: string | null; // Allow null to explicitly remove color
    newContent?: string | null; // Allow null to explicitly remove content
    newLocation?: Location;
    newTags?: Tag[];
  }): Promise<{ annotation: Annotation } | { error: string }> {
    // Precondition: annotation has creator=user
    const targetAnnotation = await this.annotations.findOne({
      _id: annotation,
      creator: user,
    });
    if (!targetAnnotation) {
      return { error: `Annotation '${annotation}' either does not exist or does not belong to user '${user}'.` };
    }

    // (Skipping detailed HTML color validation for 'newColor' for brevity)

    const updateFields: Partial<AnnotationsDoc> = {};
    if (newColor !== undefined) updateFields.color = newColor === null ? undefined : newColor;
    if (newContent !== undefined) updateFields.content = newContent === null ? undefined : newContent;
    if (newLocation !== undefined) updateFields.location = newLocation;
    if (newTags !== undefined) updateFields.tags = newTags;

    if (Object.keys(updateFields).length === 0) {
      return { error: "No fields provided for update." };
    }

    // Precondition check: At least one of color or content must not be omitted *after* update
    const effectiveColor = updateFields.color !== undefined ? updateFields.color : targetAnnotation.color;
    const effectiveContent = updateFields.content !== undefined ? updateFields.content : targetAnnotation.content;
    if (!effectiveColor && !effectiveContent) {
        return { error: "Update would result in both 'color' and 'content' being omitted. At least one must be present." };
    }

    await this.annotations.updateOne({ _id: annotation }, { $set: updateFields });

    return { annotation };
  }

  /**
   * search(user: User, document: Document, criteria: String): (annotations: List[Annotations])
   *
   * @requires document exists (in this concept's documents state)
   * @effects returns a list of annotations with creator=user in the document that have content or tags matching criteria
   */
  async search({
    user,
    document,
    criteria,
  }: {
    user: User;
    document: Document;
    criteria: string;
  }): Promise<{ annotations: AnnotationsDoc[] } | { error: string }> {
    // Precondition: document exists in this concept's documents collection
    const targetDocument = await this.documents.findOne({ _id: document });
    if (!targetDocument) {
      return { error: `Document '${document}' does not exist in this concept.` };
    }

    const searchRegex = new RegExp(criteria, "i"); // Case-insensitive search for content

    // Find tags whose title matches the criteria, for the given user
    const matchingTags = await this.tags.find({ creator: user, title: { $regex: searchRegex } }).project({_id: 1}).toArray();
    const matchingTagIds = matchingTags.map(tag => tag._id);

    // Find annotations that match the creator and document, and either content or tags match criteria
    const results = await this.annotations.find({
        creator: user,
        document: document,
        $or: [
            { content: { $regex: searchRegex } }, // Match criteria in content
            { tags: { $in: matchingTagIds } }    // Match criteria in associated tag titles
        ]
    }).toArray();

    return { annotations: results };
  }

  /**
   * searchLLM(user: User, document: Document, description: String, llm: GeminiLLM): (annotations: List[Annotations])
   *
   * @requires document and llm exist (document in this concept's documents state)
   * @effects uses llm to identify and return annotations with creator=user in the document that fit the given description
   */
  async searchLLM({
    user,
    document,
    description,
    llm,
  }: {
    user: User;
    document: Document;
    description: string;
    llm: GeminiLLM;
  }): Promise<{ annotations: AnnotationsDoc[] } | { error: string }> {
    // Precondition: document exists in this concept's documents collection
    const targetDocument = await this.documents.findOne({ _id: document });
    if (!targetDocument) {
      return { error: `Document '${document}' does not exist in this concept.` };
    }

    // Precondition: llm instance is provided
    if (!llm) {
      return { error: "LLM instance is not provided." };
    }

    // In a real application, the LLM would need access to the actual document content.
    // For this mock implementation, we'll pass an empty string as documentContent
    // and rely on existing annotations as context for the LLM.
    const allUserDocumentAnnotations = await this.annotations.find({ creator: user, document: document }).toArray();

    try {
      const llmIdentifiedAnnotations = await llm.searchAnnotations(
        "", // Placeholder for actual document content (requires a Document concept)
        description,
        allUserDocumentAnnotations
      );
      return { annotations: llmIdentifiedAnnotations };
    } catch (e) {
      console.error("LLM search failed:", e);
      return { error: `LLM search failed: ${e.message}` };
    }
  }

  // --- Internal/Utility Action to manage Document lifecycle within this concept ---
  /**
   * _registerDocument(documentId: Document, creator: User): Empty
   * This utility action is used to register a document and its creator within this Annotation concept's state.
   * It's crucial for `createAnnotation`'s precondition that a document 'exists and has creator=creator'.
   * This action would typically be invoked by a synchronization from an external Document concept
   * when a document is created or associated with a user in the larger application.
   *
   * @requires documentId does not already exist with a different creator.
   * @effects ensures a document entry exists for the given ID and creator in this concept's state.
   */
  async _registerDocument({ documentId, creator }: { documentId: Document; creator: User }): Promise<Empty | { error: string }> {
    const existingDoc = await this.documents.findOne({ _id: documentId });
    if (existingDoc && existingDoc.creator !== creator) {
      return { error: `Document '${documentId}' is already registered with a different creator.` };
    }
    if (!existingDoc) {
      await this.documents.insertOne({ _id: documentId, creator, annotations: [] });
    }
    return {};
  }
}
```
