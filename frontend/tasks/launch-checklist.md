# FluxDesk — Launch Checklist
## Gate: PLATFORM_DEMO_ENABLED=true

Complete every item in order. Do not flip the flag until all three gate items are checked.

---

## GATE ITEMS — must pass before flipping demo mode

### [ ] 1. /run smoke test (real API key)

Run a live tool call through the /run route with a real API key and confirm all three fields are present in the response.

```bash
# From the project root, with the dev server running:
curl -X POST http://localhost:3000/api/tools/code-review/run \
  -H "Content-Type: application/json" \
  -H "Cookie: <your session cookie>" \
  -d '{"code": "function add(a, b) { return a + b }", "language": "javascript"}' \
  | jq '{output: .output, usageId: .usageId, durationMs: .durationMs}'
```

Expected: all three keys present and non-null. `durationMs` > 0. `usageId` is a UUID string.
If any field is null or missing — stop, do not flip the flag.

### [ ] 2. /stream smoke test (real API key)

Run a live streaming call and confirm all SSE events arrive correctly.

```bash
curl -X POST http://localhost:3000/api/tools/code-review/stream \
  -H "Content-Type: application/json" \
  -H "Cookie: <your session cookie>" \
  -d '{"code": "function add(a, b) { return a + b }", "language": "javascript"}' \
  --no-buffer
```

Expected:
- Multiple `data: {"chunk":"..."}` lines arrive (not a single blob)
- Final `data: {"done":true,...}` event contains `usageId`, `provider`, `durationMs`
- `isDemo: false` on this call (authenticated user with real key)

Then repeat with a demo session (no API key configured) and confirm:
- `isDemo: true` in the done event
- Demo run counter increments in the UI

### [ ] 3. P1 #12 browser test — three scenarios

Open the app in a browser with the dev server running. Use a pipeline with 3+ steps (import a template if needed).

**Scenario 1 — Happy path:**
1. Navigate to a 3-step pipeline → Run view
2. Enter input, click Run
3. Expected: step 1 turns amber with animated dots → green with output preview; step 2 follows; step 3 follows
4. Expected: all three steps green, Final Output card appears, "Start new run" button visible
5. Check DB (optional): `PipelineRun.status = COMPLETED`, `stepOutputs` has `step_1`, `step_2`, `step_3`

**Scenario 2 — Mid-step failure with partial output:**
1. Start the 3-step pipeline
2. After step 1 completes (green), break the run — easiest: temporarily remove your API key in Settings mid-run, or use a pipeline where step 2 will fail
3. Expected: step 1 stays green, step 2 turns red with error message + "Retry step 2" button, step 3 stays gray (waiting)
4. Restore the key, click "Retry step 2"
5. Expected: step 2 re-executes with a new AI call (not the old output), step 3 follows
6. Verify retry is real: if step 2 output is identical to before the failure, the cache bypass is not working

**Scenario 3 — Navigate away during execution, navigate back:**
1. Start the 3-step pipeline
2. After step 2 completes (visible), immediately navigate to /dashboard — before step 3 finishes
3. Expected: no crash, no error toast
4. Navigate back to /pipelines, open the same pipeline's Run view
5. Expected: step 3 is either still running (amber) or complete (green) — NOT reset to idle
6. "Start new run" is only visible after all steps resolve

Pass all three → check the box. Any failure → fix before continuing.

---

## FLIP THE FLAG

```bash
# In .env.local (or your hosting provider's env config):
PLATFORM_DEMO_ENABLED=true
```

Redeploy. Verify the demo banner appears for a logged-out visitor at /dashboard.

---

## POST-LAUNCH — deferred items, do not forget

These are NOT launch blockers but should be addressed in the first week post-launch:

- **Share page 404**: add `src/app/share/[token]/not-found.tsx` — branded "pipeline no longer shared" page instead of default Next.js 404. 15-minute task.
- **Cluster E retry**: manually confirm InputPanel form state persists across a failed run + retry. Mark resolved in lessons.md once confirmed.
- **memory.notes / memoryNotes**: one rename away from clean. Fix before the type alias spreads further.
- **OG stats validation**: `/api/og/insights` trusts caller-supplied query params. Swap for `/api/og/insights/[userId]` reading real DB data.

V2 (revisit after seeing real user behavior):
- Two-tabs pipeline awareness (store is per-tab; pickup from DB on RunView mount)
- Periodic insights share nudges (after run 100, first 7-day streak, month boundary)
- Pipeline resume-from-step-N (true partial resume, not just retry-from-N)
- Command palette preview panel (P1 #10, deferred)
