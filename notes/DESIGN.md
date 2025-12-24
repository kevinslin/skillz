# Skillz - Universal LLM Skills CLI

## Overview

A TypeScript-based CLI tool that enables any LLM to understand and utilize Claude Agent Skills. The tool scans for Claude skills, transforms them into a format compatible with various LLM tooling (Claude Code, Cursor, Aider, etc.), and keeps them synchronized.

## Core Concepts

### Claude Skills Primer
- Skills are stored in `SKILL.md` files with YAML frontmatter
- Each skill has `name` and `description` metadata
- Skills live in `.claude/skills/` (project-local) or `~/.claude/skills/` (global)
- Use progressive disclosure: metadata → instructions → resources

### Cross-LLM Compatibility
Different LLM tools use different file paths for their configuration. Skillz uses the same markdown format for all targets:
- **Claude Code**: `AGENTS.md`
- **Cursor**: `.cursor/rules/skills.mdc`
- **Aider**: `.aider/conventions.md`
- **GitHub Copilot**: `.github/copilot-instructions.md`
- **Windsurf**: `.windsurfrules`
- **Continue**: `.continue/instructions.md`

All targets use the same managed section format with skill links.

## Recommended Design

### Configuration Schema

```typescript
// skillz.json
{
  "version": "1.0",
  "preset": "agentsmd", // Optional: agentsmd, aider
  "targets": [
    "AGENTS.md",
    ".cursor/rules/skills.mdc"
  ],
  "skillDirectories": [
    ".claude/skills",
    "~/.claude/skills"
  ],
  "additionalSkills": [
    "/custom/path/to/skills"
  ],
  "ignore": ["*.test", "experimental-*"],
  "template": "default", // Optional: default, readme, or path to .hbs file
  "pathStyle": "relative" // Optional: relative (default) or absolute
}
```

### Preset Configurations

Presets provide quick setup for common LLM tools:

**agentsmd:**
```json
{
  "preset": "agentsmd",
  "targets": ["AGENTS.md"]
}
```

**aider:**
```json
{
  "preset": "aider",
  "targets": [".aider/conventions.md"]
}
```

Users can start with a preset and customize further using `skillz config` or by editing `skillz.json` directly.

### Commands

#### `skillz init [options]`

Initializes skillz in the current directory.

**Behavior:**
1. Scans current directory and ancestors for target files (AGENTS.md, .cursor/rules/skills.mdc, etc.)
2. Detects existing `.claude/skills/` directories
3. Prompts user to confirm/customize detected configuration
4. Creates `skillz.json` with sensible defaults
5. Optionally runs initial sync

**Options:**
- `--preset <name>` - Use a preset configuration (agentsmd, aider)
- `--target <file>` - Specify custom target file path (e.g., AGENTS.md, .cursor/rules/skills.mdc)
- `--additional-skills <path>` - Add additional skill directories (repeatable)
- `--global-skills` - Include global ~/.claude/skills/ directory
- `--no-sync` - Skip initial sync after initialization
- `--template <path>` - Custom template for skill formatting
- `--include-instructions` - Include full skill instructions (default: false, links to skills instead)

**Presets:**
- `agentsmd` - Sets target to `AGENTS.md`
- `aider` - Sets target to `.aider/conventions.md`

**Examples:**
```bash
# Basic initialization - auto-detect everything
skillz init

# Initialize with agentsmd preset
skillz init --preset agentsmd

# Initialize with aider preset
skillz init --preset aider

# Initialize with custom target
skillz init --target .cursor/rules/skills.mdc

# Initialize with multiple skill sources
skillz init --preset agentsmd --additional-skills /path/to/company/skills --global-skills

# Initialize without syncing
skillz init --preset agentsmd --no-sync
```

#### `skillz create [options]`

Creates a new skill with optional interactive guidance.

**Modes:**

1. **Interactive Mode (Recommended):**
   ```bash
   skillz create --interactive
   # or
   skillz create -i
   ```

   Guides you through skill creation with prompts for:
   - Skill name and description
   - Detailed purpose/context
   - Tags for categorization
   - Sections to include (capabilities, guidelines, examples, anti-patterns)
   - Content for each section

   Generates well-structured SKILL.md with all requested sections.

2. **Quick Mode:**
   ```bash
   skillz create <name> <description>
   ```

   Creates minimal skill with just frontmatter. Requires manual editing to add content.

**Options:**
- `-i, --interactive` - Launch interactive mode with guided prompts
- `--path <directory>` - Custom directory path (overrides config)
- `--skill-version <semver>` - Skill version (default: 0.0.0)

**Interactive Prompt Flow:**
```
1. Skill name → validates and normalizes
2. Brief description → max 100 characters
3. Detailed purpose → single-line text, optional
4. Tags → comma-separated, optional
5. Sections → checkbox (capabilities, guidelines, examples, anti-patterns)
6. For selected sections:
   - Capabilities: iteratively add items
   - Guidelines: iteratively add items
   - Examples: placeholder added
   - Anti-patterns: placeholder added
7. Preview and confirm
```

**Examples:**
```bash
# Interactive mode (recommended for new skills)
skillz create --interactive

# Quick mode (requires manual editing)
skillz create python-expert "Expert Python assistance"

# Interactive with custom version
skillz create -i --skill-version 1.0.0

# Interactive with custom path
skillz create -i --path ~/.claude/skills

# Trigger interactive mode by omitting arguments
skillz create
```

**Generated Skill Structure (Interactive Mode):**
```markdown
---
name: python-testing
description: Expert pytest and testing best practices
version: 0.0.0
tags: [python, testing, pytest]
---

# Python Testing

Help write comprehensive test suites with pytest.

## Capabilities

- Write pytest fixtures for database testing
- Create parametrized tests for edge cases
- Mock external dependencies

## Guidelines

1. Use descriptive test names (test_should_xxx_when_yyy)
2. One assertion per test for clarity
3. Use fixtures for shared setup

## Examples

[Add your code examples here]
```

#### `skillz sync [options]`

Synchronizes skills from source directories to target files.

**Behavior:**
1. Reads `skillz.json` configuration
2. Scans all configured skill directories
3. Parses SKILL.md files and extracts frontmatter + instructions
4. Generates skill section using template
5. Updates target file(s) with skill information
6. Reports summary of changes

**Options:**
- `--dry-run` - Show what would be synced without making changes
- `--force` - Overwrite target even if manual edits detected
- `--verbose` - Show detailed operation logs
- `--only <skill-name>` - Sync only specific skill(s)
- `--path-style <style>` - Path style for skill links: relative, absolute (or shorthand: rel, abs)
- `--template <name>` - Template: default, readme, or path to .hbs file

**Examples:**
```bash
# Standard sync (uses default template with LLM instructions)
skillz sync

# Preview changes without applying
skillz sync --dry-run

# Sync specific skills only
skillz sync --only python-expert --only react-patterns

# Use minimal README template (no instructions, just links)
skillz sync --template readme

# Use custom template
skillz sync --template ./my-template.hbs

# Use absolute paths instead of relative
skillz sync --path-style absolute
```

**Target File Format:**

The sync command maintains a managed section in the target file:

```markdown
# Your custom agents configuration

... your custom content ...

## Additional Instructions

You now have access to Skills. Skills are specialized instruction sets stored as markdown files...
[comprehensive skill usage instructions]

### Available Skills

Below is the list of skills you can access. Load a skill by reading its SKILL.md file when the task matches:

- [python-expert](.claude/skills/python-expert/SKILL.md): Expert Python development assistance with best practices
- [react-patterns](.claude/skills/react-patterns/SKILL.md): Modern React patterns and best practices
- [typescript-helper](.claude/skills/typescript-helper/SKILL.md): TypeScript type safety and advanced patterns
```

The managed section starts at the configurable section heading (default: `## Additional Instructions`) and continues to the end of the file. Any content before this heading is preserved.

#### `skillz list [options]`

Lists all available skills from configured directories.

**Options:**
- `--format <format>` - Output format: table, json, markdown
- `--synced-only` - Only show skills present in target
- `--unsynced-only` - Only show skills not yet synced

**Examples:**
```bash
skillz list
skillz list --format json
skillz list --unsynced-only
```

#### `skillz watch`

Watches skill directories and auto-syncs on changes.

**Behavior:**
- Monitors all configured skill directories
- Auto-runs sync when changes detected
- Debounces rapid changes (2 second delay)
- Shows live status updates

**Options:**
- `--interval <ms>` - Polling interval (default: 1000)
- `--no-debounce` - Disable debouncing

#### `skillz clean [options]`

Removes the managed section from target file(s).

**Options:**
- `--dry-run` - Show what would be removed

#### `skillz validate`

Validates skill files and configuration.

**Checks:**
- `skillz.json` schema validity
- SKILL.md file format (frontmatter, required fields)
- Skill name format (lowercase, hyphens, max 64 chars)
- Description length (max 1024 chars)
- File permissions and accessibility
- Circular references or duplicates

**Output:**
```
Validating configuration...
✓ skillz.json is valid

Validating skills...
✓ python-expert (.claude/skills/python-expert/SKILL.md)
✗ Invalid-Name (.claude/skills/Invalid-Name/SKILL.md)
  - Skill name contains uppercase letters
✗ no-description (.claude/skills/no-description/SKILL.md)
  - Missing description in frontmatter

Found 2 errors, 1 warning
```

#### `skillz config [key] [value]`

View or modify configuration.

**Examples:**
```bash
# View all config
skillz config

# View specific key
skillz config targets

# Set value
skillz config defaultEditor vim

# Add to array
skillz config additionalSkills --add /new/path

# Remove from array
skillz config additionalSkills --remove /old/path
```

## Architecture

### Purpose
Skillz CLI keeps Claude-compatible skills synchronized across target documents such as `AGENTS.md`. It discovers `SKILL.md` files, validates metadata, renders entries through Handlebars templates, and maintains a managed section in each configured target. The implementation is a TypeScript ES-module CLI that leans on async filesystem helpers to respect a user’s workspace.

### High-Level Flow
1. **CLI bootstrap** (`src/cli.ts`) wires commands and shared flags through Commander.
2. **Configuration** (`src/core/config.ts`) loads or creates `skillz.json`, supplying a `Config` object to every command.
3. **Skill discovery** (`src/core/skill-scanner.ts`) walks configured directories, applies glob-based ignore rules, and yields parsed `Skill` models.
4. **Change detection & caching** (`src/core/change-detector.ts`, `src/core/cache-manager.ts`) compares current hashes to the last synced state to avoid unnecessary writes.
5. **Rendering & target updates** (`src/core/template-engine.ts`, `src/core/target-manager.ts`) build Handlebars output and splice the managed section into each target file.
6. **Persistence & feedback** leverage utilities in `src/utils/` for FS access, hashing, validation, and logging.

### Command Layer
- `src/cli.ts` registers commands and ensures failures exit with non-zero status.
- `src/commands/init.ts` detects or constructs configuration, writes `skillz.json`, updates `.gitignore`, and optionally runs `sync`.
- `src/commands/sync.ts` orchestrates synchronization, honoring `--dry-run`, `--force`, `--only`, and verbose logging before delegating to core services.

### Core Services
- **Configuration (`src/core/config.ts`)**: default presets, JSON persistence, and zod-backed validation.
- **Skill Scanner (`src/core/skill-scanner.ts`)**: tilde expansion, directory listing, glob ignores via `minimatch`, and deduplication with warnings.
- **Skill Parser (`src/core/skill-parser.ts`)**: parses frontmatter through `gray-matter`, validates required fields, and produces deterministic hashes via `src/utils/hash.ts`.
- **Template Engine (`src/core/template-engine.ts`)**: caches compiled Handlebars templates, prepares relative paths, and renders summaries or full instructions.
- **Target Manager (`src/core/target-manager.ts`)**: reads/writes managed sections while preserving custom content.
- **Cache Manager (`src/core/cache-manager.ts`)**: loads/validates `.skillz-cache.json` and persists sync metadata.
- **Change Detector (`src/core/change-detector.ts`)**: categorizes skills as new/modified/removed/unchanged to drive incremental updates.

### Utilities & Cross-Cutting Concerns
- **Filesystem helpers (`src/utils/fs-helpers.ts`)** provide resilient reads/writes, directory enumeration, tilde expansion, and atomic updates.
- **Validation (`src/utils/validation.ts`)** centralizes zod schemas for configs, skills, and cache files.
- **Logging (`src/utils/logger.ts`)** wraps `chalk`/`ora` for leveled logs and spinner UX.
- **Hashing (`src/utils/hash.ts`)** normalizes metadata + content into SHA-based hashes relied upon by change detection.

### Key Interfaces
#### Target File Management
```typescript
interface TargetFileManager {
  read(filePath: string): TargetContent;
  write(filePath: string, skills: Skill[], template?: string): void;
  extractManagedSection(content: string): ManagedSection | null;
  replaceManagedSection(content: string, newSection: string): string;
}
```
All targets share the same markdown format with delimited sections, so no adapters are needed—only file-path differences.

#### Skill Model & Parser
```typescript
interface Skill {
  name: string;
  description: string;
  path: string;
  content: string;
  frontmatter: Record<string, any>;
  lastModified: Date;
  hash: string;
}

class SkillParser {
  parse(skillPath: string): Skill;
  validate(skill: Skill): ValidationResult;
}
```

### Templates
Handlebars templates in `src/templates/` (e.g., `skills-list.hbs`, `skills-full.hbs`) accept the `TemplateData` shape from `src/types/index.ts`. The default template renders a bulleted list with links:

```handlebars
{{!-- Default template: skills-list.hbs --}}
## Additional Instructions
You can use skills. These are custom instructions that help you accomplish specific tasks. Your list of available skills below:

{{#each skills}}
- [{{name}}]({{path}}): {{description}}
{{/each}}
```

Users can provide custom templates via config or `--template`.

### Managed Section Structure
Managed sections start at a configurable heading (default `## Additional Instructions`) and extend to EOF:
```markdown
## Additional Instructions

You now have access to Skills...

### Available Skills

- [skill-name](path/to/SKILL.md): Description
```
`target-manager` locates the heading, replaces the trailing content, and preserves everything before it.

### Change Detection & Cache
Content hashing (SHA-256) drives incremental updates.

**Hash Storage**
```json
{
  "version": "1.0",
  "lastSync": "2025-11-05T10:30:00Z",
  "targetFile": "AGENTS.md",
  "configHash": "9f8e7d6c5b4a",
  "skills": {
    "python-expert": {
      "hash": "a1b2c3d4e5f6",
      "path": ".claude/skills/python-expert/SKILL.md",
      "lastModified": "2025-11-05T09:15:00Z"
    }
  }
}
```

**Hash Calculation**
```typescript
function calculateSkillHash(skill: Skill): string {
  const hashInput = `${skill.name}:${skill.description}:${skill.content}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 12);
}
```

**Flow**
1. Read cached hashes from `.skillz-cache.json`.
2. Calculate hash of current configuration (`skillz.json`).
3. Compare config hash to detect configuration changes.
4. Scan directories and compute current skill hashes.
5. Compare to classify skills (new/modified/removed/unchanged).
6. Regenerate content if either config or skills changed and update the cache file.

**Benefits**
- Avoids reading/writing unchanged targets.
- Captures any metadata or content change.
- Detects configuration changes (templates, targets, section names, etc.).
- Stores timestamps/paths for diagnostics.

**Cache File Management**
- Add to `.gitignore` so each developer tracks their own state (optional to commit).
- Automatically recreated if missing (treats all skills as new).
- `skillz clean` removes both the managed section and cache.

### Safety Features
- **Manual edit detection** surfaces warnings when the managed section drifts.
- **Atomic writes** rely on temporary files + rename to prevent corruption.
- **Validation gates** ensure configs/skills/templates parse cleanly before touching targets.
- **Dry-run support** exists on destructive commands.

### Dependency Graph Snapshot
- CLI commands depend on core services.
- Core services share types/utilities.
- Templates are consumed only through the template engine.
- External deps: Commander, Inquirer, Handlebars, Gray-matter, Minimatch, Chalk/Ora, fs-extra (tests).

### Extensibility Notes
- Adding commands follows the `src/cli.ts` + `src/commands/` pattern while reusing services.
- Custom templates plug into existing config/CLI flags.
- Supporting more skill sources only requires updating the config schema and scanner; change detection/cache automatically adjust through shared types.
- Managed section tweaks live inside `target-manager` + templates to maintain backwards compatibility.

### Build & Runtime Expectations
- `npm run build` compiles TS to `dist/`, copies template assets, and prepares `dist/cli.js`. `prepublishOnly` runs the same pipeline before publishing.
- Requires Node.js 18+.
- Assumes valid `SKILL.md` frontmatter (`name`, `description`) plus readable/writable `skillz.json` and `.skillz-cache.json`.
- Fails fast on invalid configuration or metadata, surfacing actionable errors through the logger.

## CLI Framework and Dependencies

Use **Commander.js** as the CLI framework along with these supporting libraries:
- `chalk` - Terminal colors
- `ora` - Spinners and progress
- `inquirer` - Interactive prompts
- `cli-table3` - Formatted tables
- `chokidar` - File watching
- `handlebars` - Template engine
- `gray-matter` - YAML frontmatter parsing
- `zod` - Runtime validation

## File Structure

```
skillz/
├── src/
│   ├── cli.ts                 # Entry point, command registration
│   ├── commands/
│   │   ├── init.ts
│   │   ├── sync.ts
│   │   ├── list.ts
│   │   ├── watch.ts
│   │   ├── clean.ts
│   │   ├── validate.ts
│   │   └── config.ts
│   ├── core/
│   │   ├── config.ts          # Config schema and management
│   │   ├── skill-parser.ts    # SKILL.md parsing
│   │   ├── skill-scanner.ts   # Directory scanning
│   │   ├── change-detector.ts # Hash-based change detection
│   │   ├── cache-manager.ts   # Cache file management
│   │   └── target-manager.ts  # Target file read/write operations
│   ├── templates/
│   │   ├── skills-list.hbs    # Default template (links only)
│   │   └── skills-full.hbs    # Full content template
│   ├── utils/
│   │   ├── fs-helpers.ts      # Safe file operations
│   │   ├── hash.ts            # Content hashing
│   │   ├── logger.ts          # Logging utilities
│   │   └── validation.ts      # Zod schemas
│   └── types/
│       └── index.ts           # TypeScript types
├── tests/
│   ├── unit/
│   ├── integration/
│   └── fixtures/
├── templates/                  # Default templates
├── .eslintrc.js
├── .prettierrc
├── tsconfig.json
├── package.json
└── README.md
```

## Testing Strategy

1. **Unit Tests**: Test each component in isolation
2. **Integration Tests**: Test command flows end-to-end
3. **Fixture-based Tests**: Use sample skills and configs
4. **Snapshot Tests**: Verify generated output format
5. **CLI Tests**: Test actual CLI invocations

## Distribution

### NPM Package
```bash
npm install -g skillz
```

### Binary Distribution
Use `pkg` or `ncc` to create standalone binaries for:
- macOS (arm64, x64)
- Linux (arm64, x64)
- Windows (x64)

## Security Considerations

1. **Path Traversal**: Validate all file paths
2. **Command Injection**: Sanitize any shell command execution
3. **File Permissions**: Check read/write permissions before operations
4. **Symlink Handling**: Resolve symlinks safely
5. **Config Validation**: Validate skillz.json against schema

## Future Enhancements

1. **Plugin System**: Allow custom adapters via plugins
2. **Remote Skills**: Fetch skills from URLs or package registries
3. **Skill Marketplace**: Discover and install community skills
4. **IDE Extensions**: VSCode/Cursor extensions for visual management
5. **CI/CD Integration**: GitHub Actions for auto-syncing
6. **Multi-workspace**: Support for monorepos with multiple skill configs
7. **Skill Dependencies**: Allow skills to depend on other skills
8. **Skill Testing**: Framework for testing skill effectiveness
9. **Analytics**: Track which skills are most used/effective

## Migration Path

For existing setups:
1. Detect existing AGENTS.md or .cursor/rules/skills.mdc
2. Parse existing skill sections (if any)
3. Preserve custom content outside managed sections
4. Gradually migrate to managed approach

## Open Questions

1. Should we support skill namespacing (e.g., `company/skill-name`)?
2. How to handle conflicting skills from different sources?
3. Should skills be able to declare incompatibilities?
4. What's the best way to handle skill versioning?
5. Should we support remote skill repositories (like git submodules)?

## Success Metrics

- Reduces time to set up skills across different LLM tools
- Maintains consistency across team members
- Prevents skill configuration drift
- Works reliably with all major LLM tools
- Clear, actionable error messages
- Fast performance (< 100ms for most operations)
