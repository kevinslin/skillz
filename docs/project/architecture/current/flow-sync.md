# Sync Flow

Last updated: 2026-04-27

Maintenance: When revising this doc you must follow instructions in
@shortcut:revise-flow-doc.md.

## Overview

The sync command collects skills, checks whether anything changed, validates
target directories, and copies each skill directory into every configured
target. When `deleteExistingFromTarget` is enabled, stale copied skill
directories are removed before copying.

**Related Documents:**

- `docs/project/architecture/current/flow-cache.md`

## Terminology

- **Target**: An entry in `skillz.json` with a `destination` directory.
- **Source skill**: A directory discovered under `skillDirectories` or
  `additionalSkills` that contains `SKILL.md`.
- **Copied skill**: A target directory entry at `target/<skill.name>`.
- **deleteExistingFromTarget**: Option that deletes stale copied skill
  directories under the target before copying.
- **Cache**: `.skillz-cache.json` used to detect changes and allow safe
  overwrites of previously copied skills.

## Flow

### Start: sync command invocation

- `src/commands/sync.ts`

```text
load config (skillz.json); exit if missing
scan skill directories and parse SKILL.md files
if duplicate skill names are found:
  scanner warns and skips later duplicates
if no skills:
  warn
  if no cache -> return
  if cache exists -> continue so stale target output can be cleared
apply --only filter if provided
load cache (.skillz-cache.json)
if not --force and cache exists:
  compute config hash
  detect skill changes vs cache
  if no config change and no skill change -> success and return
if --dry-run:
  print which skills would copy to which target directories and return
```

**File(s)**: `src/commands/sync.ts`, `src/core/skill-scanner.ts`, `src/core/cache-manager.ts`, `src/core/change-detector.ts`

### Validate targets

- `src/core/skill-target-manager.ts`

```text
for each target:
  resolve destination directory
  for each skill:
    destPath = targetDir / skill.name
    if destPath exists and skill was already in cache -> allow overwrite
    else if destPath exists and contains SKILL.md -> allow overwrite
    else if destPath exists -> conflict
if any conflict -> throw, sync aborts before copying
```

**File(s)**: `src/commands/sync.ts`, `src/core/skill-target-manager.ts`, `src/utils/fs-helpers.ts`

### Sync per target

- `src/core/skill-target-manager.ts`

```text
for each target:
  ensure target directory exists
  if deleteExistingFromTarget:
    list directories under target
    delete directories that contain SKILL.md but are not in the current skill set
  for each skill:
    sourcePath = skill.path
    destPath = targetDir / skill.name
    if sourcePath and destPath resolve to the same path -> skip self-copy
    remove existing destPath
    copy source skill directory to destPath
```

**File(s)**: `src/commands/sync.ts`, `src/core/skill-target-manager.ts`, `src/utils/fs-helpers.ts`

### Cache update

- `src/core/cache-manager.ts`

```text
after successful sync, write .skillz-cache.json with config hash + skill hashes
if no targets are configured, skip cache write
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
for each target: optional stale cleanup -> copy skill dirs
  |
  v
update cache
```

## Future Considerations

### Open Questions

- Should duplicate skill names include a structured report listing both source directories?
- Do we need deterministic directory entry ordering for repeatable scan diagnostics?

### Potential Improvements

- Add a preflight report summarizing skipped duplicate skills.
- Offer a config option to prefer later duplicates or fail fast earlier during scanning.
