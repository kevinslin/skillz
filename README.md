# Skillz

<img width="400" height="400" alt="ChatGPT Image Nov 9, 2025, 05_20_01 PM" src="https://ik.imagekit.io/fpjzhqpv1/ChatGPT%20Image%20Nov%209,%202025,%2005_20_01%20PM_KQnKRx_Zt.png?updatedAt=1762739794959" />

Skillz is a CLI that enables [skills](https://www.claude.com/blog/skills) across any LLM powered tool in a matter of seconds.
It works by injecting skill instructions in the `AGENTS.md` (or tool equivalent) instruction file and surfaces all discoverable skills by appending their frontmatter to the bottom of the file.

## Key Features

- Enable skill usage by automatically detecting tool environment and injecting skill usage instructions
- Enable skills to be automatically synced from well known paths (eg. `.claude/skills`) as well as the ability to customize additional paths
- Various methods to manage and edit skills from the CLI

## Requirements

- Node.js 18 or newer
- npm (or pnpm/yarn) for dependency management

## Installation

```bash
npm install -g skillz
```

## Quickstart

```sh
cd <your-workspace>
# this automatically detects your environment
skillz init

# your skills are now automatically synced
skillz sync
```

After syncing, the CLI maintains a managed section in your target file(s). For example, in `AGENTS.md`:

```markdown
## Additional Instructions

You now have access to Skills. Skills are specialized instruction sets...
[comprehensive skill usage instructions]

### Available Skills

- [python-expert](.claude/skills/python-expert/SKILL.md): Expert Python development assistance with best practices
- [react-patterns](.claude/skills/react-patterns/SKILL.md): Modern React patterns and best practices
```

## Configuration

The CLI stores project settings in `skillz.json`. A typical file looks like:

```json
{
  "version": "1.0",
  "preset": "agentsmd",
  "targets": ["AGENTS.md"],
  "skillDirectories": [".claude/skills"],
  "additionalSkills": [],
  "ignore": [],
  "includeInstructions": false,
  "defaultEditor": "vim",
  "autoSyncAfterEdit": true
}
```

Key fields:

- `targets`: Instruction files that receive the managed section.
- `skillDirectories` / `additionalSkills`: Folders that will be scanned for `SKILL.md`.
- `ignore`: Glob patterns to exclude skills.
- `includeInstructions`: When `true`, embeds full skill text instead of links.
- `defaultEditor`: Default editor for the `edit` command (defaults to `$EDITOR` or `vi`).
- `autoSyncAfterEdit`: Automatically run `sync` after editing a skill (defaults to `true`).

## Commands

### `skillz init`

Initialize Skillz in the current directory, detect existing targets, and create `skillz.json`.

**Automatic Environment Detection:**

When you run `skillz init` without flags in an interactive terminal, Skillz automatically detects your development environment and recommends the appropriate configuration:

- **Codex/AGENTS.md**: Detects `AGENTS.md` files and suggests the `agentsmd` preset
- **Cursor**: Detects `.cursorrules` or `.cursor/rules` directory and suggests the `cursor` preset (creates `.cursor/rules/skills.mdc`)
- **Claude Code**: Detects `CLAUDE.md` or `.claude/CLAUDE.md` files and suggests the `claude` preset
- **Aider**: Detects `.aider/conventions.md` files and suggests the `aider` preset

After detection, you can:

- Accept the suggested configuration
- Edit the configuration in your `$EDITOR` before saving
- Cancel and configure manually

Options:

- `--preset <name>`: Apply a preset (`agentsmd`, `aider`, `cursor`, `claude`) for default targets.
- `--target <path>`: Supply one or more custom target files.
- `--additional-skills <path>`: Add extra skill directories (repeatable).
- `--global-skills`: Include the global `~/.claude/skills/` directory.
- `--template <path>`: Use a custom Handlebars template for rendered output.
- `--include-instructions`: Embed full skill bodies instead of link lists.
- `--no-sync`: Skip the initial synchronization run.

Examples:

```bash
# Auto-detect environment and configure interactively
skillz init

# Use specific preset (skips detection)
skillz init --preset cursor

# Multiple environments
skillz init --preset aider --global-skills

# Custom target
skillz init --target .cursor/rules/skills.mdc --template ./templates/company.hbs
```

### `skillz create`

Create a new skill with a template `SKILL.md` file in your configured skill directory.

**Interactive Mode (Recommended):**

```bash
skillz create -i
```

Launches an interactive prompt that guides you through creating a well-structured skill with:

- Capabilities section
- Guidelines section
- Examples placeholder
- Anti-patterns section (optional)

**Quick Mode:**

```bash
skillz create <name> <description>
```

Creates a minimal skill with just frontmatter. You'll need to manually edit the SKILL.md file to add content.

**Options:**

- `-i, --interactive`: Launch interactive mode with guided prompts (recommended)
- `--path <directory>`: Custom directory path (overrides config)
- `--skill-version <semver>`: Skill version in semver format (default: `0.0.0`)

The command automatically normalizes skill names by converting to lowercase, replacing underscores and spaces with hyphens, and removing special characters. The original name format is preserved in the SKILL.md frontmatter.

**Examples:**

```bash
# Interactive mode - creates well-structured skill
skillz create --interactive

# Quick mode - minimal skill (requires manual editing)
skillz create python-expert "Expert Python development assistance"
skillz create bake_cake "Bake delicious cakes" --skill-version 1.0.0
skillz create custom-skill "Custom location" --path ~/my-skills

# Trigger interactive mode by omitting arguments
skillz create
```

### `skillz sync`

Scan configured skill directories and update every target file with the latest skills.

Options:

- `--dry-run`: Show pending updates without touching the filesystem.
- `--force`: Ignore change detection and rewrite targets even if nothing changed.
- `--no-backup`: Skip automatic backup creation.
- `--verbose`: Print detailed scanning and write activity.
- `--only <skill>`: Restrict the sync to one or more named skills (repeatable).

Examples:

```bash
skillz sync
skillz sync --dry-run
skillz sync --only python-expert --only react-patterns --verbose
```

### `skillz list`

Display available skills in the configured directories.

Options:

- `--format <table|json|markdown>`: Choose the output format (`table` is default).
- `--synced-only`: Limit the list to skills currently present in targets.
- `--unsynced-only`: List skills that have not been synced yet.

Examples:

```bash
skillz list
skillz list --format json --unsynced-only
```

### `skillz edit`

Open an existing skill in your preferred editor for editing.

Usage:

```bash
skillz edit <skill-name>
```

The command will:

1. Find the skill by name (case-insensitive, handles hyphens/underscores interchangeably)
2. Open it in your configured editor
3. Automatically run `sync` after you close the editor (unless `autoSyncAfterEdit` is set to `false`)

**Editor Selection Priority:**

1. `--editor` flag (if provided)
2. `defaultEditor` from `skillz.json`
3. `$EDITOR` environment variable
4. `vi` (fallback)

**Special Behavior:**

- For VS Code and Cursor editors, opens the entire skill folder
- For other editors, opens the `SKILL.md` file directly

Options:

- `--editor <name>`: Override the default editor for this session

Examples:

```bash
# Edit using default editor
skillz edit python-expert

# Edit using specific editor
skillz edit python-expert --editor code
```

**Configuration:**

Set your preferred editor in `skillz.json`:

```json
{
  "defaultEditor": "code",
  "autoSyncAfterEdit": true
}
```

Or set the `EDITOR` environment variable:

```bash
export EDITOR=vim
```

## Development Scripts

- `npm run build`: Compile TypeScript sources to `dist/`.
- `npm run dev`: Run the CLI in watch mode via `tsx`.
- `npm run test`: Run the Jest test suite.
- `npm run lint`: Run ESLint.
- `npm run format`: Run Prettier.

## Contributing

1. Fork the repository and create a branch for your changes.
2. Run the unit and integration test suites (`npm run test`).
3. Open a pull request with a clear description of the problem and proposed solution.

## License

Skillz CLI is released under the Apache License. See `LICENSE` for details.
