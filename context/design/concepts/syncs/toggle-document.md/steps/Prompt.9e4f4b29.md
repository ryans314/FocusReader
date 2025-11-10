---
timestamp: 'Mon Nov 10 2025 15:55:24 GMT-0500 (Eastern Standard Time)'
parent: '[[..\20251110_155524.fb02906f.md]]'
content_id: 9e4f4b294f8b128bedec43f08d89a02f1b8356d870d860ee14a65fabf868e028
---

# Prompt: Still 2 bugs:

No overload matches this call.\
Overload 1 of 2, '(f: (...args: never\[]) => unknown\[], input: { user: symbol; }, output: { focusSession: symbol; }): Frames<Frame>', gave the following error.\
Argument of type '(input: { user: ID; }) => Promise<{ focusSession: FocusSessionDocument; }\[] | { error: string; }>' is not assignable to parameter of type '(...args: never\[]) => unknown\[]'.\
Type 'Promise<{ focusSession: FocusSessionDocument; }\[] | { error: string; }>' is missing the following properties from type 'unknown\[]': length, pop, push, concat, and 35 more.\
Overload 2 of 2, '(f: (...args: never\[]) => Promise\<unknown\[]>, input: { user: symbol; }, output: { focusSession: symbol; }): Promise\<Frames<Frame>>', gave the following error.\
Argument of type '(input: { user: ID; }) => Promise<{ focusSession: FocusSessionDocument; }\[] | { error: string; }>' is not assignable to parameter of type '(...args: never\[]) => Promise\<unknown\[]>'.\
Type 'Promise<{ focusSession: FocusSessionDocument; }\[] | { error: string; }>' is not assignable to type 'Promise\<unknown\[]>'.\
Type '{ focusSession: FocusSessionDocument; }\[] | { error: string; }' is not assignable to type 'unknown\[]'.\
Type '{ error: string; }' is missing the following properties from type 'unknown\[]': length, pop, push, concat, and 35 more.

for

```
frames = await frames.query(

      FocusStats._getSessions,

      { user },

      { focusSession: session },

    );
```

And

```
Argument of type '(frame: any) => (((input: { focusSession: ID; }) => Promise<{ focusSession: ID; } | { error: string; }>) | { focusSession: any; })[]' is not assignable to parameter of type 'ActionList'.deno-ts(2345)
```

for

```
then: actions(

    // BUG FIX (4): The 'where' clause provides frames with a correctly-typed `session` variable.

    // We can now access its `_id` property safely.

    (frame) => [

      FocusStats.endSession,

      { focusSession: (frame[session] as FocusSessionDocument)._id },

    ],
```
