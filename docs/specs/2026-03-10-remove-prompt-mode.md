# Feature Spec: Remove Prompt Mode

**Date:** 2026-03-10
**Status:** Completed

---

## Goal and Scope

### Goal
Remove prompt-mode syncing from Skillz so syncing is native-only, eliminate the `syncMode` configuration option, and remove prompt-mode-specific configuration, codepaths, tests, and documentation.

### In Scope
- Remove `syncMode` from config types, validation, defaults, and docs.
- Make `sync` native-only and delete prompt/native branching.
- Remove prompt-rendering infrastructure that only exists to write managed sections into target files.
- Update `init` presets and environment defaults to produce directory targets that work with native sync.
- Add explicit legacy validation so old prompt-style configs fail with a clear migration message instead of creating directories like `AGENTS.md/`.
- Update integration tests and user-facing docs to match the native-only product.

### Out of Scope
- Reworking interactive skill creation prompts.
- Changing remote skill pull behavior beyond keeping it compatible with native-only sync.
- Adding new tool-specific target directory conventions beyond a single native default.

---

## Context and Constraints

### Background
Prompt mode is no longer a supported product capability. Today the repository still models sync as a dual-mode system, with `prompt` as the default and `native` as an alternative. That leaves unsupported behavior in config, command output, tests, and documentation.

### Current State
- `src/types/index.ts`, `src/utils/validation.ts`, and `src/core/config.ts` model `syncMode` at both global and per-target scope, with `resolveTargetSyncMode()` defaulting to `prompt`.
- `src/commands/sync.ts` splits dry-run output, validation, and target writes by resolved mode.
- `src/core/target-manager.ts` still owns prompt-mode file injection helpers (`readTargetFile`, `extractManagedSection`, `replaceManagedSection`, `writeTargetFile`) in addition to native copying.
- `src/core/template-engine.ts`, `src/templates/default.hbs`, and `src/templates/readme.hbs` only exist to render prompt-mode output.
- `src/core/skill-template-generator.ts` still depends on `src/templates/skill-interactive.hbs`, so not every template or Handlebars usage can be removed.
- `src/core/config.ts`, `src/core/environment-detector.ts`, `src/commands/init.ts`, and related tests still default presets to file targets such as `AGENTS.md` and `CLAUDE.md`.
- `tests/integration/sync.test.ts`, one mixed-target case in `tests/integration/native-sync.test.ts`, and docs in `README.md`, `CLAUDE.md`, and `docs/project/architecture/current/flow-sync.md` still describe prompt/native dual behavior.

### Required Pre-Read 
- `src/commands/sync.ts`
- `src/core/config.ts`
- `src/core/target-manager.ts`
- `src/core/environment-detector.ts`
- `src/utils/validation.ts`
- `tests/integration/native-sync.test.ts`
- `tests/integration/sync.test.ts`
- `tests/integration/init.test.ts`
- `README.md`
- `docs/project/architecture/current/flow-sync.md`

### Temporal Context Check

| Value | Source of truth | Representation | Initialization point | Snapshot/capture point | First consumer | Initialized before capture? |
| --- | --- | --- | --- | --- | --- | --- |
| Target destination | `skillz.json.targets[*].destination` | string path | config authoring / `getDefaultConfig()` / environment detection | `loadConfig()` result inside `syncCommand()` | `copySkillsToTarget()` and native validation | Yes |
| Global sync mode | `skillz.json.syncMode` | enum string | config authoring / schema default | `loadConfig()` result | `resolveTargetSyncMode()` | Yes |
| Target sync mode | `skillz.json.targets[*].syncMode` | enum string | config authoring / migration | per-target loop in `syncCommand()` | `resolveTargetSyncMode()` | Yes |
| Template selection | `config.template` or `target.template` | string | config authoring / CLI override | top of `syncCommand()` | `renderSkills()` | Yes |
| Path style | `config.pathStyle` or `target.pathStyle` | enum string | config authoring / CLI override | top of `syncCommand()` | `renderSkills()` | Yes |
| Native cleanup flag | `target.deleteExistingFromTarget` | boolean | config authoring | pre-sync validation and copy step | `syncCommand()` / `copySkillsToTarget()` | Yes |

The ordering is stable; the risk is not temporal misordering but obsolete values continuing to drive unsupported branches.

### Constraints
- Sync behavior after this change must be directory-copy only.
- Existing native behaviors, especially conflict validation and `deleteExistingFromTarget`, must remain intact.
- Integration tests are the primary safety net; add or update them instead of relying on unit-only coverage.
- The implementation should avoid silently converting legacy prompt-style file targets into directories.
- Keep the migration story explicit and conservative: fail fast on unsupported legacy prompt configs instead of guessing incorrect destinations.

### Non-obvious Dependencies or Access (Optional)
- `src/templates/*.hbs` and `src/core/template-engine.ts` become dead code once prompt rendering is removed.
- `README.md`, `CLAUDE.md`, and architecture docs currently describe prompt defaults and mixed-mode behavior and will become inaccurate if not updated in the same change.
- `package.json` currently copies every template into `dist/templates/`; that build step must stay aligned with whichever templates remain after sync cleanup.

---

## Approach and Touchpoints

### Proposed Approach
Simplify the product to one sync strategy: native directory copy. Remove prompt-mode control flow and its configuration surface entirely. Keep legacy handling minimal and explicit by rejecting prompt-style configs and known file-target destinations with an actionable error message. Standardize newly initialized projects on a workspace-local `.skills` target so presets continue to work without relying on prompt-mode file injection.

### Integration Points / Touchpoints
- `src/types/index.ts`: remove `syncMode`, `template`, `pathStyle`, and `skillsSectionName` fields that only support rendered file output.
- `src/utils/validation.ts`: remove prompt-only schema fields and add validation for native-only config shape.
- `src/core/config.ts`: remove sync-mode/template/path-style resolution helpers; change default preset targets to `.skills`; preserve migration only where it helps strip obsolete fields or detect unsupported legacy layouts.
- `src/core/environment-detector.ts`: keep environment detection markers, but emit native directory targets instead of prompt file targets.
- `src/commands/init.ts`: stop accepting / storing prompt-only sync config; ensure preset-generated config stays native-only.
- `src/cli.ts`: remove `sync --template` and `sync --path-style`, plus any init language that implies rendered file output.
- `src/commands/sync.ts`: remove prompt/native branching, always validate/copy directory targets, and fail clearly on legacy prompt-style destinations.
- `src/core/target-manager.ts`: keep native conflict detection/copy helpers; delete prompt managed-section helpers.
- `src/core/template-engine.ts`: remove prompt rendering infrastructure.
- `src/templates/default.hbs` and `src/templates/readme.hbs`: remove sync-only rendered-output templates.
- `src/core/skill-template-generator.ts`, `src/templates/skill-interactive.hbs`, and `package.json`: preserve create-command template behavior while updating the build to copy only the remaining required templates.
- `tests/integration/native-sync.test.ts`: convert native-with-`syncMode` fixtures to native-only config and add legacy rejection coverage.
- `tests/integration/sync.test.ts`: remove or replace prompt-mode integration coverage that no longer reflects supported behavior.
- `tests/integration/init.test.ts` and `tests/integration/environment-detector.test.ts`: update expected targets from file paths to `.skills`.
- `README.md`, `CLAUDE.md`, `notes/DESIGN.md`, and `docs/project/architecture/current/flow-sync.md`: rewrite living docs to native-only sync.

### Resolved Ambiguities / Decisions
- Default native target for presets: use `.skills` as the workspace-local output directory.
- Legacy prompt-mode configs: reject with a clear migration error instead of auto-converting unknown file targets.
- Prompt-only config surface: remove `syncMode`, `template`, `pathStyle`, and `skillsSectionName` rather than leaving inert settings behind.
- Legacy migration contract: silently strip inert native-compatible leftovers (`syncMode: "native"` and prompt-only rendering fields) when normalizing config, but reject `syncMode: "prompt"` and known prompt-style file targets.

### Important Implementation Notes (Optional)
- `z.object()` validation alone will not remove unknown keys from the runtime config because the parsed value is not reused, so migration/serialization must actively strip obsolete fields if we choose to normalize saved config.
- The repository already ignores `.skills` in init; using `.skills` as the preset target aligns with existing repo conventions.
- Historical research docs may still mention prompt mode as past context; this change should clean current product docs and living design docs, not rewrite time-bound research artifacts unless they are used as current guidance.

---

## Acceptance Criteria

- [x] Skillz no longer accepts or documents `prompt` as a sync mode, and sync behavior is native-only directory copying.
- [x] Running `skillz init` with presets creates native-compatible targets without prompt-only config fields.
- [x] Prompt-mode implementation code and prompt-only config/options are removed or replaced with explicit legacy errors where full removal would silently misbehave.
- [x] Integration tests cover the supported native-only behavior and at least one legacy prompt-style rejection path.
- [x] User-facing and living project docs no longer describe prompt mode, mixed mode, rendered instruction-file output, or prompt-only CLI/config options.
- [x] `skillz create` continues to work after prompt-rendering cleanup because the interactive-skill template path and build artifacts remain intact.

---

## Phases and Dependencies

### Phase 1: Planning and Review
- [x] Create feature spec.
- [x] Create validation spec.
- [x] Review the plan for missing migration, preset, and test implications.

### Phase 2: Native-Only Core
- [x] Remove prompt-only types, schema fields, config resolvers, and CLI options.
- [x] Update sync execution to native-only behavior with legacy guardrails.
- [x] Remove prompt-rendering helpers and sync-only templates that become unused.

### Phase 3: Presets, Tests, and Docs
- [x] Update init/environment defaults to `.skills`.
- [x] Refresh integration tests for native-only expectations and legacy failures.
- [x] Rewrite README, CLAUDE, and flow docs to match the native-only product.

### Phase Dependencies
- Phase 2 depends on Phase 1 decisions about preset defaults and migration behavior.
- Phase 3 depends on Phase 2 so tests/docs reflect the final supported behavior rather than intermediate compatibility shims.

---

## Validation Plan

Integration tests:
- Update native sync tests to omit `syncMode` while preserving success/error coverage for copy, conflicts, cleanup, dry-run, change detection, and duplicate handling.
- Add an integration test that rejects a legacy prompt-style config or prompt-target destination with an actionable error.
- Update init/environment detection tests to assert preset targets use `.skills` and no prompt-only config fields are persisted.
- Run the create-command integration coverage that relies on `skill-interactive.hbs` to guard against accidental template/build regressions.

Manual validation:
- Run `skillz init --preset agentsmd --no-sync` in a temp workspace and confirm `skillz.json` uses `.skills` with no prompt-only fields.
- Run `skillz sync` in a temp workspace and confirm copied skills land under `.skills/`.
- Run `skillz sync` against a legacy prompt-style config and confirm the CLI exits with a clear migration error instead of creating a directory named `AGENTS.md`.

### Separate Validation Spec (Optional)
- `docs/specs/validation-2026-03-10-remove-prompt-mode.md`

---

## Done Criteria

- [x] Native-only implementation is complete and matches the acceptance criteria.
- [x] Validation coverage and manual checks are updated and recorded in the paired validation spec.
- [x] Relevant docs and architecture notes are updated to describe the native-only product.

---

## Open Items and Risks

### Open Items
- [x] Keep the universal `.skills` preset target for now; no repo-local evidence required a preset-specific native directory.

### Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
| --- | --- | --- | --- |
| Preset target changes break user expectations for existing environments | High | Med | Keep detection markers, use a conservative `.skills` default, and document the migration clearly |
| Legacy configs silently create directories named after old target files | High | Med | Add explicit validation for prompt-style configs and common file-target destinations before copy begins |
| Prompt-rendering cleanup removes code still referenced by tests or docs | Med | High | Update tests/docs in the same change and run the relevant integration suite |
| Removing sync templates breaks `create` build/runtime assets | Med | Med | Keep `skill-interactive.hbs`, update build copy logic intentionally, and run create-related coverage |
| Removing prompt-only fields causes stale config objects to pass through unchanged | Med | Med | Strip obsolete fields during migration/save or fail fast when unsupported fields are still present |

### Simplifications and Assumptions (Optional)
- Assume `.skills` is the correct preset default because it is already the repository’s workspace-local skill directory convention and avoids tool-specific guesswork.

---

## Outputs

- PR created from this spec: Not created in this session

## Manual Notes 

[keep this for the user to add notes. do not change between edits]

## Changelog
- 2026-03-10: Created feature spec for native-only sync and prompt-mode removal (019cbc96-c95b-70f2-9ce6-b811a5f2fd32)
- 2026-03-10: Implemented native-only sync, updated tests/docs, and validated with `npm test` (019cbc96-c95b-70f2-9ce6-b811a5f2fd32)
