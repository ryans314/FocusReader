---
timestamp: 'Mon Nov 10 2025 07:29:52 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_072952.689c9b16.md]]'
content_id: 537d194d0fac972fc5a0bf17b6d8aa90cab56e07d0b4c87fec3270857daa51fd
---

# Prompt: Consider the following description from the assignment. After reading, does it make more sense why keeping and reusing the same path would be good?

This section explains how the concept server that we’re providing you with works, and how it minimizes the changes you’ll need to make. This action server extends the behavior of the previous concept server to accommodate syncs.

**The previous action server**. For your previous assignment, we gave you a simple server that automatically routed post requests that were sent to `/api/concept_c/action_a` to the action called `action_a` of the concept called `concept_c`. This allowed you to avoid having to define routes explicitly, since they were defined by the concepts and their actions.

**A new action server**. In this assignment, we’re providing you with a similar server, this time embodied in a special concept called *Requesting*. When this concept is instantiated, it starts up a server that takes requests and either passes them through (like the old server) directly to concepts, or turns them into request actions to be used in syncs. By default, requests are passed through (or “included”), so if you use the action server out of the box it will behave exactly like the old action server. For example, an HTTP request coming into the back end with the route `/api/concept_c/action_a` will by default call action `action_a` of concept `concept_c`.

Alternatively you can list an action as “excluded,” and it will then be turned into a request action. For example, if `/api/concept_c/action_a` is excluded, an HTTP request coming into the back end with that route will generate the action `Requesting.request` (that is, the `request` action of the special `Requesting` concept) with an argument (called `path`) set to the string `concept_c/action_a`. You can then write a sync on this action. If you don’t write a sync, there will be no reaction to the request and it will eventually time out and return an error.

You can also list an action as “included,” which doesn’t affect the behavior (since that’s the default) but records the fact that you *intend* it to be included so it will stop printing a warning message telling you that it’s been included by default.

**Why exclude actions**? Excluding a concept action means that calling `/api/concept_c/action_a` no longer directly causes `Concept_c.action_a` to occur. There are primarily two reasons for wanting this. One is that the action should only be permitted under certain conditions (such as when the user has been authenticated); you would implement this with a sync saying that *when* the request occurs and *where* some condition holds, *then* the action itself occurs. Note that in this case the call to `/api/concept_c/action_a` would likely have to be modified because the request action would include parameters (such as a session token) that the bare concept action does not.

A second reason is that the action is to be handled only by the back end and no longer be available to the front end at all. For example, in a social media app, a notification action might be excluded so that it can be executed automatically in response to a comment being added to a user’s post. Note that in this case the only likely change to the front end (if it was previously executing the notification explicitly) is that some calls are removed.
