---
timestamp: 'Thu Oct 23 2025 02:34:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_023415.1b925595.md]]'
content_id: 661d11acaa07eb46f18b63ca665203a4ef03225a0686951a913cf4b05c9d8721
---

# concept: Profile

**concept** Profile

**purpose** collect basic authentication and user info

**principle** A user can create an account and sign in with a username/password. Users can also change their password.

**state**\
a set of Users with:

* a username String
* a password String

**actions**\
createAccount(username: String, password: String): (user: User)

* **requires** username is not an existing username, and password is sufficiently secure
* **effects** creates a new User with username and password

deleteAccount(user: User)

* **requires** user exists
* **effects** removes user from the set of Users

changePassword(user: User, oldPassword: String, newPassword: String): (user: User)

* **requires** user has password=oldPassword, newPassword is sufficiently secure
* **effects** modifies user to have password=newPassword

authenticate(username: String, password: String): (user: User)

* **requires** username and password both correspond to the same existing User
* **effects** returns the user associated with the username and password
