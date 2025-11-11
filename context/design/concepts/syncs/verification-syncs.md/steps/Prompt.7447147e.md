---
timestamp: 'Tue Nov 11 2025 01:00:52 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251111_010052.aa757fb1.md]]'
content_id: 7447147ede749bcd2b808976947415ddd53432b9feec5def5f7aa91c106f5058
---

# Prompt: There seems to be a bug in the RemoveDocumentRequest sync, where the where clause is returning an empty frame (which then causes the then clause to not execute). Below is the code and console output for it:

```typescript
// Library.removeDocument

export const RemoveDocumentRequest: Sync = (

  { request, session, user, document, library, libraryId },

) => ({

  when: actions([

    Requesting.request,

    { path: "/Library/removeDocument", session, document },

    { request },

  ]),

  where: async (frames) => {

    frames = await frames.query(Sessioning.getUser, { session }, { user });

    frames = await frames.query(Library._getLibraryByUser, { user }, {

      library,

    });

  

    const result = frames

      .filter(

        ($) =>

          Array.isArray($[library]) && $[library].length > 0 &&

          ($[library] as any)[0].library,

      )

      .map(($) => {

        const lib = ($[library] as any)[0].library;

        return { ...$, [libraryId]: lib._id };

      });

    console.log("returning from where in RemoveDocumentRequest:", result);

    return result;

  },

  then: actions([

    Library.removeDocument,

    { library: libraryId, document },

  ]),

});
```

```
[Requesting] Received request for path: /Library/removeDocument

Requesting.request {
  session: '019a6ffd-688f-782d-9c1a-bd767b5104c2',
  document: '019a7011-aa7a-731d-9dc1-758c06dc0b13',
  path: '/Library/removeDocument'
} => { request: '019a717c-baef-70b4-8d8f-6ec3377adfd6' }


Sessioning.getUser { session: '019a6ffd-688f-782d-9c1a-bd767b5104c2' } => [ { user: '019a6ffd-6680-716f-bc12-805373273757' } ]        

starting _getLibraryByUser for user: 019a6ffd-6680-716f-bc12-805373273757
success in _getLibraryByUser for user: 019a6ffd-6680-716f-bc12-805373273757
returning from where in RemoveDocumentRequest: Frames(0) []
[Requesting] Error processing request: Request 019a717c-baef-70b4-8d8f-6ec3377adfd6 timed out after 10000ms
```
