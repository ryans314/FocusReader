---
timestamp: 'Mon Nov 10 2025 18:09:05 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_180905.5c940194.md]]'
content_id: d326e9e26b47d978f99968da2ce3b48f92f5206bcdd533f457c848d9e49e006e
---

# Prompt: two bugs, different lines:

On line `    details: ({ [details]: d }) => d[0],` and `    details: ({ [details]: d }) => d[0],`. The errors: `Cannot find name 'details'` and `Type 'symbol' cannot be used as an index type.`

The errors are in this code block:

```
// Profile._getUserDetails

export const GetUserDetailsRequest: Sync = (

  { request, session, user, details },

) => ({

  when: actions([

    Requesting.request,

    { path: "/Profile/_getUserDetails", session },

    { request },

  ]),

  where: async (frames) => {

    frames = await frames.query(Sessioning.getUser, { session }, { user });

    frames = await frames.query(Profile._getUserDetails, { user }, { details });

    return frames;

  },

  // Flatten the response to send back just the user details object, not an array.

  then: actions([Requesting.respond, {

    request,

    details: ({ [details]: d }) => d[0],

  }]),

});

  

// FocusStats._viewStats

export const ViewStatsRequest: Sync = ({ request, session, user, stats }) => ({

  when: actions([

    Requesting.request,

    { path: "/FocusStats/_viewStats", session },

    { request },

  ]),

  where: async (frames) => {

    frames = await frames.query(Sessioning.getUser, { session }, { user });

    frames = await frames.query(FocusStats._viewStats, { user }, {

      focusStats: stats,

    });

    return frames;

  },

  // Flatten the response to send back just the stats object, not an array.

  then: actions([Requesting.respond, {

    request,

    details: ({ [details]: d }) => d[0],

  }]),

});
```
