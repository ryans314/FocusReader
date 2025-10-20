# concept: Library


[@concept-design-overview](/design/background/concept-design-overview.md) 

[@concept-specifications](/design/background/concept-specifications.md)

[@concept-state](/design/background/detailed/concept-state.md)

[@concept-rubric](/design/background/detailed/concept-rubric.md)

[@TextSettings](/design/concepts/TextSettings/TextSettings.md)

**concept** Library \[User\]

**purpose** allow users to add, remove, view, and access their uploaded documents

**principle** A user can upload documents (.epub) to their library, view all of their uploaded documents, and remove or open and read any of the documents in their library. 

**state**  
a set of Libraries with:  
- a user User
- a documents set of Documents

a set of Documents with:  
- a name String  
- an epubContent BinaryData

**actions**  
createLibrary(user: User): (library: Library)  
- **requires** user is not already associated with a library  
- **effects** creates a new library with user and an empty set of documents

removeDocument(library: Library, document: Document)    
- **requires** library exists and document is in library  
- **effects** removes document from the set of documents and from library's documents set  

createDocument(name: String, epubContent: BinaryData, library: Library): (document: Document)  
- **requires** a document with name does not already exist in the given library  
- **effects** creates a new Document with name and file and adds it to library

renameDocument(user: User, newName: String, document: Document): (document: Document)
- **requires** document has user=user and newName is not the name of an existing document with user=user
- **effect** changes document's name to newName

openDocument(user: User, document: Document): (document: Document)  
- **requires** user is in a library with document  

closeDocument(user: User, document: Document): (document: Document)  
- **requires** user is in a library with document


**Notes**
- This concept allows a user to have multiple uploads/documents of the same underlying epubContent/BinaryData, so long as they are given different names. 
- Invariant: There will be no two libraries with the same user
- Invariant: all documents have unique names
- Each document is in and belongs to exactly 1 library
- epubContent is represented as a BinaryData rather than its own complex since .epub files will be interacted with via a library that treats them as their own data type



