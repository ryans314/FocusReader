---
timestamp: 'Mon Nov 10 2025 08:40:35 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_084035.f9994f17.md]]'
content_id: a3dcb429024e9fce2ae657116c4de41afb9931e8caac3376a4498f2e86d8f3df
---

# Prompt: I am getting a number of errors. I will list some below:

1. On `export const CreateDocumentRequest: ...` CreateDocumentRequest is underlined with  the following error:

```

Type '({ request, name, epubContent, session, user, library: requestedLibrary, document, library: actualUserLibrary }: { request: ID; name: string; epubContent: string; session: ID; user: ID; requestedLibrary: ID; document: ID; actualUserLibrary: ID; }) => { when: ActionPattern[]; where: (frames: Frames<...>) => Promise<....' is not assignable to type 'SyncFunction'.  
Types of parameters '__0' and 'vars' are incompatible.  
Type 'Vars' is missing the following properties from type '{ request: ID; name: string; epubContent: string; session: ID; user: ID; requestedLibrary: ID; document: ID; actualUserLibrary: ID; }': request, name, epubContent, session, and 4 more

```

2. On `request, name, epubContent, session, user, library: requestedLibrary, document, library: actualUserLibrary`, both `library` are underlined with the following error:

```
Property 'library' does not exist on type '{ request: ID; name: string; epubContent: string; session: ID; user: ID; requestedLibrary: ID; document: ID; actualUserLibrary: ID; }'
```

3. On `frames = await frames.query(Sessioning._getUser, { session }, { user });`, query is underlined with the following error:

```
No overload matches this call.  
Overload 1 of 2, '(f: (...args: never[]) => unknown[], input: { session: ID; }, output: Record<string, symbol>): Frames<Frame>', gave the following error.  
Argument of type '({ session }: { session: ID; }) => Promise<{ user: ID; }[] | [{ error: string; }]>' is not assignable to parameter of type '(...args: never[]) => unknown[]'.  
Type 'Promise<{ user: ID; }[] | [{ error: string; }]>' is missing the following properties from type 'unknown[]': length, pop, push, concat, and 35 more.  
Overload 2 of 2, '(f: ({ session }: { session: ID; }) => Promise<{ user: ID; }[] | [{ error: string; }]>, input: { session: ID; }, output: Record<string, symbol>): Promise<Frames<Frame>>', gave the following error.  
Type 'ID' is not assignable to type 'symbol'.
```
