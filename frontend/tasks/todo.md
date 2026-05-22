# P1 #8 — Pre-built Pipeline Templates

## Scope decisions

**Templates**: 6 (not 8). Four from audit, two cuts.
**Storage**: static TypeScript array — no schema change, version-controlled, ships in one PR.
**Import flow**: `useCreatePipeline` with pre-filled data — same mutation, zero new infrastructure.
**Dashboard**: "Workflows" row above tool grid, not replacing it.

Anti-goals: DB-backed templates (v2), user-submitted templates (v2), system user seeding, schema migration.

---

## The 6 templates

| # | Name | Steps | Category |
|---|------|-------|----------|
| 1 | Code Review to Commit | code-review → commit | Developer |
| 2 | Bug to Fix | bug-task → commit | Developer |
| 3 | Feature Planning | feature-spec → adr | Planning |
| 4 | Tech Stack Decision | tech-stack → adr | Planning |
| 5 | Prompt Workshop | forge → improver | Prompting |
| 6 | Meeting Debrief | meeting-mirror → standup → context-handoff | Workplace |

---

## Implementation plan

### [ ] 1. Template definitions — static array
- File: `src/lib/pipelineTemplates.ts`
- Each template: `id`, `name`, `description`, `category`, `steps: [{ toolId, order, inputMapping }]`
- `inputMapping` for each step: wire previous step's output where it makes sense; use `""` (runtime input) for the first step
- Export: `PIPELINE_TEMPLATES: PipelineTemplate[]` + `PIPELINE_TEMPLATE_MAP: Record<string, PipelineTemplate>`

### [ ] 2. Template input mapping strategy
- Step 1 of each template: `inputMapping` values = `""` (user provides at runtime)
- Step 2+: `inputMapping` values = `"{{step_N_output}}"` syntax (or whatever `pipelineEngine` uses for step references)
- Read `pipelineEngine.ts` to confirm the exact syntax for step output references before writing templates

### [ ] 3. "Workflows" section on DashboardPage
- File: `src/components/pages/DashboardPage.tsx`
- Add a row above the tool grid with template cards
- Template card: name, description, category color, step count, "Use template →" button
- Click: calls `createPipeline` with template data → navigates to `/pipelines` (or `/pipelines?new=<id>` to open builder)
- Show skeleton if `createPipeline.isPending`
- Section heading: "Workflow Templates" or "Start with a workflow"

### [ ] 4. Template cards on PipelinesPage
- File: `src/components/pages/PipelinesPage.tsx`
- Add a "Templates" tab or collapsible section in the list view
- Same card design as dashboard but in context — user can import to their workspace
- Don't show templates in the same grid as owned pipelines — separate section, visually distinguished

### [ ] 5. Import mutation
- `useCreatePipeline` already exists in `usePipelines.ts` — no new hook needed
- Template import = `createPipeline({ name: template.name, description: template.description, steps: template.steps })`
- On success: navigate to pipelines list (or open the newly created pipeline in builder)
- Track origin via `toast.success(\`"${template.name}" added to your pipelines\`)`

### [ ] 6. Typecheck + lint + commit

---

## Files to create
- `src/lib/pipelineTemplates.ts`

## Files to modify
- `src/components/pages/DashboardPage.tsx` — add Workflows row
- `src/components/pages/PipelinesPage.tsx` — add templates section in list view

## Read first (before writing templates)
- `src/lib/server/pipelineEngine.ts` — confirm step output reference syntax for inputMapping
- `src/components/pages/DashboardPage.tsx` — understand current layout before inserting row
