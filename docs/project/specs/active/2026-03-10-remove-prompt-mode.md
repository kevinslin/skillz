# Feature Spec: Remove Prompt Mode

**Date:** 2026-03-10
**Status:** Completed

---

## Goal and Scope

### Goal
Remove `prompt` as a supported sync mode option and eliminate prompt-mode terminology from the codebase, while preserving the existing managed-file sync behavior as the default when `syncMode` is omitted.

### In Scope
- Remove `'prompt'` from config types, validation, and sync-mode resolution.
- Keep managed-section file syncing working for file targets without requiring `syncMode`.
- Preserve `'native'` as the only explicit `syncMode` value.
- Update CLI messages, docs, architecture notes, and tests that currently describe prompt/native dual-mode support.
- Add regression coverage for implicit file-target syncing and native-only explicit mode handling.

### Out of Scope
- Reworking the managed-section render/write implementation itself.
- Changing target presets (`agentsmd`, `claude`, `cursor`, `aider`) away from file targets.
- Introducing a replacement public mode string such as `file` or `managed`.

---

## Context and Constraints

### Background
`skillz sync` still models target syncing as a dual-mode system: `prompt` writes a managed section into a target file and `native` copies skill directories into a target directory. Product direction has changed and prompt mode is no longer a supported option. The codebase still exposes `prompt` in schema validation, type definitions, resolution helpers, dry-run messaging, README examples, CLAUDE/design docs, and an integration test for mixed prompt/native targets.

### Current State
- File-target syncing is still the baseline product path used by presets and by integration tests that call `skillz init --preset agentsmd` and `skillz sync`.
- `src/core/config.ts` resolves sync mode as `target.syncMode ?? config.syncMode ?? 'prompt'`.
- `src/commands/sync.ts` branches on the resolved mode and treats every non-`native` target as file-managed writing.
- `src/utils/validation.ts` and `src/types/index.ts` still advertise `'prompt' | 'native'`.
- Docs in `README.md`, `CLAUDE.md`, and `docs/project/architecture/current/flow-sync.md` still describe prompt mode as a supported/default configuration.

### Required Pre-Read
- `src/core/config.ts`
- `src/utils/validation.ts`
- `src/commands/sync.ts`
- `src/core/target-manager.ts`
- `tests/integration/sync.test.ts`
- `tests/integration/native-sync.test.ts`
- `README.md`

### Constraints
- Existing configs that omit `syncMode` for file targets must continue to work.
- Existing configs that explicitly set `syncMode: "native"` must continue to work.
- Existing configs that explicitly set `syncMode: "prompt"` should fail validation rather than silently persisting deprecated config.
- The validation failure must include migration guidance so users know the exact replacement config shape.
- User-facing docs should stop presenting prompt/native as equivalent peer modes.
- Scope should stay tight: remove the option and terminology, do not redesign sync semantics.

### Non-obvious Dependencies or Access
- Integration tests use mock workspaces that assume `AGENTS.md` file syncing remains functional.
- Internal design docs reference the old terminology and need targeted updates to avoid drift after implementation.

### Context Triage Gate

| Value / Flag | Source of Truth | Representation | Initialization Point | Snapshot / Capture Point | First Consumer | Initialized Before Consumer? |
| --- | --- | --- | --- | --- | --- | --- |
| Target-level `syncMode` | `skillz.json` target entry | optional string | config parse | `loadConfig()` result | `resolveTargetSyncMode()` / sync orchestration | Yes |
| Global `config.syncMode` | `skillz.json` root field | optional string | config parse | `loadConfig()` result | `resolveTargetSyncMode()` | Yes |
| Resolved sync behavior | `resolveTargetSyncMode()` | derived mode | per-target sync loop | sync dry-run + execution branch | `syncCommand()` | Yes |
| Target destination kind | `targets[].destination` | file or directory path string | config parse | sync loop iteration | `writeTargetFile()` / `copySkillsToTarget()` | Yes |
| `deleteExistingFromTarget` guard | `skillz.json` target entry | optional boolean | config parse | pre-sync validation | `syncCommand()` guard + `copySkillsToTarget()` | Yes |

No ordering issue was found. The change is a state-model simplification, not a temporal initialization bug.

---

## Approach and Touchpoints

### Proposed Approach
Keep the runtime behavior split between managed-file syncing and native directory syncing, but collapse the public mode model so only `native` is explicit. File-target syncing becomes the implicit default path when `syncMode` is absent. Implement this by narrowing schema/types, changing sync-mode resolution to default to an internal file-managed state, updating CLI copy, and rewriting tests/docs that mention prompt mode.

There is no destination-path inference in this change. Omitting `syncMode` always means managed-file sync. Directory-copy behavior still requires explicit `syncMode: "native"`. Destination/mode mismatch heuristics remain out of scope for this task.

### Integration Points / Touchpoints
- `src/types/index.ts`: narrow `syncMode` on `Target` and `Config`.
- `src/utils/validation.ts`: reject `prompt`; remove prompt default from schema.
- `src/core/config.ts`: change default resolution away from `'prompt'`; ensure presets still create file targets without `syncMode`.
- `src/commands/sync.ts`: rename prompt-target handling and dry-run messaging to file-target terminology.
- `README.md`: remove prompt-mode configuration examples and mixed prompt/native wording.
- `CLAUDE.md`: update architecture/config docs to describe default managed-file sync plus optional native mode.
- `docs/project/architecture/current/flow-sync.md`: update flow language from prompt/native to file/native.
- `tests/integration/native-sync.test.ts`: replace mixed prompt/native coverage with implicit file-target plus native-target coverage.
- `tests/integration/sync.test.ts`: preserve coverage that file-target syncing still works without explicit mode.

### Resolved Ambiguities / Decisions
- Interpretation of “remove prompt mode”: remove the public config value and terminology, not the managed-file sync behavior itself.
- Replacement API shape: do not introduce a new public string such as `file`; omitted `syncMode` means managed-file sync.
- Backward compatibility policy: explicit `syncMode: "prompt"` becomes invalid config. This is acceptable because the request is to stop supporting prompt mode rather than silently alias it.
- Migration contract: validation must say `syncMode "prompt" is no longer supported. Remove syncMode for file targets or set syncMode to "native" for directory targets.` The README should show both the before and after shape implicitly through updated examples.
- Compatibility rule: this task does not infer file-vs-directory behavior from `destination`; omission means file sync, explicit `native` means directory sync.

### Important Implementation Notes
- Internal helpers may still need a derived branch value for readability, but the string `'prompt'` should disappear from code and tests.
- The branch that writes managed sections should remain the default path for all non-native targets.
- Dry-run and info output should describe “file targets” or “managed file targets”, not prompt targets.
- Prompt rejection must be covered by an automated test, not only manual validation.

---

## Acceptance Criteria

- [x] The configuration schema and TypeScript types no longer accept or advertise `syncMode: "prompt"`.
- [x] Running `skillz sync` with file targets and no explicit `syncMode` still writes the managed section to those target files.
- [x] Running `skillz sync` with `syncMode: "native"` still copies skill directories and preserves native-specific safeguards such as conflict validation and `deleteExistingFromTarget`.
- [x] Running `skillz sync` with `syncMode: "prompt"` fails validation with the documented migration message.
- [x] Documentation and internal architecture notes in `README.md`, `CLAUDE.md`, and `docs/project/architecture/current/flow-sync.md` no longer describe prompt mode as a supported option or default.
- [x] Automated tests cover the implicit file-target path, the remaining explicit native mode path, and rejected prompt configs.

---

## Phases and Dependencies

### Phase 1: Narrow the Mode Model
- [x] Remove `'prompt'` from public types and config validation.
- [x] Update sync-mode resolution to default to managed-file behavior without a public `prompt` value.
- [x] Adjust sync command copy and guards to use file/native terminology.

### Phase 2: Update Tests
- [x] Replace prompt-specific assertions with implicit file-target assertions.
- [x] Keep native-mode regression coverage intact.
- [x] Add or update config validation coverage for rejected `prompt` values and the migration message.

### Phase 3: Update Docs
- [x] Rewrite README sync-mode sections and config examples.
- [x] Update internal docs (`CLAUDE.md`, `docs/project/architecture/current/flow-sync.md`) to match the new model.

### Phase 4: Verify
- [x] Run targeted tests for sync and init behavior.
- [x] Run full project validation (`npm test`, plus lint/format checks as needed).

### Phase Dependencies
- Phase 1 must land before test rewrites so assertions match final behavior.
- Phase 2 should complete before doc finalization so docs describe verified behavior.
- Phase 4 depends on all code, test, and doc updates being in place.

---

## Validation Plan

Integration tests:
- Run `npm test -- --runInBand tests/integration/sync.test.ts` to confirm managed-file syncing still works with omitted `syncMode`.
- Run `npm test -- --runInBand tests/integration/native-sync.test.ts` to confirm native syncing still works and mixed file/native targets still function without explicit `prompt`.
- Run `npm test -- --runInBand tests/integration/init.test.ts` to confirm presets still initialize file targets correctly.

Unit tests:
- Add or update config validation coverage so `syncMode: "prompt"` rejection and its migration message are automated, not optional.

Manual validation:
- Create a config with `targets: [{ "destination": "AGENTS.md" }]` and confirm `skillz sync` updates the file.
- Create a config with `targets: [{ "destination": ".skills", "syncMode": "native" }]` and confirm `skillz sync` copies directories.
- Try `syncMode: "prompt"` in `skillz.json` and confirm the CLI rejects it with the documented migration message.

### Separate Validation Spec
- `docs/project/specs/active/validation-2026-03-10-remove-prompt-mode.md`

---

## Done Criteria

- [x] Implementation is complete and matches the acceptance criteria.
- [x] Validation results are captured in the paired validation spec or test output summary.
- [x] Relevant docs and architecture notes have been updated to remove prompt-mode references.

---

## Open Items and Risks

### Open Items
- [ ] Confirm whether a dedicated validation/config test is still worthwhile once integration coverage for rejected `prompt` config is in place.

### Risks and Mitigations

| Risk | Impact | Probability | Mitigation |
| --- | --- | --- | --- |
| Existing users still have `syncMode: "prompt"` in config files and encounter a hard failure after upgrade | Med | Med | Keep the rejection message prescriptive and show the replacement config shape in README examples |
| Refactoring terminology accidentally changes runtime behavior for file targets | High | Low | Preserve `sync.test.ts` coverage and add mixed file/native coverage without explicit `prompt` |
| Internal docs remain stale and continue to describe unsupported behavior | Low | Med | Update the required doc set in the same change and run a repo grep over touched files for sync-mode prompt references |

### Simplifications and Assumptions
- File-target syncing remains part of the product and does not need a new explicit mode label.
- Removing prompt mode does not require cache format changes because cache behavior is already shared across sync paths.

## Outputs

- PR created from this spec: Not started

## Manual Notes 

[keep this for the user to add notes. do not change between edits]

## Changelog
- 2026-03-10: Created feature spec for removing prompt mode while preserving implicit file-target sync (`019cbc96-c95b-70f2-9ce6-b811a5f2fd32`)
- 2026-03-10: Applied review feedback, implemented the change, and recorded verification results (`019cbc96-c95b-70f2-9ce6-b811a5f2fd32`)
