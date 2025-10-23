# Profile Design Changes

1. Remove TextSettings from the profile
	- While this could be useful for having a default set of text settings for each profile, it adds complexity, conflates concerns, and is not necessary. Perhaps it can be added back in later, but is not necessary for a basic/MVP product. 
2. Add changePassword action
	- This degree of mutability seems useful for the common case where a user may want to change their password. It would also be nice to have a resetPassword action, which sends an email to the user for a code that can be used to reset the password, but that would be very complex to implement in Concept notation (an entire extra concept, with new syncs) and isn't strictly necessary. 
3. Changed password field to hashedPassword
	- Previously was directly storing plaintext passwords, which is very bad
	- Now using hashedPassword. There are mentions of a hash function, but that's not elaborated on in the spec, since external libraries implement it, and readers are excepted to understand the concept of a hash.
