# Feature Spec: Support `agent` Target Kind

**Date:** 2026-03-06
**Status:** Planning

---

## Goal and Scope

### Goal
Extend target syncing so a target can opt into syncing agent instruction files, not just skills. This keeps `targets` as the single destination list while letting the source set come from either `skillDirectories` or a new `targetDirectories` config field.

### In Scope
- Add `targets[].kind?: "skill" | "agent"` with `skill` as the default.
- Add top-level `targetDirectories: string[]` configuration for agent-file sources.
- Define how `skillz sync`, `watch`, validation, migration, docs, and tests handle agent targets.
- Preserve existing skill target behavior without requiring config changes.

### Out of Scope
- New CLI subcommands for creating or editing agent files.
- Auto-detection or `init` inference for agent source directories.
- Templating or path rewriting for copied agent files.

---

## Context and Constraints

### Background
`skillz` currently assumes every sync target is fed by discovered skills. That works for generated skill instructions and native skill directory copies, but it does not cover teams that also want to keep canonical agent prompt files under source control and sync those files into workspace-specific destinations.

### Current State
- `Target` only models a destination plus per-target sync overrides in [src/types/index.ts](/Users/kevinlin/code/skillz/src/types/index.ts).
- Config validation and migration only know about skill-backed targets in [src/utils/validation.ts](/Users/kevinlin/code/skillz/src/utils/validation.ts) and [src/core/config.ts](/Users/kevinlin/code/skillz/src/core/config.ts).
- `syncCommand` scans skills once, then uses the same skill set for every target in [src/commands/sync.ts](/Users/kevinlin/code/skillz/src/commands/sync.ts).
- Native sync logic assumes every source artifact is a skill directory with `SKILL.md` in [src/core/target-manager.ts](/Users/kevinlin/code/skillz/src/core/target-manager.ts).
- `watchCommand` only watches `skillDirectories` and `additionalSkills` in [src/commands/watch.ts](/Users/kevinlin/code/skillz/src/commands/watch.ts).

### Required Pre-Read
- [src/types/index.ts](/Users/kevinlin/code/skillz/src/types/index.ts)
- [src/core/config.ts](/Users/kevinlin/code/skillz/src/core/config.ts)
- [src/commands/sync.ts](/Users/kevinlin/code/skillz/src/commands/sync.ts)
- [src/core/target-manager.ts](/Users/kevinlin/code/skillz/src/core/target-manager.ts)
- [src/commands/watch.ts](/Users/kevinlin/code/skillz/src/commands/watch.ts)
- [tests/integration/native-sync.test.ts](/Users/kevinlin/code/skillz/tests/integration/native-sync.test.ts)

### Constraints
- Existing configs that omit `kind` must behave exactly as skill targets do today.
- Agent target support must not break mixed-target sync where some targets remain skill-backed.
- The source-selection contract for agent targets must be explicit enough for sync, watch, and tests to share the same behavior.
- Change detection and cache updates should continue to short-circuit when neither config nor relevant source artifacts changed.

### Non-obvious Dependencies or Access
- Cache and change-detection helpers currently use skill-specific naming and structures. Any reuse for agent files should stay backward compatible with the existing cache file shape unless a migration is strictly required.

---

## Approach and Touchpoints

### Proposed Approach
Add a second source class for sync destinations:

1. Keep skill-backed targets as the default path.
2. Introduce `targetDirectories: string[]` as source roots for agent files.
3. For `targets[].kind === "agent"`, resolve source files from `targetDirectories` instead of `skillDirectories`.
4. Define the agent-target lookup key as `target.destination`: for each configured source root, check for a file at `<targetDirectory>/<target.destination>`.
5. Require exactly one matching source file for an agent target. Zero or multiple matches are configuration errors and abort the sync before writes occur.
6. Treat agent files as verbatim artifacts rather than rendered templates. Sync copies the matched source file content directly into the destination file.
7. Split sync execution by target kind so each target uses the correct source set while still honoring the existing per-target loop, cache checks, dry-run output, and watch-triggered resync path.

### Integration Points / Touchpoints
- [src/types/index.ts](/Users/kevinlin/code/skillz/src/types/index.ts): add `Target.kind` and `Config.targetDirectories`.
- [src/utils/validation.ts](/Users/kevinlin/code/skillz/src/utils/validation.ts): validate the new schema while preserving legacy compatibility.
- [src/core/config.ts](/Users/kevinlin/code/skillz/src/core/config.ts): default `kind` to `skill`, migrate older configs, and seed `targetDirectories` with an empty array.
- [src/commands/sync.ts](/Users/kevinlin/code/skillz/src/commands/sync.ts): partition targets by kind and drive the right source discovery for each destination.
- [src/core/target-manager.ts](/Users/kevinlin/code/skillz/src/core/target-manager.ts): add agent-file copy helpers and keep native skill copy logic isolated.
- [src/commands/watch.ts](/Users/kevinlin/code/skillz/src/commands/watch.ts): watch both skill and agent source roots so edits in `targetDirectories` trigger resync.
- [src/commands/info.ts](/Users/kevinlin/code/skillz/src/commands/info.ts): show target kind and agent source counts so config inspection is not ambiguous.
- [README.md](/Users/kevinlin/code/skillz/README.md): document the new config shape and behavior.
- [tests/integration/native-sync.test.ts](/Users/kevinlin/code/skillz/tests/integration/native-sync.test.ts) and [tests/integration/watch.test.ts](/Users/kevinlin/code/skillz/tests/integration/watch.test.ts): cover mixed skill/agent sync and watch behavior.

### Resolved Ambiguities / Decisions
- Decision: `targets[].kind` defaults to `skill` during both validation and runtime resolution so older configs do not need edits.
- Decision: `targetDirectories` is a new top-level `string[]` config array and defaults to `[]`.
- Decision: agent targets are sourced from files, not templated skill metadata. Sync copies source file content verbatim into the destination.
- Decision: an agent target resolves its source file by matching `target.destination` relative to one of the configured `targetDirectories`.
- Decision: duplicate agent sources for the same relative destination should fail fast rather than silently picking one.
- Decision: agent targets are file-to-file sync only in this change. `syncMode` remains accepted in config for schema parity but does not change agent-target behavior.
- Decision: per-target `template`, `pathStyle`, `preset`, and `deleteExistingFromTarget` remain valid config fields, but they are ignored for `kind: "agent"` and should be documented as such.
- Decision: `--only` continues to filter skill names only. Agent targets are still evaluated during the same sync run, and the CLI should warn that `--only` does not filter agent targets.

### Important Implementation Notes
- The source-resolution contract for agent targets should be centralized in one helper and reused by sync, dry-run reporting, and watch-driven syncs.
- The cache does not need a format migration if agent file hashes can be stored through the existing `skills` map using relative source paths as keys, but that reuse should be made explicit in code comments or naming.
- Prompt-mode skill rendering and agent-file copying should remain separate code paths to avoid pushing file-copy semantics into the Handlebars template layer.
- Missing `targetDirectories` roots should follow the current watch/sync convention for missing skill roots: warn, skip nonexistent roots, and only error when a target cannot resolve exactly one source file.

---

## Phases and Dependencies

### Phase 1: Extend config and runtime types
- [ ] Add `kind` to the `Target` type and schema.
- [ ] Add `targetDirectories` to the config type, defaults, and validation.
- [ ] Update config migration so legacy targets become `{ kind: "skill" }` implicitly.
- [ ] Keep `targetDirectories` intentionally simple as `string[]` for the first iteration.

### Phase 2: Add agent source resolution and sync behavior
- [ ] Add agent-file discovery for `targetDirectories`.
- [ ] Teach sync planning and dry-run output to split skill-backed and agent-backed targets.
- [ ] Add verbatim file-copy behavior for agent targets without disturbing existing skill rendering and native skill copies.
- [ ] Warn when `--only` is used with agent targets because it only filters skill sources.

### Phase 3: Update watch, info, and docs
- [ ] Include `targetDirectories` in live watch roots.
- [ ] Make `info` output explicit about target kinds and configured agent source roots.
- [ ] Document `kind`, `targetDirectories`, source-resolution rules, and mixed-target examples in the README.

### Phase 4: Add validation coverage
- [ ] Add integration coverage for default `kind: "skill"` backward compatibility.
- [ ] Add mixed-target sync coverage with one skill target and one agent target.
- [ ] Add failure coverage for duplicate or missing agent source files.
- [ ] Add watch coverage proving edits under `targetDirectories` trigger a resync for agent targets.

### Phase Dependencies
- Phase 2 depends on Phase 1.
- Phase 3 depends on Phase 2.
- Phase 4 depends on Phases 2 and 3.

---

## Validation and Done Criteria

### Validation Plan

Integration tests:
- Existing skill-only sync tests still pass without config changes.
- A config with `targets: [{ destination: "AGENTS.md", kind: "agent" }]` and one matching source file under `targetDirectories` copies that file into the workspace destination.
- A mixed config syncs skill targets from `skillDirectories` and agent targets from `targetDirectories` in one run.
- Duplicate agent source matches for the same target produce a clear error before writes occur.
- Missing agent source matches produce a clear error before writes occur.
- `skillz watch` resyncs when a file under `targetDirectories` changes.
- `sync --only python-expert` warns that agent targets are unaffected and still evaluates them.

Unit tests:
- Config migration defaults `kind` to `skill`.
- Agent source resolution returns the unique matching file for a destination and errors on zero or multiple matches.

Manual validation:
- Run `skillz info` and verify target kinds and source roots are visible.
- Run `skillz sync --dry-run` on a mixed config and verify agent targets report file-copy actions rather than skill rendering.

### Done Criteria
- [ ] Older configs without `kind` or `targetDirectories` keep existing behavior.
- [ ] Agent targets sync from `targetDirectories` using a documented and tested resolution rule.
- [ ] Watch and dry-run behavior reflect both source kinds.
- [ ] Ignored agent-target options and `--only` semantics are documented clearly.
- [ ] README documents the new configuration and limitations clearly.

### Separate Validation Spec
- None. The scope is narrow enough to keep validation in this spec.

---

## Open Items and Risks

### Open Items
- [ ] Decide later whether `targetDirectories` should grow into a richer object form with per-root include/ignore rules.
- [ ] Decide later whether agent targets need a true directory-oriented native mode instead of the initial file-to-file contract.
- [ ] Decide later whether agent-file management deserves dedicated CLI flows beyond sync/watch/info.

### Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
| --- | --- | --- | --- |
| Agent source resolution is underspecified, leading to ambiguous sync behavior | High | Med | Document one explicit lookup rule now and add failure tests for zero/multiple matches |
| Agent support regresses existing skill sync short-circuiting | Med | Med | Keep skill and agent source scans separate and preserve default `kind: "skill"` |
| Watch mode misses agent-source changes | Med | Med | Add `targetDirectories` to live watch roots and cover it with integration tests |
| Cache reuse across skill and agent sources becomes confusing | Low | Med | Keep the cache format stable but document the generalized meaning of cached entries |

### Simplifications and Assumptions
- This spec assumes an agent target maps to exactly one source file by resolving `target.destination` under each configured `targetDirectories` root.
- This spec keeps agent-file copying verbatim and does not introduce templating, section replacement, or path rewriting for agent artifacts.
- This spec keeps agent-target behavior file-oriented even if `syncMode` is set to `native`, and documents that as an intentional first-pass limitation.

---

## Outputs

- PR created from this spec: Not started

## Manual Notes 

[keep this for the user to add notes. do not change between edits]

## Changelog
- 2026-03-06: Created feature spec for `target.kind` and agent-backed sync targets. (019cc6b1-e3db-79a2-b9af-5ea25b97a45b)
- 2026-03-06: Tightened the execution contract after review by defining `targetDirectories`, agent source lookup, and option semantics explicitly. (019cc6b1-e3db-79a2-b9af-5ea25b97a45b)
