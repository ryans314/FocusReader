---
timestamp: 'Mon Nov 10 2025 08:21:52 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_082152.ac072499.md]]'
content_id: 0ae2e18b976e130bf489af93ef09c2f67143ddd5ce35fc5576a74d73063824b6
---

# file: deno.json

```json
{
  "imports": {
    "@concepts/": "./src/concepts/",
    "@concepts": "./src/concepts/concepts.ts",
    "@test-concepts": "./src/concepts/test_concepts.ts",
    "@utils/": "./src/utils/",
    "@engine": "./src/engine/mod.ts",
    "@syncs": "./src/syncs/syncs.ts"
  },
  "tasks": {
    "start": "deno run --allow-net --allow-write --allow-read --allow-sys --allow-env src/main.ts",
    "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api",
    "import": "deno run --allow-read --allow-write --allow-env src/utils/generate_imports.ts",
    "build": "deno run import"
  },
  "lint": {
    "rules": {
      "exclude": ["no-import-prefix", "no-unversioned-import"]
    }
  }
}

```
