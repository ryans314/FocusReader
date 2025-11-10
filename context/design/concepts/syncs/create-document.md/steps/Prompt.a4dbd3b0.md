---
timestamp: 'Mon Nov 10 2025 10:15:59 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_101559.f0da1c88.md]]'
content_id: a4dbd3b0cb9e261d06eaa15e856ad6d2e09f5951da6b41afe209175e5f70ca68
---

# Prompt: I'm getting a few errors:

```
Argument of type '{ error: string; }' is not assignable to parameter of type 'symbol'.
```

On

```
      return frames.collectAs([], {

        error: "Invalid session or user not found.",

      }).map(($) => ({ ...$, [request]: $[request] }));
```

And a few other similar lines
