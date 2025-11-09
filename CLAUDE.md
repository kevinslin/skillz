# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Skillz is a TypeScript CLI that scans Claude Agent Skills (SKILL.md files) and syncs them to various LLM tool configuration files (AGENTS.md, .cursorrules, etc.). It's designed to make Claude skills usable across any LLM development environment.

**Current Status:** MVP with `init`, `sync`, `list`, and `create` commands implemented (~75% complete). Commands remaining: `validate`, `config`, `watch`, `clean`.

**📋 See TODO.md for comprehensive, up-to-date task list and implementation status.**

## Essential Commands

### Development

```bash
npm run build          # Compile TypeScript + copy Handlebars templates to dist/
npm run dev           # Run CLI in watch mode via tsx
npm test              # Full build + Jest test suite
npm run test:watch    # Jest in watch mode
npm test -- <file>    # Run specific test file (e.g., sync.test.ts)
npm run lint          # Run ESLint
npm run format        # Run Prettier
```

### Testing the CLI

```bash
# After building, test commands locally:
node dist/cli.js init --preset agentsmd --no-sync
node dist/cli.js create test-skill "A test skill description"
node dist/cli.js sync --dry-run --verbose
```

### Current Implementation

**See TODO.md for the comprehensive, up-to-date task list and implementation status.**

Quick summary:
- ✅ `init` - Initialize skillz.json with presets (agentsmd, aider) or no-target mode
- ✅ `sync` - Scan skills and update target files with managed sections
- ✅ `list` - Display available skills (table, json, markdown formats)
- ✅ `create` - Create new skill with template (name normalization, version support)
- ❌ `validate` - Validate config and skill files (TODO)
- ❌ `config` - View/modify config (TODO)
- ❌ `watch` - Auto-sync on file changes (TODO)
- ❌ `clean` - Remove managed sections (TODO)

## Architecture

### Data Flow

```
1. Config (skillz.json) → specifies targets & skill directories
2. Scanner (skill-scanner.ts) → finds all SKILL.md files
3. Parser (skill-parser.ts) → extracts frontmatter + content
4. Cache (.skillz-cache.json) → stores hashes for change detection
5. Change Detector → compares current skills vs cached
6. Template Engine → renders skills via Handlebars
7. Target Manager → injects managed section into target files
```

### Core Module Responsibilities

**src/core/config.ts**

- Loads/saves/validates `skillz.json`
- `getDefaultConfig(preset)` - Returns preset configs (agentsmd, aider)
- `inferConfig(cwd)` - Auto-detects existing targets and skill dirs
- `detectExistingConfig(cwd)` - Checks if skillz.json already exists

**src/core/skill-scanner.ts**

- `scanDirectory(dir, ignore)` - Finds skill directories, applies glob ignore patterns
- `scanAllSkillDirectories(config)` - Scans all configured directories
- Uses minimatch for glob patterns (e.g., `*.test`, `experimental-*`)

**src/core/skill-parser.ts**

- `parseSkill(skillDir)` - Extracts YAML frontmatter (name, description) from SKILL.md
- `validateSkill(skill)` - Ensures required fields present
- Uses gray-matter for frontmatter parsing

**src/core/change-detector.ts**

- `detectChanges(skills, cache)` - Compares SHA-256 hashes to identify new/modified/removed skills
- `hasChanges()` - Quick check if any changes exist
- `summarizeChanges()` - Counts by change type

**src/core/cache-manager.ts**

- Manages `.skillz-cache.json` for change detection
- Stores skill hashes, paths, last modified timestamps
- Cache format validated via Zod schema

**src/core/template-engine.ts**

- `renderSkills(skills, config, cwd)` - Renders skills via Handlebars templates
- Default templates in `src/templates/*.hbs`
- `skills-list.hbs` - Renders skill links (default)
- `skills-full.hbs` - Embeds full skill content (when includeInstructions: true)

**src/core/target-manager.ts**

- `writeTargetFile(target, skills, config, cwd)` - Injects managed section
- `extractManagedSection()` - Finds section by heading name
- `replaceManagedSection()` - Replaces content from section heading to EOF
- Managed section format:
  - Starts with configurable heading (e.g., `## Additional Instructions`)
  - Contains rendered skill content from templates
  - Extends to end of file
  - Content before the section heading is preserved

**src/utils/fs-helpers.ts**

- `safeReadFile()` / `safeWriteFile()` - Atomic file operations (temp file + rename)
- `isSkillDirectory()` - Checks if directory contains SKILL.md
- `readDirectories()` - Lists subdirectories

**src/utils/hash.ts**

- `calculateSkillHash(skill)` - SHA-256 hash of frontmatter + content
- Used for change detection

**src/utils/logger.ts**

- Uses chalk for colors, ora for spinners, cli-table3 for tables
- `spinner()`, `info()`, `success()`, `warning()`, `error()`, `debug()`

### Type System

**Key interfaces (src/types/index.ts):**

- `Skill` - Parsed skill with name, description, content, path, hash
- `Config` - skillz.json structure with targets, directories, preset, ignore patterns
- `CacheFile` - .skillz-cache.json structure with skill metadata
- `SkillChange` - Change detection result (new/modified/removed)

All validated via Zod schemas in `src/utils/validation.ts`.

## Testing Strategy

**Integration tests are primary** (tests/integration/) - they spawn the actual CLI and test end-to-end behavior.

**Test helpers:**

- `createMockWorkspace()` (tests/helpers/workspace.ts) - Creates temp directory with realistic fixtures (python-expert, react-patterns skills, AGENTS.md)
- `execCli()` (tests/helpers/cli.ts) - Spawns CLI process, captures stdout/stderr/exitCode

**Example test pattern:**

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

  const content = await fs.readFile(workspace.agentsFile, 'utf-8');
  expect(content).toContain('## Additional Instructions');
  expect(content).toContain('Available Skills');
});
```

**Running tests:**

- `npm test` - Full suite (builds first)
- `npm test -- -u` - Update snapshots
- `npm test -- sync.test.ts` - Run specific file

**Known issues:**

- ESM modules (chalk v5) cause Jest parsing errors in unit tests → prefer integration tests
- Timestamp snapshots need periodic updates (use -u flag)

## Configuration Files

**skillz.json** (created by init command):

```json
{
  "version": "1.0",
  "preset": "agentsmd",
  "targets": ["AGENTS.md"],
  "skillDirectories": [".claude/skills"],
  "additionalSkills": [],
  "ignore": ["*.test", "experimental-*"],
  "includeInstructions": false,
  "autoSync": false
}
```

**.skillz-cache.json** (auto-generated by sync):

```json
{
  "version": "1.0",
  "lastSync": "2025-01-01T12:00:00Z",
  "targetFile": "AGENTS.md",
  "skills": {
    "python-expert": {
      "hash": "abc123...",
      "path": ".claude/skills/python-expert",
      "lastModified": "2025-01-01T11:00:00Z"
    }
  }
}
```

**tsconfig.json:**

- ES2022 modules with strict mode
- Imports must use `.js` extensions (ESM requirement)
- Compiled output to `dist/`

**jest.config.cjs:**

- Uses ts-jest with ESM preset
- Empty transformIgnorePatterns (transforms all node_modules to handle ESM)
- 10 second timeout for integration tests

## Common Workflows

### Adding a New Command

1. Create `src/commands/<name>.ts` with exported `<name>Command(options)` function
2. Register in `src/cli.ts` using Commander.js pattern
3. Create `tests/integration/<name>.test.ts` following existing patterns
4. Run `npm test` to verify
5. Update COMPLETION_STATUS.md

### Fixing Minimatch/Ignore Pattern Issues

The ignore patterns use minimatch glob syntax:

- Patterns match against **directory names only** (not full paths)
- `*.test` matches any directory ending in .test
- Use `.some()` with `minimatch(dirName, pattern, { dot: true })`
- See skill-scanner.ts lines 25-38 for reference implementation

### Handling ESM Import Issues

This project uses ES modules:

- All imports must include `.js` extension (e.g., `from './config.js'`)
- Third-party ESM-only modules (chalk, ora) can cause Jest issues
- Solution: Use integration tests that run compiled code, not unit tests with mocking

### Working with Templates

Templates are Handlebars files in `src/templates/`:

- `skills-list.hbs` - Default, renders skill links
- `skills-full.hbs` - Embeds full skill content

Build script copies templates to `dist/templates/` - must rebuild after template changes.

## Code Style

- TypeScript with strict mode enabled
- 2-space indentation, trailing commas
- Files: kebab-case (`skill-scanner.ts`)
- Exports: camelCase functions, PascalCase classes/types
- Prefer async/await over raw promises
- ESLint catches unused imports, unsafe any usage
- Run `npm run format` before committing

## Important Constraints

1. **Never remove backup functionality mentioned in README** - The README describes backup/rollback features that aren't implemented yet. These are planned features, don't remove them from docs.

2. **Atomic file writes** - Always use temp file + rename pattern (safeWriteFile) to prevent corruption.

3. **Preset behavior** - When `--preset` is specified, it should NOT be overwritten by auto-detection logic. See init.ts for proper if/else structure.

4. **Test isolation** - Each integration test must create its own workspace and clean up in afterEach.

5. Always run the `lint` and `testing` skill at the end of feature development

6. Update documentation after finishing a user facing modifiaction or architectural change

## Development Notes from AGENTS.md

From the project's own guidelines:

**Module Organization:**

- `src/cli.ts` - Commander.js entry point
- `src/commands/` - Command implementations
- `src/core/` - Domain logic (config, scanning, parsing, templating)
- `src/utils/` - Shared utilities (fs, hashing, logging, validation)
- `tests/integration/` - End-to-end CLI tests
- `tests/helpers/` - Test fixtures and utilities

**Commit Guidelines:**

- Imperative mood ("fix ignore glob handling")
- Scoped to one logical change
- Reference issues in commit bodies

**Testing Philosophy:**

- Integration tests over unit tests
- Test real CLI behavior via spawned processes
- Use temporary workspaces, clean up properly
- See `.claude/skills/testing/SKILL.md` for comprehensive testing guide
