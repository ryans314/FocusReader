---
timestamp: 'Thu Oct 23 2025 06:18:31 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_061831.c8a447e1.md]]'
content_id: e40613026914c81163b22826cf87cdcaf412797ee16bd4607078c2d8f058f5b0
---

# response:

Yes, there is a way to run all your Deno tests and get all the `console.log` output, including from tests that pass.

Deno's test runner, by default, hides `console.log` output from *passing* tests to keep the output clean and focused on failures. It only shows `console.log` statements for tests that fail.

To force Deno to show all `console.log` output from all tests (passing and failing) directly in your terminal, you can pipe the output to another command.

**For Linux/macOS (and Git Bash on Windows):**

You can pipe the output of `deno test` to `cat`:

```bash
deno test src/Annotation/AnnotationConcept.test.ts | cat
```

Or, to run all tests in the `src/` directory (if you want to test multiple concepts at once):

```bash
deno test src/ | cat
```

**For Windows (Command Prompt or PowerShell):**

You can use `Get-Content` (PowerShell) or redirection tricks with `type` (Command Prompt is less straightforward for live streaming but `Get-Content` works well in PowerShell).

**PowerShell:**

```powershell
deno test src/Annotation/AnnotationConcept.test.ts | Get-Content -Wait
```

(Or just `deno test src/Annotation/AnnotationConcept.test.ts` might work in modern PowerShell if it doesn't buffer, but `Get-Content -Wait` is more reliable for streaming.)

**Explanation:**

Piping the output (e.g., to `cat`) changes how Deno buffers and displays the standard output, effectively streaming all `console.log` calls in real-time as they occur during the test execution, rather than just showing them for failures.

This will ensure that all the descriptive `console.log` statements you've added in your tests, like `"--- Test: createTag (success) ---"` and `"Verified tag exists in DB."`, will be visible for every test step, whether it passes or fails.
