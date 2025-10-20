---
timestamp: 'Sun Oct 19 2025 22:59:50 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251019_225950.45bc9398.md]]'
content_id: 9342b5ca87379caa0fe627cddd36d5f3784b62a8bfe65f0d0be8d8edad21acba
---

# Feedback:

Comment: -1.5: Make sure you identify any types that you have in your state. You are mentioning types that probably should be generic (?), but never explicitly defining them. What is the type for the set of Annotations in your Library concept? Also, you probably want Annotations to take in a User generic parameter. Otherwise, with multiple users on your app, a user will not be able to view only their annotations--there is no way to know who is the author of an annotation, and therefore no way to filter for each user.\
-3: Your Profile actions do not reflect the state of taking in a generic TextSettings type. When do we instantiate it? Can we update the TextSettings? Make sure you are considering any updating actions for your concepts. For example, createDocument in your Library concept creates a new Document with default TextSettings and FocusStats, but we are never able to update this state with non-default options. You're missing a few edge cases for your concept actions--for example, in your TextSettings concept, you don't have a createSettings action for creating settings for a document, even though that is allowed in the state. Also consider some instances where you might want user-authenticated actions. For example, do we want all users to be able to add documents to other libraries?\
-2: You may be misunderstanding the way that the generic types work. In order to have a generic type as a part of a concept, it must be passed in during creation of that state. You are missing syncs for these initializations (ex: addDocument).
