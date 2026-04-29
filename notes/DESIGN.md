# Skillz Design

## Overview

Skillz keeps Claude-compatible skills synchronized as filesystem skill
directories. It discovers source directories that contain `SKILL.md`, parses
frontmatter, tracks change hashes, and copies the full skill directory into
configured target directories such as `.skills`.

## Goals

- Make skills usable across tools that understand filesystem skills.
- Keep skill sources in user-controlled directories.
- Support recursive discovery, include filters, ignore filters, and root-skill
  sources.
- Use a cache so no-op sync runs are fast.
- Keep target writes directory-based and predictable.

## Configuration

```json
{
  "version": "2.0",
  "preset": "agentsmd",
  "targets": [
    {
      "destination": ".skills",
      "deleteExistingFromTarget": true
    }
  ],
  "skillDirectories": [
    {
      "localPath": ".claude/skills",
      "include": ["python-expert"],
      "ignore": ["experimental-*"]
    }
  ],
  "additionalSkills": [],
  "ignore": [],
  "defaultEditor": "code",
  "autoSyncAfterEdit": true
}
```

### Targets

Targets are directories. During sync, each skill is copied to:

```text
<target.destination>/<skill.name>
```

`deleteExistingFromTarget` removes stale copied skill directories before
copying the current skill set. It only deletes directories that contain
`SKILL.md`.

### Skill Sources

`skillDirectories` entries can be:

- Normal source roots scanned one directory level at a time, recursively.
- `syncFromRoot` entries where the root itself must contain `SKILL.md`.
- Filtered by `include` and `ignore`.

`additionalSkills` is kept as a shorthand for extra local source roots.

## Commands

### `skillz init`

Creates `skillz.json` in the current working directory. Presets all use `.skills`
as the default target directory.

Supported presets:

- `agentsmd`
- `aider`
- `cursor`
- `claude`

### `skillz sync`

Sync flow:

1. Load and validate `skillz.json`.
2. Scan skill sources.
3. Parse `SKILL.md` frontmatter and body.
4. Compute per-skill hashes from `name`, `description`, and `content`.
5. Compare against `.skillz-cache.json`.
6. Validate target directory conflicts.
7. Copy each skill directory into each target directory.
8. Write the updated cache.

Options:

- `--dry-run`
- `--force`
- `--verbose`
- `--only <skill-name>`

### `skillz watch`

Watches skill sources and `skillz.json`, then runs `sync` after debounced
changes. Config edits refresh the watched roots without restarting.

### `skillz create`

Creates a new skill source directory. Interactive mode uses
`src/templates/skill-interactive.hbs` to generate the initial `SKILL.md`.

### `skillz edit`

Finds a skill, opens it in the configured editor, and optionally syncs after the
editor exits.

### `skillz list`

Lists parsed skills in table, JSON, or markdown form.

## Core Modules

- `src/cli.ts`: Commander entrypoint.
- `src/commands/init.ts`: Config creation, preset handling, environment detection.
- `src/commands/sync.ts`: Sync orchestration, change detection, dry-run output.
- `src/commands/watch.ts`: Debounced watch loop over source roots and config.
- `src/core/config.ts`: Config load/save/validation and legacy target migration.
- `src/core/skill-scanner.ts`: Source traversal, filters, duplicate-name checks.
- `src/core/skill-parser.ts`: `SKILL.md` frontmatter parsing and validation.
- `src/core/change-detector.ts`: Cache diffing by skill hash.
- `src/core/cache-manager.ts`: `.skillz-cache.json` persistence.
- `src/core/skill-target-manager.ts`: Target conflict validation and directory copy.
- `src/core/skill-template-generator.ts`: New-skill `SKILL.md` generation.
- `src/utils/fs-helpers.ts`: Filesystem helpers and atomic file writes.
- `src/utils/hash.ts`: Skill and config hash helpers.
- `src/utils/validation.ts`: Zod schemas.

## Data Model

```ts
interface Target {
  destination: string;
  deleteExistingFromTarget?: boolean;
}

interface SkillDirectory {
  localPath: string;
  remotePath?: string;
  syncFromRoot?: boolean;
  include?: string[];
  ignore?: string[];
}

interface Config {
  version: string;
  preset?: 'agentsmd' | 'aider' | 'cursor' | 'claude';
  targets: Target[];
  skillDirectories: SkillDirectory[];
  additionalSkills: string[];
  ignore: string[];
  defaultEditor?: string;
  autoSyncAfterEdit?: boolean;
}
```

## Cache Model

`.skillz-cache.json` stores:

- cache version,
- last sync timestamp,
- first target destination,
- config hash,
- one cache entry per `skill.relativePath`.

Skill hashes intentionally use only `SKILL.md` parsed values:

```text
sha256(skill.name + ":" + skill.description + ":" + skill.content).slice(0, 12)
```

Other files in a skill directory are copied during sync but do not currently
contribute to change detection.

## Target Copy Rules

Before copying, `validateSkillTargets` checks every planned destination:

- Cached copied skill paths may be overwritten.
- Existing directories that contain `SKILL.md` may be overwritten.
- Existing non-skill paths block the whole sync before any copies occur.

During copying:

- The target directory is created if missing.
- Existing `target/<skill.name>` is removed.
- The full source skill directory is copied.
- Self-copy is skipped when source and destination resolve to the same path.

## Migration

The supported legacy migration is intentionally narrow:

- Config version `1.0` becomes `2.0`.
- String targets become `{ "destination": "<value>" }`.
- Old `{ "name": "<value>" }` target objects become `{ "destination": "<value>" }`.
- String `skillDirectories` become `{ "localPath": "<value>" }`.

Removed file-rendering fields are not preserved.

## Testing

Integration tests under `tests/integration/` are the primary coverage.

Important suites:

- `sync.test.ts`: Sync behavior, cache behavior, filters, dry-run, stale cleanup.
- `target-sync.test.ts`: Target conflict detection and directory-copy semantics.
- `init.test.ts`: Preset config creation and initial sync.
- `watch.test.ts`: Debounced sync and config-driven watch root refresh.
- `environment-detector.test.ts`: Workspace marker detection.

Run:

```bash
npm run build
npm test
npm run lint
```

Do not run `npm run precommit`.

## File Layout

```text
src/
  cli.ts
  commands/
  core/
    cache-manager.ts
    change-detector.ts
    config.ts
    environment-detector.ts
    skill-target-manager.ts
    skill-parser.ts
    skill-scanner.ts
    skill-template-generator.ts
  templates/
    skill-interactive.hbs
  utils/
tests/
  helpers/
  integration/
```
