---
timestamp: 'Mon Oct 20 2025 19:17:38 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_191738.23e174f7.md]]'
content_id: 25b03ff0525c222730df5e1452d48d70532ccf487cfe42c0ebc073ddb12a5b26
---

# response:

```concept_spec
concept Annotations [User, Document, Location]

purpose
allow users to create annotations within documents and search amongst their annotations

principle
When users read a document, they can create and view highlighting or text annotations in the document. Users can label annotations with tags. Users can also search for annotations in a document with specific keywords or about certain ideas.

state
a set of Annotations with
  a creator User
  a document Document
  an optional color String
  an optional content String
  a location Location
  a tags set of Tags

a set of Tags with
  a creator User
  a title String

a set of Documents with
  an annotations set of Annotations
  a creator User

actions
createTag (creator: User, title: String): (tag: Tag)
  requires a Tag with creator and title does not already exist
  effects adds a fresh Tag with creator and title to the set of Tags, and returns it

createAnnotation (creator: User, document: Document, color: String, content: String, location: Location, tags: set of Tag): (annotation: Annotation)
  requires
    document exists
    document has creator = creator
    location is well-defined
    color is a valid HTML color or omitted
    at least one of color and content is not omitted
    all tags in 'tags' exist in the set of Tags
  effects
    adds a fresh Annotation with creator, document, color, content, location, and tags to the set of Annotations
    adds the fresh annotation to the 'annotations' set of the document
    returns the fresh annotation

deleteAnnotation (user: User, annotation: Annotation)
  requires
    annotation exists
    annotation has creator = user
  effects
    removes annotation from the set of Annotations
    removes annotation from the 'annotations' set of its document

updateAnnotation (user: User, annotation: Annotation, newColor: String, newContent: String, newLocation: Location, newTags: set of Tag): (annotation: Annotation)
  requires
    annotation exists
    annotation has creator = user
    newColor (if provided) is a valid HTML color
    at least one of newColor, newContent, newLocation, newTags is provided (not omitted)
    all tags in 'newTags' (if provided) exist in the set of Tags
  effects
    modifies annotation to have color = newColor (if provided)
    modifies annotation to have content = newContent (if provided)
    modifies annotation to have location = newLocation (if provided)
    modifies annotation to have tags = newTags (if provided)
    returns the modified annotation

search (user: User, document: Document, criteria: String): (annotations: List[Annotation])
  requires document exists
  effects returns a list of Annotations from the document whose creator is 'user' and whose content or tags match 'criteria'

searchLLM (user: User, document: Document, description: String, llm: GeminiLLM): (annotations: List[Annotation])
  requires
    document exists
    llm exists
  effects uses llm to identify and return a list of Annotations from the document whose creator is 'user' that fit the given 'description'

notes
Location is a generic representation of a location within a document, Document is a generic representation of a document, and color is a generic representation of a color.
I'm not sure exactly how it would work, but depending on the generic Document passed in, there would be an implied location representation associated with it. For example, .epub files (using a library) can represent text location as an index, whereas pdfs treat the entire document as an image (x-y plane for location).
```

***

**Regarding your second question:**

Yes, this notation is extensively represented elsewhere in the context you've been given:

1. **"Structure of a concept specification" section:** This section explicitly defines and explains each part of the notation, including concept name and type parameters, purpose, principle, state (with a detailed description of Simple State Form - SSF), and actions (with pre/post conditions). It provides small examples for each.
2. **"Simple State Form" section:** This section provides a dedicated grammar and numerous examples for the `state` declaration part of the concept specification.
3. **`dayplanner.spec` example:** The entire `dayplanner.spec` provided in the prompt is a complete example written in this exact concept specification notation.
