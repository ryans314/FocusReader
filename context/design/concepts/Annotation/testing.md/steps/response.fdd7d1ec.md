---
timestamp: 'Thu Oct 23 2025 06:26:15 GMT-0400 (Eastern Daylight Time)'
parent: '[[..\20251023_062615.331d38d6.md]]'
content_id: fdd7d1eccdf18bf2cdfda93c6633dfd1b23e8ce7cc42b774c595cf80012c5973
---

# response:

My apologies! You are absolutely correct. I made a mistake by suggesting `--reset-stats`, which is not a valid flag for `deno cache`. It seems I conflated Deno's caching mechanisms with other CLI tools.

The correct and most aggressive way to clear Deno's cache using the command line is simply `deno cache --reload` without any specific file paths, or by targeting specific files and entry points as we've discussed.

### The Correct Way to Aggressively Clear Deno's Cache:

1. **Close your IDE/editor completely.** This ensures no lingering file handles or internal caches are held by your development environment.

2. **Run `deno cache --reload` at your project root.**
   This command, when run without arguments, tells Deno to re-download and re-cache *all* modules it encounters in the project, effectively clearing out any stale entries or incorrect casing references that might be in its internal manifest.

   ```bash
   deno cache --reload
   ```

   *You can also add `--check` to this to re-type-check everything:*

   ```bash
   deno cache --reload --check
   ```

3. **Manually delete the Deno cache directory (if the above still doesn't work).**
   This is the most extreme measure and should be a last resort, as it will require Deno to re-download *everything* for all your Deno projects.
   * **For Linux/macOS:** `rm -rf ~/.deno`
   * **For Windows:** `rmdir /s /q %LOCALAPPDATA%\deno` (or manually navigate to `%LOCALAPPDATA%\deno` and delete the folder).
   * *Note: The actual path might vary if you've set a custom `DENO_DIR` environment variable.*

After running the `deno cache --reload` command and restarting your IDE, the case-sensitivity issue should finally resolve. The "Root file specified for compilation" error strongly points to a cached reference or an import path that Deno is resolving with the old casing, and `deno cache --reload` is designed to fix that by forcing a fresh lookup.
