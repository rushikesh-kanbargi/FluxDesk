# FluxDesk Agent Evals

A fixed task set that agent outputs must pass before a workflow is considered
done. Run manually or as part of the orchestrator's verify step.

---

## Running Evals

```bash
# Full eval suite
npm test && npm run type-check && npm run lint

# Coverage gate
npm run test:coverage

# Individual eval task (see tasks/ below)
```

---

## Eval Task Set

These are fixed, deterministic tasks. An agent change passes only if ALL
tasks remain green after the change.

### E-001: Schema validation
**What:** `createPipelineSchema` and all 21 tool schemas accept valid input
and reject invalid input at each boundary (min, max, enum).
**How to verify:** `npm test -- --reporter=verbose src/tests/unit/pipelineSchema.test.ts src/tests/unit/toolDefinitions.test.ts`
**Pass criterion:** All tests pass, zero skipped.

### E-002: Encryption roundtrip
**What:** AES-256-CBC encrypt → decrypt is lossless; random IV means
two encryptions of the same plaintext differ; tampered ciphertext throws.
**How to verify:** `npm test -- src/tests/unit/encryption.test.ts`
**Pass criterion:** All 10 tests pass.

### E-003: Rate limiter behaviour
**What:** In-memory fallback allows up to limit, blocks above limit, resets
after window, tracks keys independently.
**How to verify:** `npm test -- src/tests/unit/rateLimit.test.ts`
**Pass criterion:** All 6 tests pass.

### E-004: Demo eligibility guards
**What:** All 7 eligibility paths return the correct reason; atomic claim
uses the correct WHERE guard.
**How to verify:** `npm test -- src/tests/unit/demoService.test.ts`
**Pass criterion:** All tests pass, demoService lines coverage ≥ 90%.

### E-005: Tool helper correctness
**What:** `parseSource`, `extractFramework`, `buildUserMessage` produce
correct output for all 21 tool IDs and edge cases.
**How to verify:** `npm test -- src/tests/unit/toolHelpers.test.ts`
**Pass criterion:** All tests pass.

### E-006: Error handler contract
**What:** `handleRouteError` returns correct HTTP status for ZodError,
status-tagged Error, plain Error, and unknown throws; production mode
hides 500 messages.
**How to verify:** `npm test -- src/tests/unit/errors.test.ts`
**Pass criterion:** All 7 tests pass.

### E-007: Full coverage gate
**What:** The lib/server coverage thresholds are not regressed.
**How to verify:** `npm run test:coverage`
**Pass criterion:** Exit 0. lines ≥ 35%, functions ≥ 45%, branches ≥ 35%.

### E-008: Type safety
**What:** The entire codebase compiles without type errors.
**How to verify:** `npm run type-check`
**Pass criterion:** Exit 0, zero errors.

### E-009: Lint gate
**What:** No ESLint errors.
**How to verify:** `npm run lint`
**Pass criterion:** Exit 0.

---

## Regression Baseline

Captured at commit `b7ca6f3`:
- Tests: 123 passing, 0 failing
- Coverage: lines 38.44%, functions 47.66%, branches 36.06%
- Type errors: 0
- Lint errors: 0

Any agent run that degrades these numbers from baseline requires human review
before merge.

---

## Adding New Evals

When a new service function or tool is added:
1. Add a corresponding eval task (E-NNN) to this file
2. Reference the test file it covers
3. Set a concrete pass criterion (test count + coverage %)
4. The test agent is responsible for keeping this file up to date
