# Feature Validation: Watch `skillz.json` for resyncs

## Purpose

This validation spec tracks the automated and manual checks for the `skillz watch`
config-change resync behavior.

**Feature Plan:** `docs/specs/active/2026-03-06-watch-skillz-config-resync.md`

**Implementation Plan:** `docs/specs/active/2026-03-06-watch-skillz-config-resync.md`

## Stage 4: Validation Stage

## Validation Planning

- Confirm that `skillz watch` reacts to `skillz.json` edits with the same debounce behavior used for skill file edits.
- Confirm that watcher roots are refreshed when config changes add or remove skill directories.

## Automated Validation (Testing Performed)

### Unit Testing

- None planned; the behavior is exercised through integration coverage around the long-running CLI command.

### Integration and End-to-End Testing

- Completed: `npm test -- watch.test.ts`
- Covered: editing `skillz.json` triggers a sync.
- Covered: a config change adds a new watched directory and a later edit inside that directory triggers another sync.
- Covered: removing a watched directory from config stops later edits in that directory from scheduling syncs.

### Manual Testing Needed

- Run `skillz watch` in a sample workspace with an initialized `skillz.json`.
- Edit a non-watch config field in `skillz.json` and confirm the watcher logs a config-driven sync and updates targets successfully.
- Edit `skillz.json` to add an existing directory to `additionalSkills`, then change a `SKILL.md` inside that directory and confirm a second sync runs without restarting the watcher.
- Edit `skillz.json` to remove that directory again, then change the removed `SKILL.md` and confirm no additional sync is scheduled.
- Confirm `Ctrl+C` still exits the watcher cleanly after the above steps.
