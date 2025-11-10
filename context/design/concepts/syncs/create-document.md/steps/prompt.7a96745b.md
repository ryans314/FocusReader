---
timestamp: 'Mon Nov 10 2025 11:22:31 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_112231.819ac2f5.md]]'
content_id: 7a96745ba7bda0383b8c4e1eeb6160b0525101c2f2ef0982100eb9ad6388f2bc
---

# prompt: still not working. I'm pasting a list of possible errors that instructors have found:

1. Adding a thought that might be helpful: one reason an action in the then clause might not be triggered is that the where clause results in an empty array of frames (that is, the query comes back empty), so there are no frames in which to execute the action.
   1. Thanks! That ended up being exactly the problem -- user was a symbol and i wasn't destructuring it
2. You'll likely find in the trace that the action isn't failing, just the request is timing out! This means that you simply haven't responded to that specific request. Take a look again at any of the syncs in the conceptbox repo that ends with "Response" - basically, you'll need one more sync to describe exactly how you want to respond to the request (the "Requesting.respond" action). This is a separate behavior, and thus a separate sync - you can just pass the output of the action, or customize the response message.
   Do any of these apply? If so, can you apply the fix?
