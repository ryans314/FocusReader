# concept: Profile

**concept** Profile

**purpose** collect basic authentication and user info

**principle** A user can create an account and sign in with a username/password. Users can also change their password. 

**state**  
a set of Users with:  
- a username String  
- a hashedPassword String 

**actions**  
createAccount(username: String, password: String): (user: User)  
- **requires** username is not an existing username, and password is sufficiently secure  
- **effects** creates a new User with username and hash(password)

deleteAccount(user: User)  
- **requires** user exists  
- **effects** removes user from the set of Users

changePassword(user: User, oldPassword: String, newPassword: String): (user: User)
- **requires** user has hashedPassword=hash(oldPassword), newPassword is sufficiently secure
- **effects** modifies user to have hashedPassword=hash(newPassword)

authenticate(username: String, password: String): (user: User)  
- **requires** username and hash(password) both correspond to the same existing User  
- **effects** returns the user associated with the username and password