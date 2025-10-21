---
timestamp: 'Mon Oct 20 2025 19:28:04 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251020_192804.283fcdb5.md]]'
content_id: bd47371b4c8ed3c0f958d200b3b4bab204a3ed22fae32b862628d54549628207
---

# response:

```xml
<concept_spec>
concept FocusStats [User, Document, Library]

purpose
track and aggregate users' reading statistics

principle
When users read a document, the system automatically tracks the times and lengths of their reading sessions. Users can see statistics on their reading behavior

state
a set of FocusSessions with
  a user User
  a document Document
  a startTime DateTime
  an optional endTime DateTime

a set of FocusStats with
  a focusSessions set of FocusSession
  a user User

actions
initUser (user: User): (focusStats: FocusStats)
  requires user exists
  requires no FocusStats exists for user
  effects creates a fresh FocusStats object for user with an empty focusSessions set, and returns it

startSession (user: User, document: Document, library: Library): (focusSession: FocusSession)
  requires user exists
  requires document exists in library
  requires a FocusStats object exists for user
  effects creates a fresh FocusSession with user, document, startTime set to current time, and no endTime; returns it

endSession (focusSession: FocusSession): (focusSession: FocusSession)
  requires focusSession exists
  requires focusSession endTime is not set
  effects sets focusSession's endTime to current time
  effects adds focusSession to the focusSessions set of the associated user's FocusStats object
  effects returns updated focusSession

removeSession (focusSession: FocusSession)
  requires focusSession exists
  effects removes focusSession from the global set of FocusSessions
  effects removes focusSession from the focusSessions set of the associated user's FocusStats object

viewStats (user: User): (focusStats: FocusStats)
  requires user exists
  requires a FocusStats object exists for user
  effects returns the FocusStats object associated with the user

</concept_spec>
```
