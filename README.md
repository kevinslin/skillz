# Skillz

<img width="400" height="400" alt="ChatGPT Image Nov 9, 2025, 05_20_01 PM" src="https://github.com/user-attachments/assets/61e1d52b-4ba3-4fb6-9968-cb15e2749b3a" />

Skillz is a TypeScript-powered command line tool that lets you manage Claude Agent skills and surface them inside any AI development environment. It scans local and global skill directories, renders them through configurable templates, and keeps downstream instruction files such as `AGENTS.md`, `.cursorrules`, or `.github/copilot-instructions.md` in sync.

## Key Features
- Discover skills from project-local `.claude/skills/` and user-level `~/.claude/skills/` folders.
- Normalize skill output across multiple LLM tooling targets with a single managed section format.
- Apply custom Handlebars templates or embed full instruction bodies on demand.
- Detect skill changes via hashing and warn about manual edits before overwriting targets.

## Requirements
- Node.js 18 or newer
- npm (or pnpm/yarn) for dependency management

## Installation
```bash
git clone https://github.com/your-org/skillz.git
cd skillz
npm install
npm run build
npm link   # optional: expose the CLI globally during development
```

Once published to npm you will be able to install it directly:
```bash
npm install -g skillz-cli
```

## Quick Start
1. Initialize the project and generate `skillz.json`:
   ```bash
   skillz init --preset agentsmd
   ```
2. Sync skills into your target file:
   ```bash
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

The section starts with a configurable heading (`skillsSectionName` in config) and continues to the end of the file.

## Configuration
The CLI stores project settings in `skillz.json`. A typical file looks like:
```json
{
  "version": "1.0",
  "preset": "agentsmd",
  "targets": ["AGENTS.md"],
  "skillDirectories": [".claude/skills"],
  "additionalSkills": [],
  "ignore": ["*.test"],
  "includeInstructions": false,
  "autoSync": false
}
```

Key fields:
- `targets`: Instruction files that receive the managed section.
- `skillDirectories` / `additionalSkills`: Folders that will be scanned for `SKILL.md`.
- `ignore`: Glob patterns to exclude skills.
- `includeInstructions`: When `true`, embeds full skill text instead of links.

You can edit `skillz.json` manually.

## Commands

### `skillz init`
Initialize Skillz in the current directory, detect existing targets, and create `skillz.json`.

Options:
- `--preset <name>`: Apply a preset (`agentsmd`, `aider`) for default targets.
- `--target <path>`: Supply one or more custom target files.
- `--additional-skills <path>`: Add extra skill directories (repeatable).
- `--global-skills`: Include the global `~/.claude/skills/` directory.
- `--template <path>`: Use a custom Handlebars template for rendered output.
- `--include-instructions`: Embed full skill bodies instead of link lists.
- `--no-sync`: Skip the initial synchronization run.

Examples:
```bash
skillz init
skillz init --preset aider --global-skills
skillz init --target .cursorrules --template ./templates/company.hbs
```

### `skillz create`
Create a new skill with a template `SKILL.md` file in your configured skill directory.

**Interactive Mode (Recommended):**
```bash
skillz create --interactive
# or
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
Skillz CLI is released under the MIT License. See `LICENSE` for details once the repository is published.
