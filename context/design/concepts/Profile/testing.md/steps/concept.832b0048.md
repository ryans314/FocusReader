---
timestamp: 'Thu Oct 23 2025 03:16:14 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_031614.6e2f6fd3.md]]'
content_id: 832b0048f8010fb60cf628034e5c42b2e37b88f17cf770f2d7c4598fb2cd1907
---

# concept: Profile

**concept** Profile

**purpose** collect basic authentication and user info

**principle** A user can create an account and sign in with a username/password. Users can also change their password.

**state**\
a set of Users with:

* a username String
* a hashedPassword String

**actions**\
createAccount(username: String, password: String): (user: User)

* **requires** username is not an existing username, and password is sufficiently secure
* **effects** creates a new User with username and hash(password)

deleteAccount(user: User)

* **requires** user exists
* **effects** removes user from the set of Users

changePassword(user: User, oldPassword: String, newPassword: String): (user: User)

* **requires** user has hashedPassword=hash(oldPassword), newPassword is sufficiently secure
* **effects** modifies user to have hashedPassword=hash(newPassword)

authenticate(username: String, password: String): (user: User)

* **requires** username and hash(password) both correspond to the same existing User
* **effects** returns the user associated with the username and password
