# concept: FocusStats
**concept** FocusStats

**purpose** track and aggregate users' reading statistics

**principle** When users read a document, the system automatically tracks the times and lengths of their reading sessions. Users can see statistics on their reading behavior

**state**  
a set of FocusSessions with:  
&emsp;a user User  
&emsp;a document Document  
&emsp;a startTime Datetime  
&emsp;an endTime Datetime | None

a set of FocusStats with:  
&emsp; a set of FocusSessions  
&emsp; a user User

**actions**  
initUser(user: User): (focusStats: FocusStats)  
&emsp;**requires** user exists and does not have a focusStats  
&emsp;**effects** creates a focusStats with an empty set of FocusSessions and user  

startSession(user: User, document: Document, library: Library): (focusSession: FocusSession)  
&emsp;**requires** user has document in their library and user has a focusStats
&emsp;**effects** creates a new focusSession with user, document, startTime = current time, and None endTime

endSession(focusSession: FocusSession): (focusSession: FocusSession)  
&emsp;**requires** focusSession exists and has endTime of None  
&emsp;**effects** sets focusSession endTime to current time, adds focusSession to the user's FocusStats, returns focusSession

removeSession(focusSession: FocusSession)  
&emsp;**effects** removes focusSession from the set of FocusSessions and from the user's FocusStats' set of FocusSessions

viewStats(user: User): (focusStats: FocusStats)  
&emsp;**requires** user is associated with a focusStats object    