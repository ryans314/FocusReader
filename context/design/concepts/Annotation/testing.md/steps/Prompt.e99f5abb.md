---
timestamp: 'Thu Oct 23 2025 05:40:09 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_054009.2981449e.md]]'
content_id: e99f5abb31be7cf3d9de1fc2efa2c4ca466164df587e0123d6c5535adcc6c673
---

# Prompt: I'm getting a few typescript errors about type checking, for example:    

```
const initialDocAnnotationsCount = (await concept._getDocumentRef({ document: testDocument1 })).document
```

The above code has the following error:

```
Property 'document' does not exist on type '{ document: DocumentDoc; } | { error: string; }'.
```
