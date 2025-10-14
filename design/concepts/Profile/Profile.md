# concept: Profile

**concept** Profile \[TextSettings\]

**purpose** collect basic authentication and user info

**principle** A user can create an account and sign in with a username/password. 

**state**  
a set of Users with:  
&emsp;a username String  
&emsp;a password String  
&emsp;a textPreferences TextSettings

**actions**  
createAccount(username: String, password: String): (user: User)  
&emsp;**requires** username is not an existing username, and password is sufficiently secure  
&emsp;**effects** creates a new User with username and password

deleteAccount(user: User)  
&emsp;**requires** user exists  
&emsp;**effects** removes user from the set of Users

authenticate(username: String, password: String): (user: User)  
&emsp;**requires** username and password both correspond to the same existing User  
&emsp;**effects** returns the user associated with the username and password