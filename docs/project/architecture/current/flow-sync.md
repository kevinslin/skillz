# Sync Flow

Last updated: 2026-01-07

Maintenance: When revising this doc you must follow instructions in
@shortcut:revise-flow-doc.md.

## Overview

The sync command collects skills, checks whether anything changed, and applies
updates to each configured target. It supports prompt mode (managed section in
a target file) and native mode (copies skill directories). When
`deleteExistingFromTarget` is enabled for a native target, stale skill
directories are removed before copying.

**Related Documents:**
- `docs/project/architecture/template-architecture.md`

## Terminology

- **Target**: An entry in `skillz.json` that receives synced skills.
- **Prompt mode**: Writes a managed section into a target file via templates.
- **Native mode**: Copies skill directories into a destination directory.
- **Managed section**: The section in a target file managed by Skillz.
- **deleteExistingFromTarget**: Native-only option that deletes stale skill
  directories under the target before copying.
- **Cache**: `.skillz-cache.json` used to detect changes and allow safe overwrites.

## Flow

### Start: sync command invocation
- `src/commands/sync.ts`
```text
load config (skillz.json); exit if missing
apply --path-style and --template overrides
if deleteExistingFromTarget is set on a non-native target -> error and exit
scan skill directories and parse SKILL.md files
if two skills share the same folder name:
  keep the first discovered skill
  warn and skip later duplicates
  scan order follows config.skillDirectories then additionalSkills (directory entry order per filesystem)
if no skills -> warn and return
apply --only filter if provided
load cache (.skillz-cache.json)
if not --force and cache exists:
  compute config hash
  detect skill changes vs cache
  if no config change and no skill change -> success and return
if --dry-run:
  print what would sync and return
```
**File(s)**: `src/commands/sync.ts`, `src/core/skill-scanner.ts`, `src/core/cache-manager.ts`, `src/core/change-detector.ts`

### Validate native targets
- `src/core/target-manager.ts`
```text
for each native target:
  for each skill:
    if path exists and is not a skill dir (SKILL.md) and not in cache -> conflict
if any conflict -> throw, sync aborts
```
**File(s)**: `src/commands/sync.ts`, `src/core/target-manager.ts`, `src/utils/fs-helpers.ts`

### Sync per target
- `src/commands/sync.ts`
```text
for each target:
  syncMode = resolveTargetSyncMode(target, config)
  if prompt:
    read target file and extract managed section
    validate no duplicate section headers
    render skills with template + pathStyle
    replace managed section or append if missing
  if native:
    ensure target directory exists
    if deleteExistingFromTarget:
      list directories under target
      delete directories that contain SKILL.md but are not in the current skill set
    for each skill:
      remove existing target/<skill.name>
      copy source skill dir to target/<skill.name>
```
**File(s)**: `src/commands/sync.ts`, `src/core/target-manager.ts`, `src/core/template-engine.ts`

### deleteExistingFromTarget behavior details
- `src/core/target-manager.ts`
```text
only allowed when syncMode is native (validated before scanning)
uses cleanupSkills passed from syncCommand (full scan, not --only)
checks directory names against skill names
only deletes directories that contain SKILL.md
removes with fs.rm({ recursive: true, force: true })
```
**File(s)**: `src/commands/sync.ts`, `src/core/target-manager.ts`, `src/utils/fs-helpers.ts`

### Cache update
- `src/core/cache-manager.ts`
```text
after successful sync, write .skillz-cache.json with config hash + skill hashes
```
**File(s)**: `src/commands/sync.ts`, `src/core/cache-manager.ts`

## Architecture Diagram

```
skillz sync
  |
  v
load config -> scan skills -> diff cache -> dry run?
  |
  v
validate native targets
  |
  v
for each target
  |-- prompt: render template -> write managed section
  |-- native: optional stale cleanup -> copy skill dirs
  v
update cache
```

## Future Considerations

### Open Questions
- Should duplicate skill names be a hard error instead of a warning in sync flow?
- Do we need deterministic directory entry ordering to avoid non-repeatable "first wins" behavior?

### Potential Improvements
- Add a preflight report summarizing skipped duplicate skills with their source directories.
- Offer a config option to prefer later duplicates or fail fast when collisions are detected.
