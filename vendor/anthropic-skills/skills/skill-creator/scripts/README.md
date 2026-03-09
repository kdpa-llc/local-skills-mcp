# vendor/anthropic-skills — local overlay

These files are vendored from [anthropics/skills](https://github.com/anthropics/skills)
with local modifications applied on top:

- `run_eval.py` — simplified to use `subprocess.run` instead of `Popen`+`select`,
  adds stale command-file cleanup, drops MCP mode and `_stream_and_detect`.
  See PR description for rationale.

To keep in sync with upstream: copy the relevant files from `anthropics/skills` and
re-apply the changes listed above.
