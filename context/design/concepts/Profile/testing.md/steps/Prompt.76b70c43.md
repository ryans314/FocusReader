---
timestamp: 'Thu Oct 23 2025 03:33:49 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_033349.40a5f9eb.md]]'
content_id: 76b70c430ecd9e950839abb96301ab6b6ed2c2f76c22efffdedb0ceffab19bdf
---

# Prompt: There is an error with the "\getAllUsers - Retrieve all users" test case. Instead of returning 2, it's returning 12. I suspect the test cases are not clearing their state before each test.step(). Could the issue be that Deno.test.beforeEach() runs before each Deno.test() call, rather than before each test.step() call?
