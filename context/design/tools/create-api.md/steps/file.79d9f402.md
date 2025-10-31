---
timestamp: 'Fri Oct 24 2025 19:48:33 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251024_194833.5ffe9980.md]]'
content_id: 79d9f402a7835abcb19ecd9f2edb80f51cac0c59b67feca27d018b6339b05f70
---

# file: deno.json

```json
{
  "imports": {
    "@concepts/": "./src/concepts/",
    "@utils/": "./src/utils/"
  },
  "npm": {
    "bcryptjs": "2.4.3",
    "mongodb": "6.8.0"
  },
  "tasks": {
    "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
  }
}

```
