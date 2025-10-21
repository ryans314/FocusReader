---
timestamp: 'Mon Oct 20 2025 19:25:43 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_192543.8de3b9d2.md]]'
content_id: 3d14199994c835493a4cd5d66e96aba175e22a623acbee41782dc24ad2db2277
---

# response:

```
concept FocusStats [User, Document]

purpose
track and aggregate users' reading statistics

principle
if a user begins reading a document, a session is automatically started to track their activity. When they finish reading, the session ends, and its duration is recorded. Users can then view aggregated statistics based on their completed reading sessions.

state
a set of FocusSessions with
  a user User
  a document Document
  a startTime DateTime
  an optional endTime DateTime

a set of FocusStats with
  a user User
  a sessions set of FocusSession

actions
initUser (user: User): (focusStats: FocusStats)
  **requires** not (exists fs in FocusStats where fs.user = user)
  **effects** create new FocusStats fs' with fs'.user = user and fs'.sessions = {}. Add fs' to the set of FocusStats. returns fs'

startSession (user: User, document: Document): (focusSession: FocusSession)
  **requires** exists fs in FocusStats where fs.user = user
  **effects** create new FocusSession s' with s'.user = user, s'.document = document, s'.startTime = current time, s'.endTime = None. Add s' to the set of FocusSessions. returns s'

endSession (focusSession: FocusSession): (focusSession: FocusSession)
  **requires** exists fs in FocusSessions where fs = focusSession and fs.endTime = None
  **effects** set focusSession.endTime to current time. Find Fs_obj in FocusStats where Fs_obj.user = focusSession.user. Add focusSession to Fs_obj.sessions. returns focusSession

removeSession (focusSession: FocusSession)
  **requires** exists fs in FocusSessions where fs = focusSession
  **effects** find Fs_obj in FocusStats where Fs_obj.user = focusSession.user. Remove focusSession from Fs_obj.sessions. Remove focusSession from the set of FocusSessions

viewStats (user: User): (focusStats: FocusStats)
  **requires** exists fs in FocusStats where fs.user = user
  **effects** returns the FocusStats fs such that fs.user = user
```
