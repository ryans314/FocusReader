---
timestamp: 'Mon Oct 20 2025 21:15:34 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_211534.b74d9e46.md]]'
content_id: 627272d8ac6d6ff8f0d4520e95f5496bda5c88ed1aed118edc1d716f52e6f9ec
---

# response:

```
concept Library [User]

purpose
allow users to add, remove, view, and access their uploaded documents

principle
A user can upload documents (.epub) to their library, view all of their uploaded documents, and remove or open and read any of the documents in their library.

state
a set of Libraries with
  a user User
  a documents set of Documents

a set of Documents with
  a name String
  an epubContent BinaryData

invariants
  There will be no two libraries with the same user
  all documents have unique names within a library
  Each document is in and belongs to exactly 1 library

actions
createLibrary (user: User): (library: Library)
  **requires** user is not already associated with a library
  **effects** creates a new library with user and an empty set of documents
  
removeDocument (library: Library, document: Document)
  **requires** library exists and document is in library
  **effects** removes document from the set of Documents and from library's documents set

createDocument (name: String, epubContent: BinaryData, library: Library): (document: Document)
  **requires** a document with name does not already exist in the given library
  **effects** creates a new Document with name and epubContent and adds it to library

renameDocument (user: User, newName: String, document: Document): (document: Document)
  **requires** document exists, document is in the library associated with `user`, and newName is not the name of an existing document in that library
  **effects** changes document's name to newName

openDocument (user: User, document: Document): (document: Document)
  **requires** document exists and is in a library associated with `user`
  **effects** no state change; indicates the document is being accessed

closeDocument (user: User, document: Document): (document: Document)
  **requires** document exists and is in a library associated with `user`
  **effects** no state change; indicates the document is no longer being accessed

notes
  This concept allows a user to have multiple uploads/documents of the same underlying epubContent/BinaryData, so long as they are given different names.
  epubContent is represented as a BinaryData rather than its own complex since .epub files will be interacted with via a library that treats them as their own data type
```
