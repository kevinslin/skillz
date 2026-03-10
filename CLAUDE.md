# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Skillz is a TypeScript CLI that scans Claude Agent Skills (`SKILL.md`) and syncs them into native target directories such as `.skills/`.

If a `.skills/` directory exists in the repo, check it for additional local skills alongside any configured skill directories.

Current implementation status:

- `init`
- `sync`
- `list`
- `create`
- `edit`
- `info`
- `watch`

Still planned:

- `validate`
- `config`
- `clean`

## Essential Commands

```bash
npm run build
npm run dev
npm test
npm run lint
npm run format
```

CLI smoke tests:

```bash
node dist/cli.js init --preset agentsmd --no-sync
node dist/cli.js create test-skill "A test skill description"
node dist/cli.js sync --dry-run --verbose
```

## Architecture

### Data Flow

```text
1. skillz.json defines targets and skill directories
2. skill-scanner finds all SKILL.md directories
3. skill-parser extracts frontmatter and content
4. cache-manager loads .skillz-cache.json
5. change-detector compares current skills/config against cache
6. target-manager validates target directories and copies skill folders
7. cache-manager writes updated cache metadata
```

### Core Modules

`src/core/config.ts`

- Loads, normalizes, validates, and saves `skillz.json`
- Presets now default to `.skills`
- Rejects legacy file targets such as `AGENTS.md`

`src/core/skill-scanner.ts`

- Recursively finds skill directories
- Applies global and per-directory ignore rules
- Detects duplicate skill names and duplicate relative paths

`src/core/skill-parser.ts`

- Parses YAML frontmatter from `SKILL.md`
- Validates required skill metadata

`src/core/change-detector.ts`

- Detects new, modified, removed, and unchanged skills

`src/core/cache-manager.ts`

- Reads and writes `.skillz-cache.json`
- Stores config hash plus skill hashes and metadata

`src/core/target-manager.ts`

- Validates native target directories before copy
- Detects conflicts with non-skill files and directories
- Copies skill directories into flattened target output
- Removes stale skills when `deleteExistingFromTarget` is enabled

`src/core/skill-template-generator.ts`

- Used only by `skillz create`
- Renders `src/templates/skill-interactive.hbs`

### Utilities

`src/utils/fs-helpers.ts`

- Atomic file writes
- Directory existence checks
- Recursive directory copy helpers

`src/utils/hash.ts`

- Skill and config hashing for cache/change detection

`src/utils/logger.ts`

- Colored logs, spinners, and table output

## Configuration

Example `skillz.json`:

```json
{
  "version": "2.0",
  "preset": "agentsmd",
  "targets": [
    { "destination": ".skills" }
  ],
  "skillDirectories": [
    { "localPath": ".claude/skills" }
  ],
  "additionalSkills": [],
  "ignore": ["*.test"],
  "defaultEditor": "vi",
  "autoSyncAfterEdit": true
}
```

Notes:

- Targets are directories only.
- Legacy prompt-era config fields are no longer part of supported config.
- Legacy file destinations fail fast with a migration error.

## Testing Strategy

Integration tests are primary.

Important helpers:

- `createMockWorkspace()` in `tests/helpers/workspace.ts`
- `execCli()` in `tests/helpers/cli.ts`

Typical integration pattern:

```typescript
let workspace: MockWorkspace;

beforeEach(async () => {
  workspace = await createMockWorkspace();
});

afterEach(async () => {
  await workspace.cleanup();
});

it('should sync skills', async () => {
  const result = await execCli(['sync'], { cwd: workspace.root });
  expect(result.exitCode).toBe(0);
  expect(await fs.pathExists(path.join(workspace.root, '.skills/python-expert'))).toBe(true);
});
```

## Notes

- Build still copies `src/templates/*.hbs` because `skillz create` depends on `skill-interactive.hbs`.
- Config changes are part of change detection, so changing `skillz.json` triggers sync work without `--force`.
- Environment detection still uses markers like `AGENTS.md` and `CLAUDE.md`, but presets sync to `.skills`.
