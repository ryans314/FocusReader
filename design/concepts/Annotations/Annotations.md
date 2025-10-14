# concept: Annotations

**concept** Annotations \[Document\]

**purpose** allow users to make and search through notes inside documents

**principle** When users read a document, they can make and view highlighting or text annotations in the document. Users can label annotations with tags. Users can also search for annotations in a document with specific keywords or about certain ideas.  

**state**  

a set of Annotations with:  
&emsp;a document Document  
&emsp;a color Color  
&emsp;a content String  
&emsp;a location Location  
&emsp;a set of Tags

a set of Tags with:  
&emsp;a title String

**actions**  

createTag(title: String): (tag: Tag)  
&emsp;**requires** a tag with title does not already exist  
&emsp;**effects** creates a tag with title

createAnnotation(document: Document, color: Color, content: String, location: Location, tags: List\[Tag\]): (annotation: Annotation)  
&emsp;**requires** document exists, and location is a valid location in the document  
&emsp;**effects** creates and adds annotation with document, color, content, location, and tags to the set of Annotations

deleteAnnotation(annotation: Annotation)  
&emsp;**requires** annotation exists  
&emsp;**effects** removes annotation from the set of Annoations
 
search(document: Document, criteria: String): (annotations: List\[Annotations\\])  
&emsp;**requires** document exists  
&emsp;**effects** returns a list of annotations in the document that have content or tags matching criteria

searchLLM(document: Document, description: String, llm: GeminiLLM): (annotations: List\[Annotations\\])  
&emsp;**requires** document and llm exist  
&emsp;**effects** uses llm to identify and return annotations in the document that fit the given description


**notes** Location is some representation of location in a file, not specified in the concept but assumed to exist natively in python/file representations