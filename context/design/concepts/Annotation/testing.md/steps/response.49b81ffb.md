---
timestamp: 'Thu Oct 23 2025 05:29:36 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_052936.4c7aa325.md]]'
content_id: 49b81ffb023fb76b8384c5cb64efaae5808dcecad97f1fbbc57fea2f65c84be7
---

# response:

```typescript
// src/utils/types.ts
// Assuming these types are provided in the @utils/types.ts file
export type ID = string & { __brand: "ID" };
export type Empty = Record<PropertyKey, never>;

// src/utils/database.ts
// Assuming these utilities are provided in the @utils/database.ts file
import { Db, MongoClient } from "npm:mongodb";
import { ID } from "./types.ts";

// Placeholder for actual DB connection logic.
// In a real scenario, this would read from .env (e.g., MONGODB_URI).
export async function getDb(): Promise<[Db, MongoClient]> {
  const uri = Deno.env.get("MONGODB_URI") || "mongodb://localhost:27017/concept_design_db";
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db();
  console.log("Connected to MongoDB");
  return [db, client];
}

export function freshID(): ID {
  // Simple ID generation for demonstration. In a real system,
  // this might use UUIDs or a more robust ID generation strategy.
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}` as ID;
}

// Basic HTML color validation helper (can be moved to a utility if needed)
function isValidHtmlColor(color: string): boolean {
  // For demonstration, a basic check that it's a non-empty string.
  // A robust implementation would check for hex codes (#RRGGBB, #RGB),
  // named colors, rgb/rgba, hsl/hsla formats, etc.
  return color.trim() !== "";
}

// file: src/Annotation/AnnotationConcept.ts
import { Collection, Db } from "npm:mongodb";
import { Empty, ID } from "@utils/types.ts";
import { freshID } from "@utils/database.ts"; // Import freshID

// Declare collection prefix, use concept name
const PREFIX = "Annotation" + ".";

// Generic types of this concept. These are opaque IDs to this concept.
type User = ID;
type Document = ID;
type Location = ID; // Treated as an opaque ID per concept design principles for type parameters.

// Internal types for the IDs managed by this concept.
type Annotation = ID;
type Tag = ID;

/**
 * Represents an annotation document in MongoDB.
 * Corresponds to "a set of Annotations" in the concept state.
 */
interface AnnotationDoc {
  _id: Annotation;
  creator: User;
  document: Document;
  color?: string; // Optional field
  content?: string; // Optional field
  location: Location;
  tags: Tag[]; // Array of Tag IDs
}

/**
 * Represents a tag document in MongoDB.
 * Corresponds to "a set of Tags" in the concept state.
 */
interface TagDoc {
  _id: Tag;
  creator: User;
  title: string;
}

/**
 * AnnotationConcept
 *
 * **purpose** allow users to create annotations within documents and search amongst their annotations
 */
export default class AnnotationConcept {
  annotations: Collection<AnnotationDoc>;
  tags: Collection<TagDoc>;

  constructor(private readonly db: Db) {
    this.annotations = this.db.collection(PREFIX + "annotations");
    this.tags = this.db.collection(PREFIX + "tags");
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
  ): Promise<{ tag: Tag } | { error: string }> {
    // Requires: a tag with user and title does not already exist
    const existingTag = await this.tags.findOne({ creator, title });
    if (existingTag) {
      return { error: "Tag with this title already exists for this creator." };
    }

    // Effects: creates a tag with title
    const newTagId = freshID();
    const newTagDoc: TagDoc = {
      _id: newTagId,
      creator,
      title,
    };
    await this.tags.insertOne(newTagDoc);

    return { tag: newTagId };
  }

  /**
   * createAnnotation(creator: User, document: Document, color: String, content: String, location: Location, tags: List[Tag]): (annotation: Annotation)
   *
   * **requires**
   *   - At least one of color and content must not be omitted
   *   - color (if provided) is a valid HTML color
   *
   * **effects**
   *   - creates and adds annotation with creator, document, color, content, location, and tags to the set of Annotations.
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
      location: Location;
      tags: Tag[];
    },
  ): Promise<{ annotation: Annotation } | { error: string }> {
    // Requires: At least one of color and content must not be omitted
    if (!color && !content) {
      return { error: "Either color or content must be provided." };
    }

    // Requires: color (if provided) is a valid HTML color
    if (color !== undefined && !isValidHtmlColor(color)) {
      return { error: "Provided color is not a valid HTML color string." };
    }

    // Effects: creates and adds annotation
    const newAnnotationId = freshID();
    const newAnnotationDoc: AnnotationDoc = {
      _id: newAnnotationId,
      creator,
      document,
      location,
      tags: tags || [], // Ensure tags is an array, defaulting to empty if not provided
      ...(color !== undefined && { color }), // Only include if provided
      ...(content !== undefined && { content }), // Only include if provided
    };
    await this.annotations.insertOne(newAnnotationDoc);

    return { annotation: newAnnotationId };
  }

  /**
   * deleteAnnotation(user: User, annotation: Annotation): Empty
   *
   * **requires** annotation exists and has creator=user
   *
   * **effects** removes annotation from all sets of Annotations
   */
  async deleteAnnotation(
    { user, annotation }: { user: User; annotation: Annotation },
  ): Promise<Empty | { error: string }> {
    // Requires: annotation exists and has creator=user
    const existingAnnotation = await this.annotations.findOne({ _id: annotation });
    if (!existingAnnotation) {
      return { error: "Annotation not found." };
    }
    if (existingAnnotation.creator !== user) {
      return { error: "User is not the creator of this annotation." };
    }

    // Effects: removes annotation
    await this.annotations.deleteOne({ _id: annotation });

    return {};
  }

  /**
   * updateAnnotation(user: User, annotation: Annotation, newColor: String, newContent: String, newLocation: Location, newTags: List[Tag]): (annotation: Annotation)
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
      annotation: Annotation;
      newColor?: string;
      newContent?: string;
      newLocation?: Location;
      newTags?: Tag[];
    },
  ): Promise<{ annotation: Annotation } | { error: string }> {
    // Requires: annotation has creator=user
    const existingAnnotation = await this.annotations.findOne({ _id: annotation });
    if (!existingAnnotation) {
      return { error: "Annotation not found." };
    }
    if (existingAnnotation.creator !== user) {
      return { error: "User is not the creator of this annotation." };
    }

    // Prepare update object
    const updateFields: Partial<AnnotationDoc> = {};
    let hasUpdate = false;

    if (newColor !== undefined) {
      // Requires: newColor (if provided) is a valid HTML color
      if (!isValidHtmlColor(newColor)) {
        return { error: "Provided newColor is not a valid HTML color string." };
      }
      updateFields.color = newColor;
      hasUpdate = true;
    }
    if (newContent !== undefined) {
      updateFields.content = newContent;
      hasUpdate = true;
    }
    if (newLocation !== undefined) {
      updateFields.location = newLocation;
      hasUpdate = true;
    }
    if (newTags !== undefined) {
      updateFields.tags = newTags;
      hasUpdate = true;
    }

    // Effects: modifies annotation
    if (hasUpdate) {
      await this.annotations.updateOne(
        { _id: annotation },
        { $set: updateFields },
      );
    }

    // Return the ID of the updated annotation as per spec
    return { annotation };
  }

  /**
   * _search(user: User, document: Document, criteria: String): (annotations: List[Annotations])
   *
   * **requires** none (Document existence is not validated by this concept, allowing for polymorphic use.)
   *
   * **effects** returns a list of annotations with creator=user in the document that have content or tags matching criteria
   */
  async _search(
    { user, document, criteria }: { user: User; document: Document; criteria: string },
  ): Promise<{ annotations: AnnotationDoc[] } | { error: string }> {
    const query: any = {
      creator: user,
      document: document,
    };

    if (criteria && criteria.trim() !== "") {
      const searchCriteria = { $regex: criteria, $options: "i" };
      const orConditions = [];

      // Add condition for content match
      orConditions.push({ content: searchCriteria });

      // Find Tag IDs whose title matches the criteria
      const matchingTags = await this.tags.find({
        title: searchCriteria,
      }).project<{ _id: Tag }>({ _id: 1 }).toArray();
      const matchingTagIds = matchingTags.map(t => t._id);

      // Add condition for tags match, if any matching tags were found
      if (matchingTagIds.length > 0) {
        orConditions.push({ tags: { $in: matchingTagIds } });
      }

      // Apply $or only if there are valid conditions to filter by criteria
      if (orConditions.length > 0) {
        query.$or = orConditions;
      } else {
        // If criteria was non-empty but no content or tags matched, return no results.
        return { annotations: [] };
      }
    }
    // If criteria is empty or whitespace, the query will proceed with only creator and document filters.

    const annotations = await this.annotations.find(query).toArray();

    return { annotations };
  }
}
```
