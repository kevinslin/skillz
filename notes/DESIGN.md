# Skillz Design

## Overview

Skillz is a TypeScript CLI for discovering Claude-style `SKILL.md` directories and
copying them into native target directories such as `.skills/`.

The current design is native-only:

- Skills are authored in source directories like `.claude/skills/`
- `skillz sync` copies those skills into target directories
- Cache tracks both skill and config changes
- Legacy file-based prompt targets are rejected during config normalization

## Core Concepts

### Skills

- Each skill lives in a directory that contains `SKILL.md`
- Frontmatter includes at least `name` and `description`
- Skills can come from project-local, global, or additional configured paths

### Targets

- Targets are directories, not files
- Presets now default to `.skills`
- Copied output is flattened to `target/<skill-name>`

### Configuration

Example:

```json
{
  "version": "2.0",
  "preset": "agentsmd",
  "targets": [
    { "destination": ".skills" }
  ],
  "skillDirectories": [
    { "localPath": ".claude/skills", "ignore": ["experimental-*"] },
    { "localPath": "~/.claude/skills" }
  ],
  "additionalSkills": [],
  "ignore": ["*.test"],
  "defaultEditor": "vi",
  "autoSyncAfterEdit": true
}
```

Supported fields:

- `version`
- `preset`
- `targets[].destination`
- `targets[].deleteExistingFromTarget`
- `targets[].preset`
- `skillDirectories`
- `additionalSkills`
- `ignore`
- `defaultEditor`
- `autoSyncAfterEdit`

Removed from the supported surface:

- Legacy prompt-era config fields

## Commands

### `skillz init`

- Detects common workspace markers such as `AGENTS.md`, `.cursor/rules`, `CLAUDE.md`, and `.aider/conventions.md`
- Chooses a preset when appropriate
- Writes `skillz.json`
- Adds `.skillz-cache.json` and `.skills` to `.gitignore`
- Optionally runs an initial sync

### `skillz sync`

- Loads and normalizes config
- Scans skills
- Applies cache-based change detection
- Validates target directories
- Copies skills into each configured target

### `skillz create`

- Creates a new skill in a configured source directory
- Uses `src/templates/skill-interactive.hbs` for interactive generation

### `skillz list`, `edit`, `info`, `watch`

- `list` reports discovered skills
- `edit` opens a skill in the configured editor
- `info` reports config and counts
- `watch` debounces filesystem changes and re-runs `sync`

## Architecture

### Main Modules

- `src/core/config.ts`: normalize, validate, and persist config
- `src/core/skill-scanner.ts`: discover skill directories
- `src/core/skill-parser.ts`: parse frontmatter and content
- `src/core/change-detector.ts`: detect new/modified/removed skills
- `src/core/cache-manager.ts`: manage `.skillz-cache.json`
- `src/core/target-manager.ts`: validate target directories and copy skills
- `src/core/skill-template-generator.ts`: render interactive skill templates for `create`

### Supporting Utilities

- `src/utils/fs-helpers.ts`
- `src/utils/hash.ts`
- `src/utils/logger.ts`
- `src/utils/validation.ts`

## Sync Behavior

```text
load config
  -> normalize legacy config
  -> reject file targets such as AGENTS.md
scan skills
load cache
detect config and skill changes
validate target directories
copy skills into each target
write updated cache
```

### Conflict Handling

- Existing non-skill files or directories at `target/<skill-name>` abort sync
- Existing copied skill directories are safe to overwrite
- Existing target paths that are files abort sync before copy begins

### Cleanup

- `deleteExistingFromTarget` removes stale copied skills before the copy pass
- Without that flag, sync overwrites current skills but leaves unrelated directories alone

## Testing

Integration tests are the main safety net.

Important coverage areas:

- Native target copy behavior
- Conflict detection
- Config migration and rejection of legacy file targets
- Environment detection
- Create command regressions
- Watcher debounce behavior

## Open Questions

- Should stale copied skills be removed even without `deleteExistingFromTarget`?
- Should duplicate skill names become a hard error instead of a warning?
