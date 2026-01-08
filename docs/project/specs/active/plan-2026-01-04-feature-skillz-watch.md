# Plan Spec: Skillz watch command

## Purpose

Define the execution plan to implement `skillz watch` for continuous syncing when
skill files change.

## Background

Skillz currently supports `init`, `sync`, `list`, `create`, `edit`, and `info` via
`src/cli.ts`, with sync orchestration in `src/commands/sync.ts`. The design doc in
`notes/DESIGN.md` specifies a `watch` command with debounced auto-sync and live
status updates. `chokidar` is already a dependency, and the core services needed for
sync (config loading, scanning, change detection, target updates) already exist.

## Summary of Task

Add a `skillz watch` command that monitors all configured skill directories and
automatically runs sync when changes are detected. The command should debounce rapid
changes (2 second delay), show live status updates, and accept `--interval <ms>` to
control polling interval (default: 1000).

## Backward Compatibility

**BACKWARD COMPATIBILITY REQUIREMENTS:**

- **Code types, methods, and function signatures**: DO NOT MAINTAIN (new command only;
  avoid breaking existing signatures)
- **Library APIs**: N/A (CLI-only change)
- **Server APIs**: N/A
- **File formats**: N/A (no changes to skill or config formats)
- **Database schemas**: N/A

## Stage 1: Planning Stage

**Requirements**
- Watch all directories from `config.skillDirectories` and `config.additionalSkills`.
- Trigger a sync run when any change is detected under those directories.
- Debounce changes with a 2s delay; burst changes should yield a single sync.
- Provide live status updates (watcher started, change detected, syncing, sync result).
- Support `--interval <ms>` polling interval with default `1000`.

**Non-goals**
- No new config fields or changes to `skillz.json` schema.
- No long-running daemon or background service management.
- No auto-reload on target file or `.skillz-cache.json` changes unless requested.

**Acceptance Criteria**
- `skillz watch` starts watching configured directories and logs status updates.
- Editing a `SKILL.md` (or any file under a skill directory) triggers a single sync
  after ~2 seconds of inactivity.
- `--interval 500` updates the watcher polling interval without errors.
- Command exits with a non-zero status when configuration is missing or invalid.

**Open Questions**
- [x] Should the watcher also respond to changes in `skillz.json` or templates?
    - No
- [x] Should we restrict events to `SKILL.md` only or treat any file change as a sync
      trigger?
    - Any file change
- [x] Desired behavior on sync errors: exit watch or keep watching and retry on next
      change?
    - Exit and notify user

## Stage 2: Architecture Stage

**Technical Approach**
- Add a new command module `src/commands/watch.ts` and register it in `src/cli.ts` with
  Commander.
- Use `ensureSkillzProjectCwd()` + `loadConfig()` to resolve the root and load
  configuration.
- Resolve watch paths using `resolveHome()` plus `path.resolve(cwd, ...)` for relative
  paths so global (`~/.claude/skills`) and local (`.claude/skills`) directories both
  work.
- Use `chokidar.watch()` with `ignoreInitial: true`. Enable polling with
  `usePolling: true` and `interval` set from `--interval`.
- Implement a debounce timer: when any event fires, reset a 2s timeout. When the timer
  fires, run a single sync.
- Prevent concurrent syncs: track `isSyncing` and `pendingSync` so any change during
  an active sync queues another pass.
- Reuse existing sync logic (prefer a shared helper or `syncCommand()` directly) to
  avoid duplicating scan/change detection/target updates.
- Use existing logger utilities (`info`, `success`, `warning`, `error`, `spinner`) for
  live status output.
- Handle `SIGINT`/`SIGTERM` to close watchers cleanly and log a final message.

**Relevant Code**
- Command registration: `src/cli.ts`
- Sync orchestration: `src/commands/sync.ts`
- Config + workspace: `src/core/config.ts`, `src/utils/workspace.ts`
- Skill scan: `src/core/skill-scanner.ts`
- Logging: `src/utils/logger.ts`

## Stage 3: Refine Architecture

**Reuse Opportunities**
- Use `ensureSkillzProjectCwd()` so watch runs relative to the project root.
- Use `loadConfig()` for config loading and validation.
- Reuse `syncCommand()` or extract a `runSync()` helper from `sync.ts` to share logic.
- Leverage existing logger/spinner helpers for consistent status output.

**Performance Checks**
- Watching only configured skill roots avoids unnecessary filesystem load.
- Debounce and single-threaded sync prevents sync storms from rapid changes.

**Simplifications**
- Keep implementation to a single sync pathway (no new sync modes).
- Use a single debounce timer for all events rather than per-directory timers.

## Stage 4: Implementation Stage

**Phase 1**
- [x] Add `watch` command in `src/cli.ts` with `--interval <ms>` option.
- [x] Create `src/commands/watch.ts` implementing:
  - watcher setup and path resolution
  - debounce + single-flight sync behavior
  - status logging and graceful shutdown
- [x] Reuse existing sync logic to execute on changes.
- [x] Add/adjust tests (unit or integration) to validate:
  - debounce behavior (single sync per burst)
  - error handling when config is missing
  - option wiring for `--interval`
- [x] Update docs/README if command list needs to mention `skillz watch`.

## Stage 5: Validation Stage

- [x] `npm run lint`
- [x] `npm test`
- [x] `npm test -- watch.test.ts`
- [ ] Manual smoke test:
  - Run `skillz watch` in a configured workspace.
  - Modify a `SKILL.md` and confirm a single sync after debounce.
  - Confirm `--interval` changes the watcher polling interval.

## Dependencies

- `chokidar` (already in `package.json`)

## Risks & Mitigations

- **Sync storms from multiple change events**: Use debouncing and single-flight sync.
- **Watcher fails on networked filesystems**: Offer `--interval` polling option and
  default to polling for stability.
- **Unexpected exit on recoverable sync errors**: Decide whether to exit or continue
  watching; document behavior.

## Notes

- Simplification: plan keeps a single implementation phase and reuses existing sync
  logic to minimize new surface area.
- Ran `npm run format`, `npm run lint`, and `npm test` as the precommit checklist since
  `npm run precommit` is not defined in `package.json`.
