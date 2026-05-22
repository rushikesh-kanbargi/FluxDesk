# P1 #12 — Async Pipeline Execution

## Scope decisions

**Execution model**: Client-driven step-by-step. POST `/run` creates PipelineRun, returns `{ runId }`. Client calls POST `/run/step` for each step sequentially with `{ runId, stepOrder, initialInput, stepOutputs }`. Each request is one AI call (~5-10s), no timeout issues.

**State persistence**: Zustand store (`pipelineRunStore.ts`). The execution loop lives in store actions — `fetch()` calls survive component unmounts. NavigateAway→Back reads the same in-flight store state. Shell shows a pulse indicator when `activeRun !== null`.

**Idempotency**: Step route checks `PipelineRun.stepOutputs[step_N]` before executing. If populated, returns cached output. Key = `runId + stepOrder`. Handles: double-click, network blip, client retry.

**Failure semantics**: (b) partial output displayed. When step N fails, steps 1..N-1 outputs are in the store and shown. User sees completed steps green, failing step red with error + Retry button, remaining steps waiting. Run marked FAILED in DB. Retry re-fires the same step route (idempotency handles the case where server saved output but client didn't receive it). "Resume from step N" = v2. "Regenerate step N" (want different AI output) = v2.

**Visual state machine**: `waiting | running | complete | failed` (4 states, not 5).
- `waiting`: gray, step number, tool name — step N+1 after current running step gets `data-next` for subtle amber ghost border
- `running`: amber left border, pulsing dot, "Running…"
- `complete`: green left border, green checkmark, output preview (80 chars, click to expand)
- `failed`: red left border, red X, error message, "Retry step N" button

Anti-goals: job queue (Inngest), true background execution (tab-close persistence), auto-retry, regenerate step.

---

## Implementation plan

### [x] 1. Refactor pipelineEngine.ts — add executeSingleStep()
- File: `src/lib/server/pipelineEngine.ts`
- Add: `executeSingleStep(runId, pipelineId, userId, stepOrder, initialInput, previousOutputs)` → `Promise<{ stepOutput: string }>`
- Idempotency inside: load run, check `(run.stepOutputs as Record<string,string>)[step_N]`, return cached if present
- Execute: load pipeline+step, resolve inputs, callAI, update `PipelineRun.stepOutputs`, detect if last step and mark COMPLETED
- Old `executePipeline` stays (unused in the new path, but don't delete until confirmed nothing calls it)

### [x] 2. Modify /run route — return runId immediately
- File: `src/app/api/pipelines/[id]/run/route.ts`
- New body: create `PipelineRun({ status: RUNNING, stepOutputs: {} })`, return `{ runId }`
- Remove `initialInput` from schema (client sends it per-step, not at run creation)
- Remove `executePipeline` call

### [x] 3. New step route — /api/pipelines/[id]/run/step/route.ts
- File: `src/app/api/pipelines/[id]/run/step/route.ts`
- Schema: `{ runId: string, stepOrder: number, initialInput: string, stepOutputs: Record<string,string> }`
- Auth + rate limit (same `pipeline-run:${userId}` key, 20/min — steps are faster than full runs)
- Ownership: `prisma.pipelineRun.findFirst({ where: { id: runId, userId } })`
- Call `executeSingleStep(...)` → `{ stepOutput: string }`

### [x] 4. Zustand store — pipelineRunStore.ts
- File: `src/store/pipelineRunStore.ts`

```ts
type StepStatus = 'waiting' | 'running' | 'complete' | 'failed'

interface StepState {
  order: number
  toolId: string
  status: StepStatus
  output: string | null
  error: string | null
}

interface ActiveRun {
  pipelineId: string
  runId: string
  initialInput: string
  steps: StepState[]
  overallStatus: 'running' | 'complete' | 'failed'
}
```

- `startRun(pipelineId, pipelineSteps, initialInput)`:
  1. POST `/api/pipelines/${pipelineId}/run` → `{ runId }`
  2. Init `steps[]` with all `waiting`
  3. Call `_executeStep(1)`

- `_executeStep(stepOrder)`:
  1. Mark step as `running`
  2. Collect `stepOutputs` from completed steps
  3. POST `/api/pipelines/${pipelineId}/run/step` with `{ runId, stepOrder, initialInput, stepOutputs }`
  4. On success: mark step `complete`, set output
     - If `stepOrder < steps.length`: call `_executeStep(stepOrder + 1)`
     - Else: set `overallStatus: 'complete'`
  5. On error: mark step `failed`, set error, set `overallStatus: 'failed'`

- `retryStep(stepOrder)`: reset step to `waiting`, call `_executeStep(stepOrder)`
- `clearRun()`: set `activeRun: null`

### [x] 5. RunView in PipelinesPage — wire to store
- File: `src/components/pages/PipelinesPage.tsx`
- Import `usePipelineRunStore`
- Replace `useRunPipeline` mutation with store `startRun`
- Remove local `result`, `stepStatuses` state — read from store
- Step card component: `StepCard({ step, stepState, isNext })` — renders all 4 states
  - `waiting` + `isNext`: amber ghost left border (`border-[rgba(245,166,35,0.25)]`), subtle indicator
  - `waiting`: `border-[rgba(255,255,255,0.06)]`
  - `running`: `border-[#F5A623]`, pulsing amber dot, "Running…"
  - `complete`: `border-[#34D399]`, green checkmark, truncated output (expand on click)
  - `failed`: `border-[#F43F5E]`, red X, error text, "Retry step N" button → `retryStep(N)`
- On mount: if `activeRun?.pipelineId === pipelineId`, read from store (handles nav-away + return)
- On unmount: do NOT call `clearRun()` — store persists
- Show `clearRun` button only when `overallStatus === 'complete' | 'failed'` ("Start new run")
- `handleRun()` calls `store.startRun(pipelineId, pipeline.steps, initialInput.trim())`

### [x] 6. Shell running indicator
- File: `src/components/shell/IconRail.tsx` (or AppShell.tsx — wherever the nav icons live)
- Read `activeRun` from `usePipelineRunStore`
- If `activeRun?.overallStatus === 'running'`: show amber pulse dot on the Pipelines nav icon
- Implementation: `<span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-[#F5A623] animate-pulse" />`

### [x] 7. Update usePipelines.ts
- Remove `useRunPipeline` hook (replaced by store)
- Remove `RunResult` interface (no longer returned from the hook)
- Keep `usePipelineRuns` (for the runs history tab, unaffected)

### [x] 8. Typecheck + lint + commit

---

## Manual test plan (3 scenarios before declaring shipped)

### Scenario 1 — Happy path: 3-step pipeline runs to completion
1. Create a 3-step pipeline (or use an imported template)
2. Navigate to Run view, enter initial input, click Run
3. Expected: step 1 turns amber (running) → green (complete with output preview), step 2 turns amber, etc.
4. Verify: all 3 steps green, final output shown, "Start new run" button visible
5. Verify DB: `PipelineRun.status = COMPLETED`, `stepOutputs` has `step_1`, `step_2`, `step_3`

### Scenario 2 — Network failure mid-step 2: partial output + retry
1. Start a 3-step pipeline
2. After step 1 completes (green), simulate step 2 failure:
   - Option A: temporarily break the API key mid-run
   - Option B: use a mock tool that returns an error
3. Expected: step 1 stays green, step 2 turns red with error message + "Retry step 2" button, step 3 stays waiting
4. Click "Retry step 2" — step 2 turns amber, then green, step 3 proceeds
5. Verify: idempotency — if step 2 was saved before the client error, retry returns cached output (not a new AI call)

### Scenario 3 — Navigate away during step 3, navigate back, state preserved
1. Start a 3-step pipeline
2. After step 2 completes (visible), immediately navigate to `/dashboard` before step 3 finishes
3. Expected: no visible crash, store holds state
4. Navigate back to `/pipelines`, open the same pipeline's Run view
5. Expected: step 3 is either still running (amber) or completed (green) depending on timing — NOT reset to idle
6. Verify: "Start new run" is only visible after all steps resolve

---

## Files to create
- `src/app/api/pipelines/[id]/run/step/route.ts`
- `src/store/pipelineRunStore.ts`

## Files to modify
- `src/lib/server/pipelineEngine.ts` — add `executeSingleStep()`
- `src/app/api/pipelines/[id]/run/route.ts` — returns `{ runId }` only
- `src/components/pages/PipelinesPage.tsx` — RunView wired to store, new StepCard
- `src/hooks/usePipelines.ts` — remove `useRunPipeline` + `RunResult`
- `src/components/shell/IconRail.tsx` — pipeline running pulse indicator
