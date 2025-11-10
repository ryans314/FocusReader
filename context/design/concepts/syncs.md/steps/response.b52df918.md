---
timestamp: 'Mon Nov 10 2025 07:23:38 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_072338.450a79f6.md]]'
content_id: b52df918bfde581475f335dc357a0044b2f712302237cb204475dce0ac14e87d
---

# response:

You've accurately diagnosed the problem! The issue isn't with your synchronization paths being *wrong* in `user_management.sync.ts`, but rather a mismatch between **where your client is sending the request** and **where your synchronizations are listening**.

Let's break down why this is happening and how to fix it:

**Understanding the Console Output:**

```
[Requesting] Received request for path: /Profile/createAccount
```

This line is key. It tells you that your client-side code is still making a `POST` request to the endpoint `/api/Profile/createAccount`.

**Why Your Syncs Aren't Firing:**

In your `user_management.sync.ts`, all your `createUser` synchronizations (like `CreateUserRequest`, `HandleProfileCreateSuccessAndContinue`, etc.) have a `when` clause that looks like this:

```typescript
when: actions(
    [
      Requesting.request,
      { path: "/users/create", username, password }, // <-- This is what your syncs are looking for
      { request },
    ],
    // ... rest of the when clause ...
  ),
```

Because the incoming `Requesting.request` action has `path: "/Profile/createAccount"` (from your client), it *does not match* the `path: "/users/create"` your syncs are expecting. Since the `when` condition isn't met, none of your `createUser` synchronizations fire.

**Why the Timeout:**

The `Requesting` concept intercepts the client's request to `/api/Profile/createAccount`. Because `/api/Profile/createAccount` is in your `passthrough.ts` exclusions, `Requesting` *doesn't* execute `Profile.createAccount` directly. Instead, it generates a `Requesting.request` action with `path: "/Profile/createAccount"` and then calls `_awaitResponse` to wait for a `Requesting.respond` action.

Since no synchronization `when` clause matches the `Requesting.request` for `"/Profile/createAccount"`, no `Requesting.respond` action is ever triggered. The `_awaitResponse` query in `RequestingConcept` then waits for the configured `REQUESTING_TIMEOUT` (10000ms by default) and eventually throws a timeout error.

**The Solution:**

You need to update your **front-end client** to send the `POST` request to the correct, orchestrated endpoint: `/api/users/create`.

**Client-Side Work:**

Update the `fetch` (or `axios`, or whatever HTTP client you're using) call in your front-end.

**Old Client-Side Request (Example):**

```typescript
// Likely in your registration form submission handler
async function registerUser(username, password) {
  const response = await fetch("/api/Profile/createAccount", { // <-- THIS IS THE PROBLEM LINE
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  // ... handle response ...
}
```

**New Client-Side Request (Corrected):**

```typescript
// Update this in your front-end code
async function registerUser(username, password) {
  const response = await fetch("/api/users/create", { // <-- Corrected path!
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username,
      password,
      // REMEMBER: font, fontSize, lineHeight are now hardcoded in the sync,
      // so you don't need to send them from the front-end anymore.
    }),
  });

  const result = await response.json();
  if (result.error) {
    throw new Error(result.error);
  }
  console.log("User created successfully:", result);
  return result;
}
```

**No Additional Backend API Changes:**

You **do not** need to make any changes to your backend API routes or `Requesting` concept itself. The framework is designed for exactly this. The `Requesting` concept is already listening to `/api/*` requests, and your synchronizations are correctly set up to catch the `Requesting.request` actions with `path: "/users/create"`.

Once you update your client, the request flow will be:

1. Client `POST` to `/api/users/create`.
2. `RequestingConcept` intercepts, creates `Requesting.request({ path: "/users/create", username, password })`.
3. Your `CreateUserRequest` sync matches `path: "/users/create"` and triggers `Profile.createAccount`.
4. Subsequent syncs handle the flow, and `HandleAllSubsequentCreatesSuccessAndRespond` eventually calls `Requesting.respond`.
5. `RequestingConcept` sends that response back to your client.

Make this change on your front-end, and it should resolve the timeout!
