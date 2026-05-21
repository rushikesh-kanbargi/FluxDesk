# FluxDesk — Lessons Learned

## P0 #2 — Demo Mode

### Verification ≠ Written
"Verification script written" does not count as "verification passed."
Always run the script and paste full output before calling an item complete.

### Demo platform-key approach: (b), not (a) or (c)
`platformKey` is passed directly to `streamAI`/`callAI` options. The key bypasses user key DB lookup entirely. No DB write. See `demoService.getPlatformKeyOption()` and the injection-site comments in `/stream/route.ts` and `/run/route.ts`. If this approach changes (key rotation, multi-key), update those two comments.

### Conversion banner timing: lockout only (v1 deliberate)
Banner shows only when `runsUsed >= runsMax` (all 5 runs consumed). No progressive nudges at 3 or 4 runs. This is a deliberate v1 simplicity choice — add nudges if free→paid conversion is low at v1 review.

### /run regression: pure-transforms argument, no real-key e2e
After `toolHelpers.ts` refactor, `/run` regression relied on "pure functions with no side effects" argument. No real-key e2e test was run. Before production traffic: run a live `/run` call with a real API key and confirm `output`, `usageId`, `durationMs` all present in the response.
