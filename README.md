# Skillz

<img width="400" height="400" alt="ChatGPT Image Nov 9, 2025, 05_20_01 PM" src="https://ik.imagekit.io/fpjzhqpv1/ChatGPT%20Image%20Nov%209,%202025,%2005_20_01%20PM_KQnKRx_Zt.png?updatedAt=1762739794959" />

Skillz is a CLI for managing Claude-style `SKILL.md` directories and syncing them into a workspace-local target directory that LLM tools can read.

## Key Features

- Detect common AI-tool environments during `init`
- Scan local and global skill directories
- Copy skills into a native target directory such as `.skills`
- Track config and skill changes with `.skillz-cache.json`
- Create and edit skills from the CLI

## Requirements

- Node.js 18 or newer
- npm, pnpm, or yarn

## Installation

```bash
npm install -g skillz
```

## Quickstart

```bash
cd <your-workspace>
skillz init
skillz sync
```

By default, presets now sync to `.skills/`:

```text
.skills/
├── python-expert/
├── react-patterns/
└── web-expert/
```

## Configuration

Skillz stores project settings in `skillz.json`.

```json
{
  "version": "2.0",
  "preset": "agentsmd",
  "targets": [
    {
      "destination": ".skills",
      "deleteExistingFromTarget": false,
      "preset": "agentsmd"
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

Required:

- `version`: Configuration schema version. Currently `"2.0"`.
- `targets`: Array of target directories. Each target has:
  - `destination`: Directory to receive copied skills.
  - `deleteExistingFromTarget`: When true, removes stale copied skill directories before copying.
  - `preset`: Optional preset label.
- `skillDirectories`: Directories to scan for `SKILL.md` skills.
- `additionalSkills`: Additional skill directories beyond `skillDirectories`.
- `ignore`: Global glob patterns to exclude skills across all configured directories.

Optional:

- `preset`: One of `agentsmd`, `aider`, `cursor`, `claude`.
- `defaultEditor`: Default editor for `skillz edit`.
- `autoSyncAfterEdit`: Automatically run `sync` after editing a skill.

SkillDirectory fields:

- `localPath`: Directory path to scan.
- `remotePath`: Remote source used by `skillz init --remote`.
- `syncFromRoot`: Treat the directory itself as a skill.
- `include`: Only sync skills whose `name` matches one of these values.
- `ignore`: Glob patterns to exclude subdirectories for this entry only.

## Sync Model

Skillz is native-only. Sync always copies skill directories into configured target directories.

Behavior:

- Targets must be directories, not files.
- Copy validation aborts before writing when conflicts are detected.
- Copied output is flattened to `target/<skill-name>`.
- Cache detects both skill changes and config changes.
- `deleteExistingFromTarget` removes stale copied skills before the new copy pass.

Legacy note:

- Prompt/file targets such as `AGENTS.md`, `CLAUDE.md`, or `.cursor/rules/skills.mdc` are no longer supported as sync destinations.
- Old configs that still reference those file targets fail with a migration-oriented error instead of creating directories with file names.

## Environment Detection

`skillz init` still detects common workspace markers:

- `AGENTS.md` for Codex-style workspaces
- `.cursor/rules` for Cursor
- `CLAUDE.md` or `.claude/CLAUDE.md` for Claude Code
- `.aider/conventions.md` for Aider

Those markers influence the chosen preset, but preset targets now default to `.skills`.

## Commands

### `skillz init`

Initialize `skillz.json` in the current directory.

Common options:

- `--preset <name>`
- `--target <directory>`
- `--additional-skills <path>`
- `--global-skills`
- `--remote`
- `--no-sync`
- `--non-interactive`

Examples:

```bash
skillz init
skillz init --preset agentsmd
skillz init --target vendor-skills --no-sync
skillz init --preset agentsmd --global-skills
```

### `skillz sync`

Copy skills from configured sources into target directories.

Options:

- `--dry-run`
- `--force`
- `--verbose`
- `--only <skill-name>` (repeatable)

Examples:

```bash
skillz sync
skillz sync --dry-run
skillz sync --only python-expert
skillz sync --only python-expert --only react-patterns --verbose
```

### `skillz list`

List discovered skills.

### `skillz create`

Create a new skill.

Examples:

```bash
skillz create python-expert "Expert Python assistance"
skillz create --interactive
skillz create test-skill "A test skill" --skill-version 1.2.3
```

### `skillz edit`

Open an existing skill in your preferred editor.

### `skillz info`

Show project configuration and discovered-skill counts.

### `skillz watch`

Watch configured skill directories and auto-sync on changes.

## Development

```bash
npm run build
npm test
npm run lint
npm run format
```
