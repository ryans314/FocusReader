# Library Changes and Issues

### Issues
1. Initially, Library used File as a presumed-to-exist data type, which I could not do.
2. Library's true functionality is just storing a list of documents, which is a glorified list with add and remove features. 
3. Documents and EpubFiles may need to be a separate concept

### Changes
1. Changed file File into epubContent BinaryData
	1. BinaryData is an actual primitive type representing file contents, whereas "File" was not a real thing, and not a valid concept state type. 
2. Changed Library generally to only allow .epub files
	1.  Changing fonts/styles for PDFs is very difficult, easier to focus on .epub which has built-in support for those things
3. Changed Document to not have FocusStats anymore, since that can be better represented in the FocusStats concept. Same for annotations
4. Properly implemented generic types this time instead of directly referring to other implemented concepts. 
5. Added a renameDocument action, since users may often want to rename their documents after creation without deleting/recreating them. 