# concept: Annotation

[@concept-design-overview](/design/background/concept-design-overview.md) 

[@concept-specifications](/design/background/concept-specifications.md)

[@concept-state](/design/background/detailed/concept-state.md)

[@concept-rubric](/design/background/detailed/concept-rubric.md)

[@specification-notation](/design/background/examples/specification-notation.md)

**concept** Annotation \[User, Document\]

**purpose** allow users to create annotations within documents and search amongst their annotations

**principle** When users read a document, they can create and view highlighting or text annotations in the document. Users can label annotations with tags. Users can also search for annotations in a document with specific keywords or about certain ideas.  

**state**  
a set of Annotations with:  
- a creator User
- a document Document  
- an optional color String  
- an optional content String  
- a location String  
- a tags set of Tags

a set of Tags with:  
- a creator User
- a title String

a set of Documents with:
- an annotations set of Annotations
- a creator User

**actions**  

createTag(creator: User, title: String): (tag: Tag)  
- **requires** a tag with user and title does not already exist  
- **effects** creates a tag with title

createAnnotation(creator: User, document: Document, color: String, content: String, location: String, tags: List\[Tag\]): (annotation: Annotation)  
- **requires** 
	- document exists, and has creator=creator
	- location exists and is a well-defined CFI
	- color is either a valid HTML color, or omitted. At least one of color and content must not be omitted
- **effects** 
	- creates and adds annotation with creator, document, color, content, location, and tags to the set of Annotations.
	- Adds annotation to the document's set of annotations

deleteAnnotation(user: User, annotation: Annotation)  
- **requires** annotation exists and has creator=user
- **effects** removes annotation from all sets of Annotations

updateAnnotation(user: User, annotation: Annotation, newColor: String, newContent: String, newLocation: String, newTags: List\[Tag\]): (annotation: Annotation)  
- **requires** annotation has creator=user, newColor (if provided) is a valid HTML color. Any of newColor, newContent, newLocation, and newTags may be omitted.
- **effects** modifies annotation to have color=newColor, content=newContent, location=newLocation, tags=newTags (for each attribute that is not omitted)

search(user: User, document: Document, criteria: String): (annotations: List\[Annotations\\])  
- **requires** document exists  
- **effects** returns a list of annotations with creator=user in the document that have content or tags matching criteria


**notes:** 
- Locations should be CFI strings (Canonical Fragment Identifiers, compatible with many epub libraries)