---
timestamp: 'Thu Oct 23 2025 05:58:44 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_055844.769da309.md]]'
content_id: ea783e429cb6ae5c7c9e474830bfcc51ce99879cd1c416ab0a896d2b3be2713e
---

# Prompt: only 1 error, an issue with the error return for async search. See below for the exact segment and error:

```
async search(

    { user, document, criteria }: { user: User; document: Document; criteria: string },

  ): Promise<{ annotations: AnnotationDoc[] | []; error?: string }> {

    // Requirement 1: Check if the document (in Annotation concept's view) exists

    const docView = await this.documentViews.findOne({ _id: document });

    if (!docView) {

      return { error: "Document not found in Annotation concept's view." };

    }
```

The return line has the following error:

```
Property 'annotations' is missing in type '{ error: string; }' but required in type '{ annotations: [] | AnnotationDoc[]; error?: string | undefined; }'.deno-ts(2741)
```
