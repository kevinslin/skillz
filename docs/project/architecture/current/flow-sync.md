# Sync Flow

Last updated: 2026-03-10

Maintenance: When revising this doc you must follow instructions in
@shortcut:revise-flow-doc.md.

## Overview

The sync command collects skills, checks whether anything changed, validates target
directories, and copies skills into each configured target. Sync is native-only.
When `deleteExistingFromTarget` is enabled, stale copied skill directories are
removed before the new copy pass.

**Related Documents:**
- `docs/project/architecture/current/flow-cache.md`

## Terminology

- **Target**: A directory entry in `skillz.json` that receives copied skills.
- **Native sync**: Copy skill directories into a destination directory.
- **Cache**: `.skillz-cache.json`, used to detect config and skill changes.
- **deleteExistingFromTarget**: Optional cleanup flag that removes stale copied
  skills before copying the current set.

## Flow

### Start: sync command invocation
- `src/commands/sync.ts`
```text
load config (skillz.json); exit if missing
scan skill directories and parse SKILL.md files
if two skills share the same folder name:
  keep the first discovered skill
  warn and skip later duplicates
if no skills:
  warn and return unless cache exists
apply --only filter if provided
load cache (.skillz-cache.json)
if not --force and cache exists:
  compute config hash
  detect skill changes vs cache
  if no config change and no skill change -> success and return
if --dry-run:
  print what would copy and return
```
**File(s)**: `src/commands/sync.ts`, `src/core/skill-scanner.ts`, `src/core/cache-manager.ts`, `src/core/change-detector.ts`

### Validate target directories
- `src/core/target-manager.ts`
```text
for each target:
  ensure target path is not an existing file
  for each skill:
    if target/<skill.name> exists and is not a skill directory and not in cache -> conflict
if any conflict -> throw and abort sync
```
**File(s)**: `src/commands/sync.ts`, `src/core/target-manager.ts`, `src/utils/fs-helpers.ts`

### Copy per target
- `src/commands/sync.ts`
```text
for each target:
  ensure target directory exists
  if deleteExistingFromTarget:
    list directories under target
    delete directories that contain SKILL.md but are not in the current skill set
  for each skill:
    remove existing target/<skill.name>
    copy source skill dir to target/<skill.name>
```
**File(s)**: `src/commands/sync.ts`, `src/core/target-manager.ts`

### Cache update
- `src/core/cache-manager.ts`
```text
after successful sync, write .skillz-cache.json with config hash + skill hashes
```
**File(s)**: `src/commands/sync.ts`, `src/core/cache-manager.ts`

## Architecture Diagram

```text
skillz sync
  |
  v
load config -> scan skills -> diff cache -> dry run?
  |
  v
validate target directories
  |
  v
for each target
  |-- optional stale cleanup
  |-- copy skill dirs
  v
update cache
```

## Future Considerations

### Open Questions
- Should duplicate skill names become a hard error instead of a warning?
- Do we need deterministic directory entry ordering to avoid non-repeatable "first wins" behavior?

### Potential Improvements
- Add a preflight report summarizing skipped duplicate skills with source directories.
- Offer a config option to fail fast when duplicate skill names are discovered.
