# CLAUDE.md

This file provides guidance to Claude Code when working with this repository.

## Project Overview

Skillz is a TypeScript CLI that scans Claude Agent Skills (`SKILL.md` files) and copies them into configured target directories such as `.skills`.
If a `.skills/` directory exists in the repo, check it for additional local skills alongside configured skill directories.

Current commands include `init`, `sync`, `list`, `create`, `edit`, and `watch`.

## Essential Commands

### Development

```bash
npm run build          # Compile TypeScript and copy template assets to dist/
npm run dev            # Run the TypeScript compiler in watch mode
npm test               # Full build plus Jest test suite
npm run test:watch     # Jest in watch mode
npm test -- <file>     # Run a specific test file
npm run lint           # Run ESLint
npm run format         # Run Prettier
```

Never run `npm run precommit`.

### Testing the CLI

```bash
node dist/cli.js init --preset agentsmd --no-sync
node dist/cli.js create test-skill "A test skill description"
node dist/cli.js sync --dry-run --verbose
```

## Architecture

### Data Flow

```text
1. Config (skillz.json) -> targets and skill source directories
2. Scanner (skill-scanner.ts) -> finds all SKILL.md files
3. Parser (skill-parser.ts) -> extracts frontmatter and content
4. Cache (.skillz-cache.json) -> stores hashes for change detection
5. Change Detector -> compares current skills and config against cache
6. Native Target Manager -> validates target directories and copies skills
7. Cache Manager -> writes updated cache after successful sync
```

The sync command detects both skill-file changes and `skillz.json` changes. Config edits trigger a sync path without needing `--force`.

### Core Modules

**src/core/config.ts**

- Loads, saves, validates, and migrates `skillz.json`.
- `getDefaultConfig(preset)` returns preset configs.
- `inferConfig(cwd)` detects `.skills` and known skill source directories.
- Legacy string targets and `name` targets migrate to `{ destination }` targets.

**src/core/skill-scanner.ts**

- Recursively finds skill directories at any nesting level.
- Applies global and per-source glob ignore rules.
- Computes `relativePath` and `sourceDirectory`.
- Warns on duplicate skill names and skips later duplicates because target layout is flattened.

**src/core/skill-parser.ts**

- Parses YAML frontmatter from `SKILL.md`.
- Validates required `name` and `description` fields.

**src/core/change-detector.ts**

- Compares SHA-256 skill hashes against cache.
- Reports new, modified, removed, and unchanged skills.

**src/core/cache-manager.ts**

- Manages `.skillz-cache.json`.
- Cache keys use `skill.relativePath`.
- Stores skill hash, path, relative path, last modified timestamp, and config hash.

**src/core/skill-target-manager.ts**

- `validateSkillTargets(targets, skills, cwd, cachedSkills)` validates conflicts before copying.
- `copySkillsToTarget(target, skills, cwd, cleanupSkills)` copies skill directories into target directories.
- Target layout is flat: `target/<skill.name>`.
- Existing copied skill directories can be overwritten.
- Existing non-skill files or directories at a destination block sync.
- `deleteExistingFromTarget` removes stale copied directories that contain `SKILL.md`.

**src/core/skill-template-generator.ts**

- Uses `src/templates/skill-interactive.hbs` to generate new `SKILL.md` files for interactive skill creation.

**src/utils/fs-helpers.ts**

- Provides atomic file writes, path existence checks, directory copies, and skill directory detection.

**src/utils/hash.ts**

- Hashes skills and config for change detection.

**src/utils/logger.ts**

- Provides spinners, structured log levels, colors, and tables.

## Type System

Key interfaces in `src/types/index.ts`:

- `Skill`: Parsed skill with metadata, source paths, content, timestamps, and hash.
- `Target`: `{ destination: string, deleteExistingFromTarget?: boolean }`.
- `Config`: `skillz.json` structure with targets, source directories, presets, ignore patterns, and editor settings.
- `CacheFile`: `.skillz-cache.json` structure.
- `SkillChange`: Change detection result.

Config and cache shapes are validated with Zod schemas in `src/utils/validation.ts`.

## Testing Strategy

Integration tests are primary. They spawn the compiled CLI and test end-to-end behavior.

Test helpers:

- `createMockWorkspace()` in `tests/helpers/workspace.ts` creates a temp workspace with realistic skill fixtures.
- `execCli()` in `tests/helpers/cli.ts` runs the CLI and captures stdout, stderr, and exit code.

Example test pattern:

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

  await expect(
    fs.pathExists(path.join(workspace.root, '.skills', 'python-expert', 'SKILL.md'))
  ).resolves.toBe(true);
});
```

Running tests:

- `npm test`: Full suite.
- `npm test -- -u`: Update snapshots.
- `npm test -- sync.test.ts`: Run a specific file.

Known issues:

- ESM modules can make unit-test mocking brittle, so prefer integration tests.
- Snapshot files may need updates when generated `SKILL.md` templates change.

## Configuration

`skillz.json` example:

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
      "localPath": ".claude/skills"
    }
  ],
  "additionalSkills": [],
  "ignore": ["*.test", "experimental-*"],
  "defaultEditor": "vi",
  "autoSyncAfterEdit": true
}
```

Target fields:

- `destination`: Directory that receives copied skill directories.
- `deleteExistingFromTarget`: Remove stale copied skill directories before copying the current skill set.

Important sync behaviors:

- Skills are recursively scanned from configured source directories.
- All skills are copied to the target using only `skill.name`.
- Duplicate skill names in different source directories warn and later duplicates are skipped.
- Existing skill directories at the target are overwritten for updates.
- Non-skill files or directories at the target block sync.

## Cache

`.skillz-cache.json` is generated by sync:

```json
{
  "version": "2.0",
  "lastSync": "2025-01-01T12:00:00Z",
  "targetFile": ".skills",
  "configHash": "9f8e7d6c5b4a",
  "skills": {
    "python-expert": {
      "hash": "abc123...",
      "path": ".claude/skills/python-expert",
      "relativePath": "python-expert",
      "lastModified": "2025-01-01T11:00:00Z"
    }
  }
}
```

The `targetFile` field name is retained in cache format even though it stores the first target destination.

## Common Workflows

### Adding a New Command

1. Create `src/commands/<name>.ts` with an exported `<name>Command(options)` function.
2. Register it in `src/cli.ts` using Commander.js.
3. Add integration tests in `tests/integration/<name>.test.ts`.
4. Run `npm test` and `npm run lint`.
5. Update active docs for user-facing behavior.

### Fixing Ignore Pattern Issues

- Ignore patterns use minimatch glob syntax.
- Patterns match directory names.
- `*.test` matches directories ending in `.test`.
- Use `minimatch(dirName, pattern, { dot: true })`.

### Handling ESM Imports

- All local imports must include `.js` extensions.
- Prefer integration tests against compiled code for CLI behavior.

### Working with Skill Creation Templates

`src/templates/skill-interactive.hbs` is used only for generating new `SKILL.md` files.
The build script copies template assets to `dist/templates/`, so rebuild after template changes.

## Code Style

- TypeScript strict mode.
- 2-space indentation and trailing commas.
- Files use kebab-case.
- Exports use camelCase functions and PascalCase types/classes.
- Prefer async/await.
- Run `npm run format` and `npm run lint` before committing.

## Important Constraints

1. Use `safeWriteFile` for project-owned config/cache writes.
2. Keep preset behavior explicit: `--preset` should not be overwritten by auto-detection.
3. Each integration test must create and clean up its own workspace.
4. Update documentation after user-facing or architectural changes.

## Repository Map

- `src/cli.ts`: Commander.js entry point.
- `src/commands/`: Command implementations.
- `src/core/`: Domain logic for config, scanning, parsing, caching, and target copying.
- `src/utils/`: Shared filesystem, hashing, logging, validation, and workspace helpers.
- `src/templates/`: Skill creation template assets.
- `tests/integration/`: End-to-end CLI tests.
- `tests/helpers/`: Test fixtures and utilities.
