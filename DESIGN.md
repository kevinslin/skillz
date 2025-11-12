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
  "includeInstructions": false // Include full SKILL.md body or just link to skill
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

**Examples:**
```bash
# Standard sync
skillz sync

# Preview changes without applying
skillz sync --dry-run

# Sync specific skills only
skillz sync --only python-expert --only react-patterns
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

**Note:** When `includeInstructions: true` is set in config, the full SKILL.md content will be embedded instead of just links.

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
skillz config includeInstructions true

# Add to array
skillz config additionalSkills --add /new/path

# Remove from array
skillz config additionalSkills --remove /old/path
```

## Architecture Recommendations

### 1. Target File Management

Simple interface for managing target files:

```typescript
interface TargetFileManager {
  read(filePath: string): TargetContent;
  write(filePath: string, skills: Skill[], template?: string): void;
  extractManagedSection(content: string): ManagedSection | null;
  replaceManagedSection(content: string, newSection: string): string;
}

// All target files use the same markdown format with delimited sections
// No special adapters needed - just different file paths
```

### 2. Skill Parser

```typescript
interface Skill {
  name: string;
  description: string;
  path: string;
  content: string; // Full SKILL.md content
  frontmatter: Record<string, any>;
  lastModified: Date;
  hash: string; // For change detection
}

class SkillParser {
  parse(skillPath: string): Skill;
  validate(skill: Skill): ValidationResult;
}
```

### 3. Template Engine

Support custom templates for skill formatting. The default template generates a simple bulleted list with links:

```handlebars
{{!-- Default template: skills-list.hbs --}}
## Additional Instructions
You can use skills. These are custom instructions that help you accomplish specific tasks. Your list of available skills below:

{{#each skills}}
- [{{name}}]({{path}}): {{description}}
{{/each}}
```

When `includeInstructions: true`, use an expanded template:

```handlebars
{{!-- Expanded template: skills-full.hbs --}}
## Additional Instructions
You can use skills. These are custom instructions that help you accomplish specific tasks.

{{#each skills}}
### {{name}}
**Path:** {{path}}
**Description:** {{description}}

**Instructions:**
{{content}}

---
{{/each}}
```

Users can provide custom templates via `--template` option or config.

### 4. Change Detection

Use content hashing (SHA-256) to efficiently detect changes without comparing full content:

**Hash Storage:**
Hashes are stored in `.skillz-cache.json` in the project root:
```json
{
  "version": "1.0",
  "lastSync": "2025-11-05T10:30:00Z",
  "targetFile": "AGENTS.md",
  "skills": {
    "python-expert": {
      "hash": "a1b2c3d4e5f6",
      "path": ".claude/skills/python-expert/SKILL.md",
      "lastModified": "2025-11-05T09:15:00Z"
    },
    "react-patterns": {
      "hash": "b2c3d4e5f6g7",
      "path": ".claude/skills/react-patterns/SKILL.md",
      "lastModified": "2025-11-04T14:22:00Z"
    }
  }
}
```

**Hash Calculation:**
```typescript
function calculateSkillHash(skill: Skill): string {
  // Hash includes: name, description, and full SKILL.md content
  const hashInput = `${skill.name}:${skill.description}:${skill.content}`;
  return crypto.createHash('sha256').update(hashInput).digest('hex').slice(0, 12);
}
```

**Change Detection Flow:**
1. **Read Phase:** Load `.skillz-cache.json` and extract stored hashes
2. **Scan Phase:** Scan skill directories and calculate current hash for each skill
3. **Compare Phase:**
   - **New skill:** Hash exists in filesystem but not in cache file
   - **Modified skill:** Hash in cache differs from current filesystem hash
   - **Removed skill:** Hash exists in cache but skill no longer in filesystem
   - **Unchanged:** Hashes match - skip update to preserve performance
4. **Update Phase:**
   - Only regenerate content for new/modified/removed skills
   - Update `.skillz-cache.json` with new hashes

**Benefits:**
- Fast comparison without reading full skill content
- Detects any changes (name, description, or content)
- Enables incremental updates
- Stores additional metadata (timestamps, paths)
- Can be gitignored or committed based on team preference

**Cache File Management:**
- Should be added to `.gitignore` by default (each developer maintains their own)
- Can be committed if team wants to track sync state
- Automatically recreated if missing (treats all skills as new)
- Use `skillz clean` to remove cache along with managed section

### 5. Safety Features

- **Manual Edit Detection**: Warn if managed section was manually edited
- **Atomic Writes**: Use temp files + rename for atomic updates
- **Validation**: Always validate before writing
- **Dry Run**: Support for all destructive operations

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
