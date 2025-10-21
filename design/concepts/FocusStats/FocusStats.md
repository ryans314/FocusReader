# concept: FocusStats

[@concept-design-overview](/design/background/concept-design-overview.md) 

[@concept-specifications](/design/background/concept-specifications.md)

[@concept-state](/design/background/detailed/concept-state.md)

[@concept-rubric](/design/background/detailed/concept-rubric.md)

[@specification-notation](/design/background/examples/specification-notation.md)

**concept** FocusStats

**purpose** track and aggregate users' reading statistics

**principle** When users read a document, the system automatically tracks the times and lengths of their reading sessions. Users can see statistics on their reading behavior

**state**  
a set of FocusSessions with:  
- a user User  
- a document Document  
- a startTime Datetime  
- an optional endTime Datetime

a set of FocusStats with:  
-  a set of FocusSessions  
-  a user User

**actions**  
initUser(user: User): (focusStats: FocusStats)  
- **requires** user exists and does not have a focusStats  
- **effects** creates a focusStats with an empty set of FocusSessions and user  

startSession(user: User, document: Document, library: Library): (focusSession: FocusSession)  
- **requires** user has document in their library and user has a focusStats
- **effects** creates a new focusSession with user, document, startTime = current time, and None endTime

endSession(focusSession: FocusSession): (focusSession: FocusSession)  
- **requires** focusSession exists and has endTime of None  
- **effects** sets focusSession endTime to current time, adds focusSession to the user's FocusStats, returns focusSession

removeSession(focusSession: FocusSession)  
- **effects** removes focusSession from the set of FocusSessions and from the user's FocusStats' set of FocusSessions

viewStats(user: User): (focusStats: FocusStats)  
- **requires** user is associated with a focusStats object

