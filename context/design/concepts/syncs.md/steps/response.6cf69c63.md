---
timestamp: 'Mon Nov 10 2025 07:30:07 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_073007.6f054b82.md]]'
content_id: 6cf69c6303d9a66a291e672cc48d1a74573d0c187a57ebbad24d1e88f3aafcc3
---

# response:

Yes, after re-reading that section, it absolutely makes more sense why you might choose to **keep the request path the same as the initiating concept action** (e.g., `/api/Profile/createAccount`) when orchestrating it with synchronizations.

Here's why, drawing directly from the provided documentation:

1. **Leveraging Default Routing and Minimizing Explicit Route Definition:**
   The documentation states: "This allowed you to avoid having to define routes explicitly, since they were defined by the concepts and their actions." and "By default, requests are passed through (or “included”), so if you use the action server out of the box it will behave exactly like the old action server."
   * **Good Implication:** By sticking to `/api/ConceptName/actionName`, you're leveraging the *built-in convention* of the `Requesting` concept. You don't have to invent an entirely new, arbitrary path like `/users/create`. The system *already understands* what `/api/Profile/createAccount` is intended to refer to.

2. **Explicitly Intercepting and Augmenting a Specific Concept Action:**
   The documentation explains: "Alternatively you can list an action as 'excluded,' and it will then be turned into a request action... You can then write a sync on this action." And a reason to exclude: "One is that the action should only be permitted under certain conditions (such as when the user has been authenticated); you would implement this with a sync saying that *when* the request occurs and *where* some condition holds, *then* the action itself occurs."
   * **Good Implication:** Your scenario (creating a user and *then* initializing related concepts like Library, FocusStats, TextSettings) is an extension of "permitted under certain conditions." You're essentially saying: "When a request for `Profile.createAccount` comes in, I want to intercept it, *add more steps to its fulfillment*, and then ensure it *actually creates the profile* (among other things)." By excluding `/api/Profile/createAccount` and writing syncs for its `Requesting.request` counterpart, you're taking explicit control over *that specific fundamental action's execution flow*, rather than creating a completely new, top-level "orchestration" endpoint.

3. **Minimizing Client-Side Changes for Backend Enhancements:**
   If your front-end was *already* calling `/api/Profile/createAccount` directly, then by excluding it and writing synchronizations, you achieve a powerful backend change (orchestration) without requiring any change to the client-side URL. The client continues to call the same endpoint, but the backend's behavior behind that endpoint completely transforms.
   * **Good Implication:** This is a strong benefit for backward compatibility and incremental development. You can significantly alter how an operation is handled on the backend (e.g., adding authentication, logging, or multi-concept orchestration) without forcing a client update.

**In essence, the framework provides `passthrough.ts` and the `Requesting` concept precisely so you can choose between:**

* **Direct Passthrough (Included):** Let `Concept.action` run directly.
* **Intercept and Orchestrate (Excluded):** Intercept the `Requesting.request` for `Concept.action` and define its new behavior (which might include calling `Concept.action` later, along with other actions and queries).

So, while my previous advice leaned towards semantic clarity for API paths (e.g., `/users/create` for a composite operation), your choice to reuse `/api/Profile/createAccount` is a perfectly valid and supported pattern within this Concept Design framework, especially if you prioritize:

* Leveraging the inherent routing convention.
* Explicitly enhancing the behavior of an existing concept action.
* Minimizing client-side API path changes.

Therefore, updating your syncs to use `path: "/Profile/createAccount"` is a completely reasonable and well-supported approach.
