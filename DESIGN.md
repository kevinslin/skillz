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
- **Cursor**: `.cursorrules`
- **Aider**: `.aider/conventions.md`
- **GitHub Copilot**: `.github/copilot-instructions.md`
- **Windsurf**: `.windsurfrules`
- **Continue**: `.continue/instructions.md`

All targets use the same managed section format with skill links.

## Recommended Design

### Configuration Schema

```typescript
// .skills.json
{
  "version": "1.0",
  "preset": "agentsmd", // Optional: agentsmd, aider
  "targets": [
    "AGENTS.md",
    ".cursorrules"
  ],
  "skillDirectories": [
    ".claude/skills",
    "~/.claude/skills"
  ],
  "additionalSkills": [
    "/custom/path/to/skills"
  ],
  "ignore": ["*.test", "experimental-*"],
  "includeInstructions": false, // Include full SKILL.md body or just link to skill
  "autoSync": false,
  "backup": true
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

Users can start with a preset and customize further using `skillz config` or by editing `.skills.json` directly.

### Commands

#### `skillz init [options]`

Initializes skillz in the current directory.

**Behavior:**
1. Scans current directory and ancestors for target files (AGENTS.md, .cursorrules, etc.)
2. Detects existing `.claude/skills/` directories
3. Prompts user to confirm/customize detected configuration
4. Creates `.skills.json` with sensible defaults
5. Optionally runs initial sync

**Options:**
- `--preset <name>` - Use a preset configuration (agentsmd, aider)
- `--target <file>` - Specify custom target file path (e.g., AGENTS.md, .cursorrules)
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
skillz init --target .cursorrules

# Initialize with multiple skill sources
skillz init --preset agentsmd --additional-skills /path/to/company/skills --global-skills

# Initialize without syncing
skillz init --preset agentsmd --no-sync
```

#### `skillz sync [options]`

Synchronizes skills from source directories to target files.

**Behavior:**
1. Reads `.skills.json` configuration
2. Scans all configured skill directories
3. Parses SKILL.md files and extracts frontmatter + instructions
4. Creates backup of target file(s) if enabled
5. Generates skill section using template
6. Updates target file(s) with skill information
7. Reports summary of changes

**Options:**
- `--dry-run` - Show what would be synced without making changes
- `--force` - Overwrite target even if manual edits detected
- `--no-backup` - Skip backup creation
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

The sync command maintains a delimited section in the target file:

```markdown
# Your custom agents configuration

... your custom content ...

<!-- BEGIN SKILLZ MANAGED SECTION - DO NOT EDIT MANUALLY -->
<!-- Last synced: 2025-11-05T10:30:00Z -->
<!-- Source: .claude/skills/, ~/.claude/skills/ -->

## Additional Instructions
You can use skills. These are custom instructions that help you accomplish specific tasks. Your list of available skills below:

- [python-expert](.claude/skills/python-expert/SKILL.md): Expert Python development assistance with best practices
- [react-patterns](.claude/skills/react-patterns/SKILL.md): Modern React patterns and best practices
- [typescript-helper](.claude/skills/typescript-helper/SKILL.md): TypeScript type safety and advanced patterns

<!-- END SKILLZ MANAGED SECTION -->

... more custom content ...
```

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
- `--keep-backup` - Keep backup after cleaning

#### `skillz validate`

Validates skill files and configuration.

**Checks:**
- `.skills.json` schema validity
- SKILL.md file format (frontmatter, required fields)
- Skill name format (lowercase, hyphens, max 64 chars)
- Description length (max 1024 chars)
- File permissions and accessibility
- Circular references or duplicates

**Output:**
```
Validating configuration...
✓ .skills.json is valid

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
skillz config autoSync true
skillz config backup false

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

### 5. Backup Strategy

```typescript
interface BackupManager {
  create(filePath: string): string; // Returns backup path
  restore(backupPath: string): void;
  list(filePath: string): string[]; // List all backups
  prune(filePath: string, keep: number): void; // Keep only N recent backups
}
```

### 6. Safety Features

- **Manual Edit Detection**: Warn if managed section was manually edited
- **Atomic Writes**: Use temp files + rename for atomic updates
- **Rollback**: Provide `skillz rollback` command to undo last sync
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
│   │   ├── target-manager.ts  # Target file read/write operations
│   │   └── backup-manager.ts  # Backup/restore logic
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
npm install -g skillz-cli
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
5. **Config Validation**: Validate .skills.json against schema

## Future Enhancements

1. **Plugin System**: Allow custom adapters via plugins
2. **Remote Skills**: Fetch skills from URLs or package registries
3. **Skill Marketplace**: Discover and install community skills
4. **IDE Extensions**: VSCode/Cursor extensions for visual management
5. **CI/CD Integration**: GitHub Actions for auto-syncing
6. **Multi-workspace**: Support for monorepos with multiple skill configs
7. **Skill Dependencies**: Allow skills to depend on other skills
8. **Versioning**: Track skill versions and support rollback
9. **Skill Testing**: Framework for testing skill effectiveness
10. **Analytics**: Track which skills are most used/effective

## Migration Path

For existing setups:
1. Detect existing AGENTS.md or .cursorrules
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
