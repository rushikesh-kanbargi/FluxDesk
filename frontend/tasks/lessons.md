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

## P0 #3 — Context Panel

### memory.notes vs memoryNotes type mismatch — known inconsistency
`/api/memory` returns `memoryNotes` (from `getMemoryContext`). `useMemory`'s `UserMemory` type has `notes`. Both coexist now via legacy alias. Resolve before the type sprawls: either rename the API response key to `notes` or fix all consumers to use `memoryNotes` and delete the alias. SettingsPage is the only consumer of `notes`. Cleanup scheduled as a convenient P1+ pass.

## P0 #5 — Designed Error States

### Cluster E retry — InputPanel state persists (needs manual confirmation)
`InputPanel` uses `react-hook-form` with no `reset()` on submit, so form values are preserved after a failed run. The Retry button in `RunErrorBanner` re-calls `handleRun(lastInput)` with the previously captured input. **Needs one manual test in dev to confirm**: trigger a failing run (bad API key or rate limit), then click Retry and verify the same inputs are re-submitted without the user retyping. Mark resolved once confirmed.

## P1 #7 — Pipeline Shareable URLs

### Share page 404 = default Next.js page (polish item)
`notFound()` in `src/app/share/[token]/page.tsx` falls through to Next.js's default white "404 | This page could not be found." — no FluxDesk branding. The unfurl-to-revoked-link path is real: share → revoke → recipient clicks old link. Fix: add `src/app/share/[token]/not-found.tsx` with a branded "This pipeline is no longer shared" page, same layout shell as the share page itself (wordmark, CTA). Not a blocker — add in next polish pass.

## Pre-launch IOUs

### Demo mode: /run smoke test required before flipping PLATFORM_DEMO_ENABLED=true
Real-key `/run` e2e must pass (output, usageId, durationMs in response) before demo mode goes live in production. This covers both the toolHelpers.ts pure-transforms gap and the demo path's callAI fork in /run.

### Demo mode: /stream smoke test also required
Same as above but for the streaming path. Confirm chunk events arrive, done event has usageId + provider + durationMs, and isDemo flag propagates correctly to the client counter.
