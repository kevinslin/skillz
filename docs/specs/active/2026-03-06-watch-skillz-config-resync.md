# Execution Plan: Watch `skillz.json` for resyncs

**Date:** 2026-03-06
**Status:** Completed

---

## Goal

Make `skillz watch` resync when `skillz.json` changes, and keep the active watch set aligned with any updated skill directory configuration.

---

## Context

### Background
`skillz watch` currently watches only the resolved skill directories from the startup config. If `skillz.json` changes while the command is running, no sync is triggered and newly configured directories are never added to the watcher.

### Current State
- `watchCommand` now watches both resolved skill directories and `skillz.json`.
- Each watch-triggered sync cycle uses one authoritative config snapshot to refresh watched roots and drive `syncCommand`.
- Integration coverage now verifies debounce behavior, config-triggered syncs, watcher root additions, and watcher root removals.

### Constraints
- Preserve the existing debounce and in-flight sync queueing behavior.
- Keep startup validation intact for missing config or missing initial watch roots.
- Avoid duplicate syncs when a config edit changes the watched directory set.

---

## Technical Approach

### Architecture/Design
- Add `skillz.json` itself to the watcher input set.
- Before each sync, reload config and refresh the watcher's directory roots so changes to `skillDirectories` or `additionalSkills` take effect without restarting the process.
- Use the same config snapshot for watched-root refresh and the sync itself.
- Diff normalized absolute watch roots so only additions/removals are applied to the watcher.

### Integration Points
- `src/commands/watch.ts` for watcher setup, watched-root refresh, and config-change-triggered sync scheduling.
- `src/core/config.ts` continues to be the source of truth for config reloads.
- `tests/integration/watch.test.ts` for config edit coverage.
- `README.md` for CLI behavior documentation.

### Resolved Ambiguities / Decisions
- Decision: a `skillz.json` change should trigger the same debounced sync path as a skill file change.
- Decision: watcher root refresh should happen immediately before syncing so the sync and future file watching use the latest config.
- Decision: one config snapshot per watch cycle is authoritative and is passed into `syncCommand`.
- Decision: startup behavior remains strict, and runtime config parse/validation failures remain fail-fast.
- Decision: stale late-arriving watcher events are filtered against the currently active root set so removed directories stop scheduling syncs.

---

## Steps

### Phase 1: Watch config changes
- [x] Include `skillz.json` in the initial watcher paths.
- [x] Track the currently watched root set separately from the config file path.
- [x] Reload config and refresh watched roots before each sync.

### Phase 2: Validate config-driven watcher updates
- [x] Add an integration test proving a `skillz.json` edit triggers a sync.
- [x] Extend coverage to show a newly added watched directory is observed after the config change.
- [x] Extend coverage to show a removed watched directory no longer schedules syncs.

### Phase 3: Docs and cleanup
- [x] Update the `skillz watch` README section to mention config edits also trigger syncs.
- [x] Mark completed plan items and keep validation references current.

**Dependencies between phases:**
- Phase 2 depends on Phase 1.
- Phase 3 depends on Phase 2.

---

## Testing

- `npm test -- watch.test.ts`

---

## Risks & Mitigations

| Risk | Impact | Probability | Mitigation Strategy |
|------|--------|-------------|---------------------|
| Refreshing watcher roots introduces duplicate syncs | Med | Low | Reuse the existing debounce/sync queue and only refresh roots inside the sync path |
| Config changes add missing directories that are not yet on disk | Low | Med | Preserve existing warnings for missing directories and refresh watcher roots on the next config edit |
| Invalid config during watch causes confusing failure | Med | Low | Reuse `loadConfig` validation and the existing fail-fast sync path so the error is explicit |

---

## Success Criteria

- [x] Editing `skillz.json` while `skillz watch` is running schedules and completes a sync.
- [x] Updating watched directories in `skillz.json` updates the live watcher without restarting the command.
- [x] Integration coverage demonstrates both config-triggered sync and directory-set refresh behavior.
- [x] README documents the expanded watch behavior.

---

## Outputs

- PR created from this spec: Not started

## Manual Notes 

[keep this for the user to add notes. do not change between edits]

## Changelog
- 2026-03-06: Created plan for `skillz watch` config-change resync support. (019cc690-8df4-71d2-8407-f61f6db5980f)
- 2026-03-06: Implemented config-triggered resyncs, authoritative per-sync config snapshots, and add/remove watch-root coverage. (019cc690-8df4-71d2-8407-f61f6db5980f)
