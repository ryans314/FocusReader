---
timestamp: 'Thu Oct 23 2025 02:47:21 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_024721.1842c24f.md]]'
content_id: add8862c294cfcb60b24bc241393b97c660a0e7b238382527e36f506feac3860
---

# response:

You're encountering that error because Deno, while supporting npm packages directly, still needs to know *which* npm packages to manage and often needs to download them into its cache.

The `deno.json` file you provided is a good start for managing aliases, but for npm dependencies, it's best to explicitly list them in an `npm` section within `deno.json`. This tells Deno to treat these as managed npm dependencies, similar to how `package.json` works for Node.js.

Here's how to fix it:

### 1. Update your `deno.json` file

Add an `npm` key to your `deno.json` file. It's also good practice to define the version for `mongodb` here as well, since you're using `npm:mongodb`.

**file: deno.json** (updated)

```json
{
    "imports": {
        "@concepts/": "./src/concepts/",
        "@utils/": "./src/utils/"
    },
    "npm": {
        "bcryptjs": "2.4.3",  // Add bcryptjs here with a specific version
        "mongodb": "6.8.0"   // It's good practice to pin MongoDB version too
    },
    "tasks": {
        "concepts": "deno run --allow-net --allow-read --allow-sys --allow-env src/concept_server.ts --port 8000 --baseUrl /api"
    }
}
```

*(I used `2.4.3` for `bcryptjs` as it's a stable, widely used version, and `6.8.0` for `mongodb` as a recent stable `6.x` version. You can adjust these to specific versions if your project has other requirements, or use `^2.4.3` and `^6.8.0` for semantic versioning if you prefer.)*

### 2. Deno will download and cache the packages

After updating `deno.json`, the next time you run a Deno command that requires these packages (like `deno run` or `deno cache`), Deno will detect the new `npm` dependencies in `deno.json`, download them into its npm cache, and make them available to your project.

You can explicitly force Deno to cache all dependencies by running:

```bash
deno cache --check=all src/concept_server.ts
```

Or, simply running your `concepts` task will trigger the download and caching process automatically:

```bash
deno task concepts
```

Deno will output messages like "Download npm package: bcryptjs@2.4.3" as it fetches them. Once downloaded, the error should go away.
