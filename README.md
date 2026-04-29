# Skillz

<img width="400" height="400" alt="ChatGPT Image Nov 9, 2025, 05_20_01 PM" src="https://ik.imagekit.io/fpjzhqpv1/ChatGPT%20Image%20Nov%209,%202025,%2005_20_01%20PM_KQnKRx_Zt.png?updatedAt=1762739794959" />

Skillz is a CLI that enables [skills](https://open.substack.com/pub/treeandforest/p/skills-as-object-oriented-programming) across LLM-powered tools.
It scans skill source directories and copies each discovered skill directory into configured target directories such as `.skills`.

## Key Features

- Auto-detect supported tool workspaces and initialize a skill sync target.
- Sync skills from well-known paths like `.claude/skills` and from custom configured directories.
- Manage, create, edit, list, and watch skills from the CLI.

## Requirements

- Node.js 18 or newer
- npm, pnpm, or yarn for dependency management

## Installation

```bash
npm install -g skillz
```

## Quickstart

```sh
cd <your-workspace>

# Detect your environment and create skillz.json.
skillz init

# Copy discovered skills into configured target directories.
skillz sync
```

After syncing, the default preset target contains copied skill directories:

```text
.skills/
|-- python-expert/
|   `-- SKILL.md
|-- react-patterns/
|   `-- SKILL.md
`-- web-expert/
    `-- SKILL.md
```

## Configuration

The CLI stores project settings in `skillz.json`. A complete target-directory sync configuration looks like this:

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
      "include": ["python-expert", "react-patterns"],
      "ignore": ["experimental-*"]
    },
    {
      "localPath": "root-skill",
      "syncFromRoot": true
    },
    {
      "localPath": "~/.claude/skills",
      "remotePath": "git@github.com:your-org/skills.git"
    }
  ],
  "additionalSkills": ["~/my-custom-skills"],
  "ignore": ["*.test", "experimental-*"],
  "defaultEditor": "code",
  "autoSyncAfterEdit": true
}
```

### Configuration Fields

Required fields:

- `version` (string): Configuration schema version. Currently `"2.0"`.
- `targets` (Target[]): Target directories that receive copied skills. This can be `[]` for skill management without syncing.
- `skillDirectories` (SkillDirectory[]): Source directories to scan for skills.
- `additionalSkills` (string[]): Additional source directories beyond `skillDirectories`. Can be `[]`.
- `ignore` (string[]): Global glob patterns to exclude skill directories across all source entries. Can be `[]`.

Optional fields:

- `preset` (string): Preset name. Supported values are `"agentsmd"`, `"aider"`, `"cursor"`, and `"claude"`.
- `defaultEditor` (string): Default editor for `skillz edit`. Falls back to `$EDITOR` or `vi`.
- `autoSyncAfterEdit` (boolean): Automatically run `sync` after editing a skill. Default: `true`.

Target fields:

- `destination` (string): Directory path where skills are copied.
- `deleteExistingFromTarget` (boolean, optional): When true, remove stale copied skill directories from the target before copying the current skill set.

SkillDirectory fields:

- `localPath` (string): Directory path to scan.
- `remotePath` (string, optional): Remote source used by `skillz init --remote`.
- `syncFromRoot` (boolean, optional): Treat the directory itself as a skill. The directory must contain `SKILL.md`.
- `include` (string[], optional): If set, only sync skills whose `name` matches one of these values.
- `ignore` (string[], optional): Glob patterns to exclude subdirectories only for this source entry.

### Sync Behavior

Skillz copies every discovered skill directory into each configured target directory. Destination layout is flattened by skill name:

```text
Source: .claude/skills/backend/python-expert -> Destination: .skills/python-expert
Source: .claude/skills/frontend/react-patterns -> Destination: .skills/react-patterns
```

Important behaviors:

- Source directories are scanned recursively for `SKILL.md`.
- Destination directories are named by each skill's `name`.
- Duplicate skill names are warned and later duplicates are skipped.
- Existing copied skill directories can be overwritten.
- Existing non-skill paths at a destination block sync as conflicts.
- `deleteExistingFromTarget` only deletes stale directories that contain `SKILL.md`.

### Minimal Configuration

For skill management without syncing to targets:

```json
{
  "version": "2.0",
  "targets": [],
  "skillDirectories": [
    {
      "localPath": ".claude/skills"
    }
  ],
  "additionalSkills": [],
  "ignore": []
}
```

## Commands

### `skillz init`

Initialize Skillz in the current directory, detect supported tool markers, and create `skillz.json`.

Automatic environment detection:

- **Codex/AGENTS.md**: Detects `AGENTS.md` and suggests the `agentsmd` preset.
- **Cursor**: Detects `.cursor/rules` and suggests the `cursor` preset.
- **Claude Code**: Detects `CLAUDE.md` or `.claude/CLAUDE.md` and suggests the `claude` preset.
- **Aider**: Detects `.aider/conventions.md` and suggests the `aider` preset.

All presets now use `.skills` as the default target directory.

Options:

- `--preset <name>`: Apply a preset (`agentsmd`, `aider`, `cursor`, `claude`).
- `--target <path>`: Supply a custom target directory.
- `--additional-skills <path>`: Add extra skill directories. Repeatable.
- `--global-skills`: Include the global `~/.claude/skills/` directory.
- `--remote`: Pull skills from `remotePath` into `.skills` using the existing `skillz.json`.
- `--no-sync`: Skip the initial synchronization run.
- `--non-interactive`: Run in non-interactive mode.

Examples:

```bash
skillz init
skillz init --preset cursor
skillz init --preset aider --global-skills
skillz init --target .cursor/.skills
```

### `skillz create`

Create a new skill with a template `SKILL.md` file in your configured skill directory.

Interactive mode:

```bash
skillz create -i
```

Quick mode:

```bash
skillz create <name> <description>
```

Options:

- `-i, --interactive`: Launch guided prompts.
- `--path <directory>`: Custom skill source directory.
- `--skill-version <semver>`: Skill version in semver format. Default: `0.0.0`.

Examples:

```bash
skillz create --interactive
skillz create python-expert "Expert Python development assistance"
skillz create custom-skill "Custom location" --path ~/my-skills
```

### `skillz sync`

Scan configured skill directories and update every target directory with the latest skills.

Options:

- `--dry-run`: Show pending updates without touching the filesystem.
- `--force`: Ignore change detection and rewrite targets even if nothing changed.
- `--no-backup`: Skip automatic backup creation.
- `--verbose`: Print detailed scanning and write activity.
- `--only <skill>`: Restrict the sync to one or more named skills. Repeatable.

Examples:

```bash
skillz sync
skillz sync --dry-run
skillz sync --only python-expert --only react-patterns --verbose
```

### `skillz watch`

Watch configured skill directories and `skillz.json`, then run `sync` when skill or config changes are detected.
Config edits also refresh the active watch roots without restarting the command.

Options:

- `--interval <ms>`: Polling interval in milliseconds. Default: 1000.

Examples:

```bash
skillz watch
skillz watch --interval 500
```

### `skillz list`

Display available skills in the configured directories.

Options:

- `--format <table|json|markdown>`: Choose the output format. `table` is default.
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

1. Find the skill by name.
2. Open it in your configured editor.
3. Automatically run `sync` after you close the editor unless `autoSyncAfterEdit` is `false`.

Editor selection priority:

1. `--editor` flag
2. `defaultEditor` from `skillz.json`
3. `$EDITOR`
4. `vi`

Examples:

```bash
skillz edit python-expert
skillz edit python-expert --editor code
```

## Development Scripts

- `npm run build`: Compile TypeScript sources to `dist/`.
- `npm run dev`: Compile TypeScript in watch mode to `dist/`.
- `npm run test`: Run the Jest test suite.
- `npm run lint`: Run ESLint.
- `npm run format`: Run Prettier.

## Local Development

```bash
npm install
npm run build
node dist/cli.js <command>
```

For a linked local binary:

```bash
npm link
skillz <command>
```

## Contributing

1. Fork the repository and create a branch for your changes.
2. Run the unit and integration test suites (`npm run test`).
3. Open a pull request with a clear description of the problem and proposed solution.

## License

Skillz CLI is released under the Apache License. See `LICENSE` for details.
