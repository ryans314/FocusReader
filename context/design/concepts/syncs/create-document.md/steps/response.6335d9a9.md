---
timestamp: 'Mon Nov 10 2025 10:41:19 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_104119.4fb622e4.md]]'
content_id: 6335d9a9cf8922e1a0a942e6d5480630f1ef6bdb478041356e76397ae4411cc6
---

# response:

You're absolutely right to ask! It's important to understand why a change might cascade.

The reason you likely need to update `user_management.sync.ts` (and any other syncs that previously interacted with `Sessioning` to retrieve a user) is because of the change we just made in `src/concepts/Sessioning/SessioningConcept.ts`.

**The `Sessioning._getUser` method was renamed to `Sessioning.getUser`.**

While I don't have the content of your `user_management.sync.ts` file, it's highly probable that it contains synchronizations that need to get the user associated with a session (e.g., for authorization checks). If it previously used:

```typescript
// Old call in a sync
frames = await frames.query(Sessioning._getUser, { session }, { user });
```

It will now cause an error because `_getUser` no longer exists in `SessioningConcept`. It needs to be updated to:

```typescript
// New call in a sync
frames = await frames.query(Sessioning.getUser, { session }, { user });
```

If you don't make this change, you would encounter an error similar to:

* `Property '_getUser' does not exist on type 'typeof Sessioning'.`
* Or, if `_getUser` somehow still exists as a stale reference but isn't properly instrumented by the engine, you might get the same `Action bound _getUser is not instrumented` error you just saw, but pointing to `user_management.sync.ts`.

So, you need to open `src/syncs/user_management.sync.ts` and search for all occurrences of `Sessioning._getUser` and change them to `Sessioning.getUser`.
