# FluxDesk — Lessons Learned

## P0 #2 — Demo Mode

### Verification ≠ Written
"Verification script written" does not count as "verification passed."
Always run the script and paste full output before calling an item complete.

### Demo platform-key approach: (b), not (a) or (c)
`platformKey` is passed directly to `streamAI`/`callAI` options. The key bypasses user key DB lookup entirely. No DB write. See `demoService.getPlatformKeyOption()` and the injection-site comments in `/stream/route.ts` and `/run/route.ts`. If this approach changes (key rotation, multi-key), update those two comments.

### Conversion banner timing: lockout only (v1 deliberate)
Banner shows only when `runsUsed >= runsMax` (all 5 runs consumed). No progressive nudges at 3 or 4 runs. This is a deliberate v1 simplicity choice — add nudges if free→paid conversion is low at v1 review.

### /run regression: pure-transforms argument, no real-key e2e <!-- [MUST-FIX-BEFORE-LAUNCH] -->
After `toolHelpers.ts` refactor, `/run` regression relied on "pure functions with no side effects" argument. No real-key e2e test was run. Before production traffic: run a live `/run` call with a real API key and confirm `output`, `usageId`, `durationMs` all present in the response.

## P0 #3 — Context Panel

### memory.notes vs memoryNotes type mismatch — known inconsistency <!-- [SHOULD-FIX-SOON] -->
`/api/memory` returns `memoryNotes` (from `getMemoryContext`). `useMemory`'s `UserMemory` type has `notes`. Both coexist now via legacy alias. Resolve before the type sprawls: either rename the API response key to `notes` or fix all consumers to use `memoryNotes` and delete the alias. SettingsPage is the only consumer of `notes`. Cleanup scheduled as a convenient P1+ pass.

## P0 #5 — Designed Error States

### Cluster E retry — InputPanel state persists (needs manual confirmation) <!-- [SHOULD-FIX-SOON] -->
`InputPanel` uses `react-hook-form` with no `reset()` on submit, so form values are preserved after a failed run. The Retry button in `RunErrorBanner` re-calls `handleRun(lastInput)` with the previously captured input. **Needs one manual test in dev to confirm**: trigger a failing run (bad API key or rate limit), then click Retry and verify the same inputs are re-submitted without the user retyping. Mark resolved once confirmed.

## P1 #7 — Pipeline Shareable URLs

### Share page 404 = default Next.js page (polish item) <!-- [SHOULD-FIX-SOON] -->
`notFound()` in `src/app/share/[token]/page.tsx` falls through to Next.js's default white "404 | This page could not be found." — no FluxDesk branding. The unfurl-to-revoked-link path is real: share → revoke → recipient clicks old link. Fix: add `src/app/share/[token]/not-found.tsx` with a branded "This pipeline is no longer shared" page, same layout shell as the share page itself (wordmark, CTA). Not a blocker — add in next polish pass.

## P1 #12 — Async Pipeline Execution

### Auth regression: parallel HTTP utility bypassed auth wrapper <!-- [RESOLVED] -->
`postJson` in `pipelineRunStore.ts` was a bare `fetch()` with no `Authorization` header — identical to every other route except it never called `getAuthHeaders()`. Every request hit `withAuth`, which checks for the Bearer token and returns 401 immediately when absent. Fix: deleted `postJson`, replaced all call sites with `apiPost` from `src/lib/api.ts`. Lesson: when refactoring code out of a React Query hook into a Zustand store, audit auth attachment explicitly — typecheck and lint won't catch a missing Authorization header.

### Browser test required before declaring P1 #12 shipped <!-- [MUST-FIX-BEFORE-LAUNCH] -->
Code-trace found two bugs (runId guard, retry cache bypass). Browser test of the three scenarios in tasks/todo.md has NOT been completed by Claude — no display/browser access in this context. Walk through all three scenarios manually before calling this shipped.

### Two-tabs: Zustand store is per-tab (v1 gap) <!-- [V2-DEFERRED] -->
Each browser tab has its own Zustand store instance. Tab B has no awareness of a pipeline run started in Tab A. Tab B shows idle state. V2 fix: on RunView mount, check `/api/pipelines/${id}/runs` for any RUNNING run — if found, offer to "pick up" by reading stepOutputs from DB and populating the store. Not a blocker — single-tab is the primary use case.

### Start-new-run race condition fixed: runId guard in executeStep <!-- [RESOLVED] -->
`executeStep` now takes `runId` as a parameter and guards all `set()`/`get()` calls with `s.activeRun.runId !== runId`. Without this, a "Start new run" click while a step is in-flight would let the stale fetch response overwrite the new run's step state. Fix is in `pipelineRunStore.ts`.

## P1 #9 — Insights Shareable Image

### OG route accepts unvalidated stats via query params (polish item) <!-- [SHOULD-FIX-SOON] -->
`/api/og/insights` renders stats from `?total=...&streak=...` etc — caller-supplied, not verified. Anyone can generate a fake-looking FluxDesk stat card. Low severity (no auth bypass, no data leak), but misleading. Fix path when convenient: `/api/og/insights/[userId]` — server fetches real stats from DB, no query params. Not a blocker for v1.

### No periodic nudge = near-zero share volume expected <!-- [V2-DEFERRED] -->
v1 ships button-only share trigger on InsightsPage. Without event-driven nudges (run 100, first 7-day streak, month boundary), expect near-zero organic share volume. Add nudges in v2 once feature usage is confirmed. Note: requires a store flag + nudge component + event listeners. Track as v2 decision.

## Pre-launch IOUs

### Demo mode: /run smoke test required before flipping PLATFORM_DEMO_ENABLED=true <!-- [MUST-FIX-BEFORE-LAUNCH] -->
Real-key `/run` e2e must pass (output, usageId, durationMs in response) before demo mode goes live in production. This covers both the toolHelpers.ts pure-transforms gap and the demo path's callAI fork in /run.

### Demo mode: /stream smoke test also required <!-- [MUST-FIX-BEFORE-LAUNCH] -->
Same as above but for the streaming path. Confirm chunk events arrive, done event has usageId + provider + durationMs, and isDemo flag propagates correctly to the client counter.
