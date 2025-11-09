# Architecture

## Purpose
Skillz CLI keeps Claude-compatible skill definitions synchronized across documentation targets (for example `AGENTS.md`). The tool discovers skills authored as `SKILL.md` files, validates their metadata, renders them through Handlebars templates, and maintains a managed section inside the chosen target files. The project is written in TypeScript, built as an ES module CLI, and leans on asynchronous filesystem primitives to interact with a user's workspace.

## High-Level Flow
1. **CLI bootstrap** (`src/cli.ts`) wires the `init` and `sync` commands with Commander.
2. **Configuration** is loaded or created (`src/core/config.ts`), producing a `Config` object that drives every subsequent operation.
3. **Skill discovery** (`src/core/skill-scanner.ts`) enumerates configured directories, applies ignore rules with glob-style matching (`minimatch`), and returns validated `Skill` models produced by the parser (`src/core/skill-parser.ts`).
4. **Change detection and caching** (`src/core/change-detector.ts`, `src/core/cache-manager.ts`) compares current skills with the last synced state to avoid unnecessary writes.
5. **Rendering & target updates** (`src/core/template-engine.ts`, `src/core/target-manager.ts`) render Handlebars templates and splice the managed section into each configured target file.
6. **Persistence & feedback** uses utilities (`src/utils`) for filesystem access, hashing, validation, and logging to present progress to the user.

The `init` command orchestrates config creation and optionally performs an initial `sync`; the `sync` command runs the complete pipeline described above.

## Command Layer
- `src/cli.ts` registers commands and global options. Each Commander action is wrapped in a try/catch to surface errors and exit with a non-zero status on failure.
- `src/commands/init.ts` builds or detects configuration, writes `skillz.json`, updates `.gitignore`, and optionally chains into `sync`.
- `src/commands/sync.ts` is the primary entry point for synchronization. It handles verbose logging, `--dry-run`, `--force`, and `--only` semantics before delegating to core services.

## Core Services
- **Configuration (`src/core/config.ts`)**: creates default presets, persists JSON config, and validates structure with zod-based rules in `utils/validation.ts`.
- **Skill Scanner (`src/core/skill-scanner.ts`)**: resolves `~`, lists directories, filters by glob ignore patterns via `minimatch`, checks for `SKILL.md`, and deduplicates skills while logging warnings.
- **Skill Parser (`src/core/skill-parser.ts`)**: parses frontmatter with `gray-matter`, validates it, extracts content, and computes a reproducible hash (`utils/hash.ts`) to support change tracking.
- **Target Manager (`src/core/target-manager.ts`)**: reads/writes the managed section, preserves user-authored content, and relies on the template engine to generate section bodies alongside metadata comments.
- **Template Engine (`src/core/template-engine.ts`)**: caches compiled Handlebars templates, chooses between summary and full-content templates based on `Config.includeInstructions`, and prepares relative paths for rendering.
- **Cache Manager (`src/core/cache-manager.ts`)**: loads, validates, and writes `.skillz-cache.json`, encapsulating the cached representation of synced skills.
- **Change Detector (`src/core/change-detector.ts`)**: compares skill hashes from the current scan against cached hashes to identify new, modified, removed, and unchanged skills for reporting and conditional syncing.

## Utilities & Cross-Cutting Concerns
- **Filesystem helpers (`src/utils/fs-helpers.ts`)**: provide resilient reads/writes, directory enumeration, atomic file updates, and tilde expansion.
- **Validation (`src/utils/validation.ts`)**: aggregates zod schemas for skills, configuration, and cache files to centralize input validation.
- **Logging (`src/utils/logger.ts`)**: wraps `chalk` and `ora` to provide leveled logging, spinners, and a global verbose toggle.
- **Hashing (`src/utils/hash.ts`)**: normalizes skill content and metadata into deterministic hashes that underpin change detection.

## Templates
Handlebars templates live in `src/templates/` and are bundled at build time. `skills-list.hbs` renders a concise summary, while `skills-full.hbs` inlines full instructions. Templates expect the `TemplateData` structure defined in `src/types/index.ts`.

## Data Models
`src/types/index.ts` defines the shared TypeScript interfaces (`Config`, `Skill`, `CacheFile`, `SkillChange`, etc.) that flow between all layers. These types mirror on-disk JSON schemas to keep runtime validation and compile-time safety aligned.

## Target File Structure
Managed sections start with a configurable heading and extend to the end of the file:
```markdown
## Additional Instructions

You now have access to Skills...
[comprehensive skill usage instructions]

### Available Skills

- [skill-name](path/to/SKILL.md): Description
```
`target-manager` finds the section by its heading name (default: `## Additional Instructions`) and replaces everything from that heading to EOF. Content before the heading is preserved.

## Testing Strategy
- **Integration tests** (`tests/integration`) exercise CLI commands end-to-end using temporary workspaces.
- **Unit-style tests** augment the coverage where isolated behavior matters (for example, `tests/core/skill-scanner.test.ts` verifies ignore glob handling). Jest with the `ts-jest` ESM preset powers the test harness.
- `tests/helpers/` contains utilities to set up disposable workspaces and run the CLI in child processes.

## Dependency Graph Snapshot
- CLI commands depend on core services.
- Core services consume utilities and shared types.
- Templates and Handlebars are only touched within the template engine.
- External dependencies: Commander (CLI), Inquirer (interactive prompts during `init` if extended), Handlebars (rendering), Gray-matter (frontmatter parsing), Minimatch (glob ignore rules), Chalk/Ora (UX), fs-extra (tests).

## Extensibility Notes
- **Adding commands**: follow the existing pattern in `src/cli.ts`, implement logic in `src/commands/`, and rely on core services to keep side effects consistent.
- **Custom templates**: extend `Config` to accept template paths (already partially supported) and reuse `renderTemplate`.
- **Additional skill sources**: update `Config` schema and `scanAllSkillDirectories` to include new discovery strategies; the change detector and cache manager automatically adapt through shared types.
- **Managed section evolution**: adjustments belong in `target-manager` and template files to ensure existing files continue to round-trip cleanly.

## Build & Distribution
`npm run build` compiles TypeScript to `dist`, copies template assets, and prepares the CLI entry (`dist/cli.js`). `prepublishOnly` runs the same pipeline to guarantee published artifacts are fresh.

## Runtime Expectations
- Requires Node.js 18+.
- Assumes `SKILL.md` files contain valid frontmatter (`name`, `description`) and stores state in `skillz.json` (config) and `.skillz-cache.json` (cache).
- Fails fast on invalid configuration or skill metadata, guiding users through logs and warnings emitted from the logger utility.
