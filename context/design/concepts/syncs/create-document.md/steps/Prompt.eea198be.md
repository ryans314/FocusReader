---
timestamp: 'Mon Nov 10 2025 09:14:49 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_091449.f0b85eee.md]]'
content_id: eea198be0e4e726a187e0452c02c01dcb48f51d5644809ded9babd5f0f2a14b9
---

# Prompt: below is the console output i got when the front end attempted to log in with the auth login. Please tell me if this is a backend or front end issue

```
Requesting.request { username: 'bob', password: '1234567890', path: '/auth/login' } => { request: '019a6e1d-456b-718f-9147-11a6079901bc' }


Profile.authenticate { username: 'bob', password: '1234567890' } => { user: '019a4aa7-4575-7b22-8019-0eab1665c0e7' }

[Requesting] Error processing request: Missing binding: Symbol(session) in frame: [object Object]
```
