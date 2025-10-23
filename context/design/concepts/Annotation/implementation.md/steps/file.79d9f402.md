---
timestamp: 'Thu Oct 23 2025 05:11:32 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_051132.ed12c5fe.md]]'
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
