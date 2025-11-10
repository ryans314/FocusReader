---
timestamp: 'Mon Nov 10 2025 10:54:37 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_105437.5f096065.md]]'
content_id: 71d6d6f97cadbe4f64e9ed0f9d7e94da09c3dbbaf77eeb3d7f44d5702c8302e0
---

# Prompt: I believe you cannot have queries in the when or then clauses, generally speaking. Here is a response from one of the instructors (developer of the sync engine):

To elaborate on Daniel's answer, the idea of queries is that they are not actions that you match against in the **when** clause, or issue in the **then** clause, but rather that they are about fetching information. This is the semantics of the **where**: a clause for matching information and determining state. 

This doesn't mean that you can't have HTTP requests for the sole purpose of looking up state! The nice thing about separating out the Requesting concept is that you can instead simply say that the entire purpose of a particular route is to fetch information, and it actually becomes more compact. Consider this sync:

sync GetReceivedRequests

when

  Requesting.request(path: "/Friends/\_getReceivedRequests", **session** ) : ( request )

where

  in Sessioning: **session** is associated with **user**

  in Friends: **senders** is associated with received requests of **user** 

then

  Requesting.respond(request, **senders**)

(by the way, I think you might be missing some input bindings to your call to Friends.\_getReceivedRequests)

Notice how we can do the entire behavior of checking the request is authenticated, and fetch the data we need, in one sync! Also, here you'll see that you can choose whatever path you need, although it may be more convenient for your existing frontend to continue using the "query endpoint" from before.

In this way, syncs allow you to express all the behavior that you need in a granular fashion, and because now we're not waiting for a specific action to occur, a query on Friends is the same as a query on Sessioning, and therefore you can compact the two together as your combined condition on state. I'll leave the exercise of translating the spec above to code, which should be more or less 1-to-1 depending on how you actually call your query.
