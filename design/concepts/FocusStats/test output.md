```
--- Testing initUser (success) ---
initUser(user:Alice): FocusStats ID = 019a10b2-bd3f-7201-9ab9-42760945f9e0
Verified FocusStats for user:Alice: {"id":"019a10b2-bd3f-7201-9ab9-42760945f9e0","user":"user:Alice","focusSessionIds":[]} ✅

--- Testing initUser (duplicate) ---
initUser(user:Alice): Attempted re-initialization returned error: "User user:Alice already has FocusStats initialized." ✅ (Expected error received)

Setup: Initialized FocusStats for user:Bob (ID: 019a10b2-bd9b-7d8b-82f3-7140c4fdf856)

--- Testing startSession (success) ---
startSession(user:Alice, document:Doc1): Session ID = 019a10b2-bdc5-765d-82e1-d07f0c2c755f
Verified session 019a10b2-bdc5-765d-82e1-d07f0c2c755f started for user:Alice. ✅

--- Testing startSession (no FocusStats) ---
startSession(user:NonExistent): Returned error: "User user:NonExistent does not have FocusStats initialized." ✅ (Expected error received)

Setup: Started another session for user:Alice (ID: 019a10b2-be40-7055-9e7c-b553d460bf94) for endSession tests.

--- Testing endSession (success) ---
endSession(019a10b2-be40-7055-9e7c-b553d460bf94): Session ID = 019a10b2-be40-7055-9e7c-b553d460bf94
Verified session 019a10b2-be40-7055-9e7c-b553d460bf94 ended for user:Alice and linked to FocusStats. ✅

--- Testing endSession (non-existent) ---
endSession(019a10b2-bee5-76d6-b75f-faa9bacf6338): Returned error: "FocusSession 019a10b2-bee5-76d6-b75f-faa9bacf6338 not found." ✅ (Expected error received)

--- Testing endSession (already ended) ---
endSession(019a10b2-be40-7055-9e7c-b553d460bf94): Returned error (already ended): "FocusSession 019a10b2-be40-7055-9e7c-b553d460bf94 has already ended." ✅ (Expected error received)

Setup: Started and ended session for user:Bob (ID: 019a10b2-bf29-7a8e-b1ba-78b3f07ea250) for removeSession tests.

--- Testing removeSession (success) ---
removeSession(019a10b2-bf29-7a8e-b1ba-78b3f07ea250): Successfully removed.
Verified session 019a10b2-bf29-7a8e-b1ba-78b3f07ea250 removed from user:Bob's sessions and FocusStats. ✅

--- Testing removeSession (non-existent) ---
removeSession(019a10b2-bffd-7455-8a93-56d47fa20181): Returned error: "FocusSession 019a10b2-bffd-7455-8a93-56d47fa20181 not found." ✅ (Expected error received)

--- Testing _viewStats (success) ---
_viewStats(user:Alice): Retrieved stats: {"id":"019a10b2-bd3f-7201-9ab9-42760945f9e0","user":"user:Alice","focusSessionIds":["019a10b2-be40-7055-9e7c-b553d460bf94"]} ✅

--- Testing _viewStats (no FocusStats) ---
_viewStats(user:Unknown): Returned error: "FocusStats not found for user user:Unknown." ✅ (Expected error received)

--- Testing _getSessions (success) ---
_getSessions(user:Alice): Retrieved sessions: ["019a10b2-bdc5-765d-82e1-d07f0c2c755f","019a10b2-be40-7055-9e7c-b553d460bf94"] ✅

--- Testing _getSessions (no FocusStats) ---
_getSessions(user:Stranger): Returned error: "FocusStats not found for user user:Stranger. Cannot retrieve sessions." ✅ (Expected error received)

--- Principle Trace ---
1. Initialize FocusStats for user:PrincipleUser
   FocusStats created with ID: 019a10b2-c098-7c36-93f7-d6dd6110161f ✅
2. Start a reading session for user:PrincipleUser on document:PrincipleDocA
   Session 1 started with ID: 019a10b2-c0bd-78d1-8d4b-3c2e3cb1cf19 ✅
3. Start another reading session for user:PrincipleUser on document:PrincipleDocB
   Session 2 started with ID: 019a10b2-c0ed-741a-8bae-5e921f38cf86 ✅
4. End the first reading session (019a10b2-c0bd-78d1-8d4b-3c2e3cb1cf19)
   Session 1 ended. ✅
5. View statistics for user:PrincipleUser
   Retrieved stats: {"id":"019a10b2-c098-7c36-93f7-d6dd6110161f","user":"user:PrincipleUser","focusSessionIds":["019a10b2-c0bd-78d1-8d4b-3c2e3cb1cf19"]}
   Stats verified: SessionP1Id included, SessionP2Id not. ✅
6. End the second reading session (019a10b2-c0ed-741a-8bae-5e921f38cf86)
   Session 2 ended. ✅
7. View statistics for user:PrincipleUser again
   Retrieved updated stats: {"id":"019a10b2-c098-7c36-93f7-d6dd6110161f","user":"user:PrincipleUser","focusSessionIds":["019a10b2-c0bd-78d1-8d4b-3c2e3cb1cf19","019a10b2-c0ed-741a-8bae-5e921f38cf86"]}
   Updated stats verified: both sessions included. ✅
8. Get all detailed sessions for user:PrincipleUser
   Detailed sessions: ["019a10b2-c0bd-78d1-8d4b-3c2e3cb1cf19","019a10b2-c0ed-741a-8bae-5e921f38cf86"]
Principle trace successfully demonstrated: sessions tracked and aggregated for viewing. ✅
```