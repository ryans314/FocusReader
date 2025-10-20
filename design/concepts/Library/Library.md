# concept: Library

**concept** Library \[User, TextSettings, FocusStats\]

**purpose**  collect and store documents that users upload

**principle** An existing user can upload and associate documents with their account, to be accessed later 

**state**  
a set of Libraries with:  
- a user User
- a set of documents  

a set of Documents with:  
- a name String  
- a file File  
- a settings TextSettings  
- a stats FocusStats
- a set of Annotations

**actions**  
createLibrary(user: User): (library: Library)  
- **requires** user is not already associated with a library  
- **effects** creates a new library with user and an empty set of documents

addDocument(library: Library, document: Document)  
- **requires** library and document both exist, and document is not already in Library  
- **effects** adds document to library's set of documents

removeDocument(library: Library, document: Document)    
- **requires** library exists and document is in library  
- **effects** removes document from the set of documents and from library  

createDocument(name: String, file: File, library: Library): (document: Document)  
- **requires** a document with name and file does not already exist in the given library  
- **effects** creates a new Document with name, file, default TextSettings, and default FocusStats, and empty set of Annotations 

openDocument(user: User, document: Document): (document: Document)  
- **requires** user is in a library with document  

closeDocument(user: User, document: Document): (document: Document)  
- **requires** user is in a library with document

**notes** assume that File is a natively existing data type in python. Assume that "default" TextSettings and FocusStats will be created by implementing system.