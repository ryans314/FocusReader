```
--- Initialized test database for Profile Concept Tests ---
✅ Action: createAccount - Successful creation
✅ Action: createAccount - Duplicate username
✅ Action: createAccount - Insecure password
✅ Action: authenticate - Successful authentication
✅ Action: authenticate - Invalid username
✅ Action: authenticate - Incorrect password
✅ Action: changePassword - Successful password change
✅ Action: changePassword - Incorrect old password
✅ Action: changePassword - Insecure new password
✅ Action: changePassword - New password same as old
✅ Action: changePassword - User not found
✅ Action: deleteAccount - Successful deletion
✅ Action: deleteAccount - User not found
✅ Query: _getUserDetails - Retrieve user details
✅ Query: _getUserDetails - User not found
✅ Query: _getAllUsers - Retrieve all users
✅ Principle: A user can create an account and sign in with a username/password. Users can also change their password.
--- Closing MongoDB client after Profile Concept Tests ---
```