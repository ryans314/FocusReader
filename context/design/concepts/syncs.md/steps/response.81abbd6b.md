---
timestamp: 'Mon Nov 10 2025 07:43:23 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_074323.875ea1d1.md]]'
content_id: 81abbd6b4e14ffbccf6cebb61d1218cb452cc48ee8b5b64ec930e2a0c488ba06
---

# response:

Okay, I will update the API specifications for the front-end to reflect the changes due to the `user_management` sync and the corresponding `passthrough.ts` exclusions.

The key changes are:

* The `POST /api/Profile/createAccount` endpoint will now represent the **orchestrated user creation flow**, meaning its description and response bodies will be updated to reflect the successful creation of not just the user profile, but also their associated Library, FocusStats, and TextSettings. The request body for text settings will be removed as it's hardcoded in the sync.
* The following endpoints are now **excluded from direct client access** and are only invoked internally by the `createUser` sync chain. Therefore, they will be *removed* from the public API specifications:
  * `POST /api/Library/createLibrary`
  * `POST /api/FocusStats/initUser`
  * `POST /api/TextSettings/createUserSettings`
* Other exclusions mentioned in `passthrough.ts` (e.g., `Profile/deleteAccount`, `Library/createDocument`, etc.) will also lead to their removal from the API specification, as they are no longer directly callable by the client. Only endpoints explicitly "included" in `passthrough.ts` or part of an orchestrated flow (like `/Profile/createAccount` now is) will remain.

Here are the updated API specifications:

***
