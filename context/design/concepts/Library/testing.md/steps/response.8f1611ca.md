---
timestamp: 'Thu Oct 23 2025 02:01:54 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_020154.3d22c995.md]]'
content_id: 8f1611ca959dd17027a2a8a2191307e49dd606949e320ae5e43550acdd3a1444
---

# response:

**concept** Library \[User]

**purpose** allow users to add, remove, view, and access their uploaded documents

**principle** A user can upload documents (.epub) to their library, view all of their uploaded documents, and remove or open and read any of the documents in their library.

**state**\
a set of Libraries with:

* a user User
* a documents set of Documents

a set of Documents with:

* a name String
* an epubContent BinaryData

**actions**\
createLibrary(user: User): (library: Library)

* **requires** user is not already associated with a library
* **effects** creates a new library with user and an empty set of documents

removeDocument(library: Library, document: Document)

* **requires** library exists and document is in library
* **effects** removes document from the set of documents and from library's documents set

createDocument(name: String, epubContent: BinaryData, library: Library): (document: Document)

* **requires** a document with name does not already exist in the given library
* **effects** creates a new Document with name and file and adds it to library

renameDocument(user: User, newName: String, document: Document): (document: Document)

* **requires** document has user=user and newName is not the name of an existing document with user=user
* **effect** changes document's name to newName

openDocument(user: User, document: Document): (document: Document)

* **requires** user is in a library with document

closeDocument(user: User, document: Document): (document: Document)

* **requires** user is in a library with document

**Notes**

* This concept allows a user to have multiple uploads/documents of the same underlying epubContent/BinaryData, so long as they are given different names.
* Invariant: There will be no two libraries with the same user
* Invariant: all documents have unique names within a user's library (implied by createDocument and renameDocument preconditions)
* Each document is in and belongs to exactly 1 library
* epubContent is represented as a BinaryData rather than its own complex since .epub files will be interacted with via a library that treats them as their own data type

***
