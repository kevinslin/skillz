# Skillz CLI - Implementation Plan

## Phase 1: Project Setup and Foundation

### 1.1 Initialize Project Structure
- [ ] Create package.json with project metadata
  - Set name to `skillz-cli`
  - Set version to `0.1.0`
  - Add bin entry: `"skillz": "./dist/cli.js"`
  - Set engines: `"node": ">=18.0.0"`
- [ ] Initialize TypeScript configuration
  - Create tsconfig.json with strict mode
  - Set target to ES2022
  - Configure outDir to `./dist`
  - Enable sourceMap and declaration
- [ ] Set up development tooling
  - Install and configure ESLint
  - Install and configure Prettier
  - Add .editorconfig for consistent formatting
  - Create .gitignore (node_modules, dist, *.log, .DS_Store)
- [ ] Install core dependencies
  ```bash
  npm install commander chalk ora inquirer cli-table3 chokidar handlebars gray-matter zod
  ```
- [ ] Install dev dependencies
  ```bash
  npm install -D typescript @types/node @types/inquirer tsx jest @types/jest ts-jest @jest/globals fs-extra @types/fs-extra
  ```
- [ ] Create directory structure
  ```
  src/
  ├── cli.ts
  ├── commands/
  ├── core/
  ├── templates/
  ├── utils/
  └── types/
  tests/
  ├── unit/
  ├── integration/
  └── fixtures/
  ```

### 1.2 Setup Build and Development Scripts
- [ ] Add npm scripts to package.json:
  - `"build"`: Compile TypeScript to dist/
  - `"dev"`: Watch mode with tsx
  - `"test"`: Run jest
  - `"test:watch"`: Run jest in watch mode
  - `"test:coverage"`: Run jest with coverage
  - `"lint"`: Run ESLint
  - `"format"`: Run Prettier
  - `"prepublishOnly"`: Build before publishing
- [ ] Create CLI entry point with shebang
  - Add `#!/usr/bin/env node` to cli.ts
  - Make it executable after build
- [ ] Test basic CLI scaffold
  - Create minimal commander setup
  - Run `npm link` to test locally
  - Verify `skillz --help` works

## Phase 2: Type Definitions and Core Interfaces

### 2.1 Define Core Types
- [ ] Create `src/types/index.ts`
- [ ] Define `Skill` interface
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
  ```
- [ ] Define `Config` interface
  ```typescript
  interface Config {
    version: string;
    preset?: 'agentsmd' | 'aider';
    targets: string[];
    skillDirectories: string[];
    additionalSkills: string[];
    ignore: string[];
    includeInstructions: boolean;
    autoSync: boolean;
    backup: boolean;
  }
  ```
- [ ] Define `CacheFile` interface
  ```typescript
  interface CacheFile {
    version: string;
    lastSync: string;
    targetFile: string;
    skills: Record<string, SkillCacheEntry>;
  }

  interface SkillCacheEntry {
    hash: string;
    path: string;
    lastModified: string;
  }
  ```
- [ ] Define `ManagedSection` interface
  ```typescript
  interface ManagedSection {
    startLine: number;
    endLine: number;
    content: string;
    metadata: {
      lastSync: string;
      sources: string[];
    };
  }
  ```
- [ ] Define validation result types
- [ ] Define change detection types (New, Modified, Removed, Unchanged)

### 2.2 Create Zod Schemas
- [ ] Create `src/utils/validation.ts`
- [ ] Define Zod schema for Config
  - Validate preset values
  - Validate file paths
  - Validate skill name patterns
- [ ] Define Zod schema for CacheFile
- [ ] Define Zod schema for Skill frontmatter
- [ ] Export validation functions

## Phase 3: Utility Functions

### 3.1 File System Helpers
- [ ] Create `src/utils/fs-helpers.ts`
- [ ] Implement `safeReadFile(path: string): Promise<string>`
  - Check if file exists
  - Handle permission errors
  - Return empty string if not found
- [ ] Implement `safeWriteFile(path: string, content: string): Promise<void>`
  - Create parent directories if needed
  - Write to temp file first
  - Atomic rename for safety
- [ ] Implement `fileExists(path: string): Promise<boolean>`
- [ ] Implement `ensureDir(path: string): Promise<void>`
- [ ] Implement `resolveHome(path: string): string`
  - Expand `~` to home directory
  - Handle cross-platform paths
- [ ] Implement `isSkillDirectory(path: string): Promise<boolean>`
  - Check for SKILL.md file
- [ ] Add error handling with helpful messages

### 3.2 Hashing Utilities
- [ ] Create `src/utils/hash.ts`
- [ ] Implement `calculateSkillHash(skill: Skill): string`
  - Use crypto.createHash('sha256')
  - Hash: name + description + content
  - Return first 12 characters
- [ ] Implement `hashesMatch(hash1: string, hash2: string): boolean`
- [ ] Add tests for hash stability

### 3.3 Logger Utilities
- [ ] Create `src/utils/logger.ts`
- [ ] Implement colorized logging functions:
  - `info(message: string)` - blue
  - `success(message: string)` - green
  - `warning(message: string)` - yellow
  - `error(message: string)` - red
  - `debug(message: string)` - gray (only if verbose)
- [ ] Add spinner wrapper using ora
- [ ] Add table formatter using cli-table3
- [ ] Support --verbose and --quiet flags

## Phase 4: Configuration Management

### 4.1 Config File Operations
- [ ] Create `src/core/config.ts`
- [ ] Implement `loadConfig(cwd: string): Promise<Config | null>`
  - Look for .skills.json in cwd
  - Parse and validate with Zod
  - Return null if not found
  - Throw error if invalid
- [ ] Implement `saveConfig(config: Config, cwd: string): Promise<void>`
  - Validate config before saving
  - Pretty print JSON with 2-space indent
  - Create backup if file exists
- [ ] Implement `getDefaultConfig(preset?: string): Config`
  - Return defaults based on preset
  - agentsmd: targets = ["AGENTS.md"]
  - aider: targets = [".aider/conventions.md"]
  - default: targets = ["AGENTS.md"], skillDirectories = [".claude/skills"]
- [ ] Implement `updateConfig(key: string, value: any): Promise<void>`
  - Load existing config
  - Update specific key
  - Validate and save
- [ ] Implement `detectExistingConfig(cwd: string): Promise<DetectedConfig>`
  - Scan for AGENTS.md, .cursorrules, .aider/conventions.md
  - Check for .claude/skills/ directory
  - Return suggested configuration

### 4.2 Cache File Operations
- [ ] Implement `loadCache(cwd: string): Promise<CacheFile | null>`
  - Look for .skillz-cache.json
  - Parse and validate
  - Return empty cache if not found
- [ ] Implement `saveCache(cache: CacheFile, cwd: string): Promise<void>`
  - Validate before saving
  - Pretty print JSON
- [ ] Implement `updateCache(skills: Skill[], targetFile: string): CacheFile`
  - Create new cache entries
  - Update lastSync timestamp
  - Preserve existing entries for unchanged skills

## Phase 5: Skill Scanning and Parsing

### 5.1 Skill Parser
- [ ] Create `src/core/skill-parser.ts`
- [ ] Implement `parseSkill(skillPath: string): Promise<Skill>`
  - Read SKILL.md file
  - Parse frontmatter with gray-matter
  - Extract name and description
  - Validate required fields
  - Calculate hash
  - Get file lastModified time
- [ ] Implement `validateSkill(skill: Skill): ValidationResult`
  - Check name format (lowercase, hyphens, max 64 chars)
  - Check description length (max 1024 chars)
  - Check required frontmatter fields
  - Return detailed error messages
- [ ] Add error handling for malformed files

### 5.2 Skill Scanner
- [ ] Create `src/core/skill-scanner.ts`
- [ ] Implement `scanDirectory(directory: string, ignore: string[]): Promise<string[]>`
  - Recursively find all SKILL.md files
  - Apply ignore patterns
  - Return array of skill directory paths
- [ ] Implement `scanAllSkillDirectories(config: Config): Promise<Skill[]>`
  - Scan all directories in config
  - Parse each skill
  - Filter out invalid skills (with warnings)
  - Return array of valid skills
- [ ] Implement `findSkillByName(skills: Skill[], name: string): Skill | null`
- [ ] Add glob pattern matching for ignore rules

## Phase 6: Template Engine

### 6.1 Template Files
- [ ] Create `src/templates/skills-list.hbs`
  ```handlebars
  ## Additional Instructions
  You can use skills. These are custom instructions that help you accomplish specific tasks. Your list of available skills below:

  {{#each skills}}
  - [{{name}}]({{path}}): {{description}}
  {{/each}}
  ```
- [ ] Create `src/templates/skills-full.hbs`
  ```handlebars
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

### 6.2 Template Engine
- [ ] Create `src/core/template-engine.ts`
- [ ] Implement `loadTemplate(templatePath: string): string`
  - Read template file
  - Return template string
  - Cache templates for performance
- [ ] Implement `getDefaultTemplate(includeInstructions: boolean): string`
  - Return skills-list.hbs if false
  - Return skills-full.hbs if true
- [ ] Implement `renderTemplate(template: string, skills: Skill[]): string`
  - Compile handlebars template
  - Pass skills data
  - Return rendered string
- [ ] Implement `renderSkills(skills: Skill[], config: Config): string`
  - Load appropriate template
  - Render with skills data
  - Return formatted string

## Phase 7: Target File Management

### 7.1 Target File Manager
- [ ] Create `src/core/target-manager.ts`
- [ ] Define managed section delimiters
  ```typescript
  const BEGIN_MARKER = '<!-- BEGIN SKILLZ MANAGED SECTION - DO NOT EDIT MANUALLY -->';
  const END_MARKER = '<!-- END SKILLZ MANAGED SECTION -->';
  ```
- [ ] Implement `extractManagedSection(content: string): ManagedSection | null`
  - Find BEGIN and END markers
  - Extract content between markers
  - Parse metadata from HTML comments
  - Return null if markers not found
- [ ] Implement `replaceManagedSection(content: string, newSection: string): string`
  - Find existing managed section
  - Replace with new content
  - Preserve everything outside markers
  - If no existing section, append to end of file
- [ ] Implement `createManagedSection(skills: Skill[], config: Config): string`
  - Generate metadata comments (lastSync, sources)
  - Render skills using template
  - Wrap in BEGIN/END markers
  - Return complete section
- [ ] Implement `readTargetFile(filePath: string): Promise<string>`
  - Use safeReadFile
  - Return existing content or empty string
- [ ] Implement manual edit detection
  - Compare stored managed section metadata/hash before overwriting
  - Warn and require confirmation/flag if manual edits detected
- [ ] Implement `writeTargetFile(filePath: string, skills: Skill[], config: Config): Promise<void>`
  - Read existing content
  - Create new managed section
  - Replace old section
  - Write atomically
  - Create backup if enabled

## Phase 8: Change Detection

### 8.1 Change Detector
- [ ] Create `src/core/change-detector.ts`
- [ ] Define change types
  ```typescript
  type ChangeType = 'new' | 'modified' | 'removed' | 'unchanged';

  interface SkillChange {
    skill: Skill | null;
    type: ChangeType;
    oldHash?: string;
    newHash?: string;
  }
  ```
- [ ] Implement `detectChanges(currentSkills: Skill[], cache: CacheFile): SkillChange[]`
  - Compare current skills with cached hashes
  - Identify new skills
  - Identify modified skills (hash mismatch)
  - Identify removed skills
  - Identify unchanged skills
  - Return array of changes
- [ ] Implement `hasChanges(changes: SkillChange[]): boolean`
  - Return true if any new/modified/removed
- [ ] Implement `summarizeChanges(changes: SkillChange[]): ChangeSummary`
  - Count each type
  - Return summary object

### 8.2 Backup Manager
- [ ] Create `src/core/backup-manager.ts`
- [ ] Implement `createBackup(filePath: string): Promise<string>`
  - Generate backup filename: `{file}.backup-{timestamp}`
  - Copy file to backup location
  - Return backup path
- [ ] Implement `restoreBackup(backupPath: string, targetPath: string): Promise<void>`
  - Copy backup to target
  - Validate restoration
- [ ] Implement `listBackups(filePath: string): Promise<string[]>`
  - Find all backups for file
  - Sort by timestamp
  - Return array of paths
- [ ] Implement `pruneBackups(filePath: string, keep: number): Promise<void>`
  - Keep only N most recent backups
  - Delete older backups

## Phase 9: Command Implementation

### 9.1 Init Command
- [ ] Create `src/commands/init.ts`
- [ ] Implement preset handling
  - Parse --preset flag
  - Generate config from preset
- [ ] Implement target file handling
  - Parse --target flag
  - Override preset if provided
- [ ] Implement skill directory handling
  - Parse --additional-skills (repeatable)
  - Parse --global-skills flag
  - Add to skillDirectories array
- [ ] Implement interactive prompts
  - Ask for confirmation of detected config
  - Allow customization
  - Use inquirer for prompts
- [ ] Implement configuration creation
  - Generate .skills.json
  - Save to disk
  - Show success message
- [ ] Support formatting flags
  - Parse --template flag and store template path in config
  - Parse --include-instructions flag and update includeInstructions
  - Validate custom template path before saving config
- [ ] Implement initial sync
  - Run sync if --no-sync not provided
  - Show progress with spinner
- [ ] Add .skillz-cache.json to .gitignore
  - Create .gitignore if not exists
  - Append if exists

### 9.2 Sync Command
- [ ] Create `src/commands/sync.ts`
- [ ] Implement main sync flow
  - Load config
  - Load cache
  - Scan skill directories
  - Detect changes
  - Show change summary
- [ ] Implement --dry-run mode
  - Show what would change
  - Don't write files
  - Exit after showing changes
- [ ] Implement --force mode
  - Skip change detection
  - Sync all skills
- [ ] Implement --no-backup mode
  - Skip backup creation
- [ ] Implement verbose logging
  - Honor --verbose flag for detailed output
  - Surface change detection details and file paths when verbose
- [ ] Implement --only filter
  - Parse skill names
  - Filter to only specified skills
- [ ] Implement file writing
  - Create backups if enabled
  - Write each target file
  - Update cache
- [ ] Add progress indicators
  - Spinner for scanning
  - Progress for writing
  - Success messages
- [ ] Handle errors gracefully
  - Restore from backup on failure
  - Show clear error messages

### 9.3 List Command
- [ ] Create `src/commands/list.ts`
- [ ] Implement skill listing
  - Load config
  - Scan skill directories
  - Sort alphabetically
- [ ] Implement --format flag
  - table: Use cli-table3
  - json: JSON.stringify
  - markdown: Generate markdown table
- [ ] Implement table output
  - Columns: Name, Description, Path
  - Colorize headers
  - Truncate long descriptions
- [ ] Implement --synced-only filter
  - Load cache
  - Show only synced skills
- [ ] Implement --unsynced-only filter
  - Load cache
  - Show only unsynced skills

### 9.4 Validate Command
- [ ] Create `src/commands/validate.ts`
- [ ] Implement config validation
  - Load .skills.json
  - Validate with Zod schema
  - Show validation errors
- [ ] Implement skill validation
  - Scan all skill directories
  - Validate each skill
  - Check name format
  - Check description length
  - Check frontmatter
- [ ] Implement file access checks
  - Check read permissions
  - Check write permissions
  - Check directory accessibility
- [ ] Implement duplicate detection
  - Find duplicate skill names
  - Warn about conflicts
- [ ] Generate validation report
  - Show all errors and warnings
  - Use colors for visibility
  - Exit with error code if failures

### 9.5 Config Command
- [ ] Create `src/commands/config.ts`
- [ ] Implement config viewing
  - No args: show entire config
  - One arg: show specific key
  - Use syntax highlighting
- [ ] Implement config setting
  - Two args: set key to value
  - Validate value
  - Update config file
- [ ] Implement array operations
  - --add flag: append to array
  - --remove flag: remove from array
  - Support for additionalSkills, targets, ignore
- [ ] Show success/error messages
- [ ] Validate keys before setting

### 9.6 Watch Command
- [ ] Create `src/commands/watch.ts`
- [ ] Implement directory watching
  - Load config
  - Get all skill directories
  - Watch with chokidar
- [ ] Implement polling interval flag
  - Default to 1000ms interval
  - Allow override via --interval option
- [ ] Implement debouncing
  - Default 2 second delay before triggering sync
  - Disable with --no-debounce
- [ ] Implement change handling
  - On file change: trigger sync
  - Show what changed
  - Show sync results
- [ ] Add status messages
  - "Watching..." on start
  - "Change detected..." on change
  - "Synced" after successful sync
- [ ] Handle errors
  - Continue watching after errors
  - Show error messages
  - Don't crash process
- [ ] Support graceful shutdown
  - Handle SIGINT (Ctrl+C)
  - Clean up watchers
  - Show exit message

### 9.7 Clean Command
- [ ] Create `src/commands/clean.ts`
- [ ] Implement --dry-run mode
  - Show what would be removed
  - Don't actually remove
- [ ] Implement managed section removal
  - Load each target file
  - Remove managed section
  - Keep rest of file intact
- [ ] Implement cache removal
  - Delete .skillz-cache.json
  - Show confirmation
- [ ] Implement --keep-backup flag
  - Create backup before cleaning
  - Keep backup after cleaning
- [ ] Add confirmation prompt
  - Ask user to confirm (unless --force)
  - Show what will be removed
- [ ] Show success message

### 9.8 Rollback Command
- [ ] Create `src/commands/rollback.ts`
- [ ] Implement backup discovery
  - Locate most recent backup for each target file
  - Support targeting specific files or all via flags
- [ ] Implement confirmation flow
  - Show backup metadata before restoring
  - Require confirmation unless --force provided
- [ ] Implement restore logic
  - Use backup manager to restore selected backup
  - Refresh cache or warn user to resync
- [ ] Handle error reporting
  - Surface missing backup errors clearly
  - Exit with non-zero code on rollback failure

## Phase 10: CLI Integration

### 10.1 Main CLI Setup
- [ ] Create `src/cli.ts`
- [ ] Set up Commander program
  - Set name, version, description
  - Add global options (--verbose, --quiet)
- [ ] Register all commands
  - init
  - sync
  - list
  - validate
  - config
  - watch
  - clean
  - rollback
- [ ] Add command aliases
  - `s` for sync
  - `l` for list
  - `v` for validate
  - `w` for watch
- [ ] Implement error handling
  - Catch all errors
  - Show user-friendly messages
  - Exit with proper codes
- [ ] Add help text
  - Examples for each command
  - Common workflows
  - Link to documentation
- [ ] Test CLI locally
  - `npm link`
  - Test each command
  - Verify help text

## Phase 11: Testing

**Note:** See TESTING.md for comprehensive testing documentation.

### 11.1 Jest Setup
- [ ] Install Jest and dependencies
  ```bash
  npm install -D jest @types/jest ts-jest @jest/globals fs-extra @types/fs-extra
  ```
- [ ] Create jest.config.js
  - Set preset to 'ts-jest'
  - Configure test environment
  - Set test timeout to 10000ms
- [ ] Add test scripts to package.json
- [ ] Create test directory structure
  ```
  tests/
  ├── integration/
  ├── helpers/
  └── fixtures/
  ```

### 11.2 Mock Workspace Setup
- [ ] Create workspace helper (tests/helpers/workspace.ts)
  - Implement createMockWorkspace()
  - Create temporary directory
  - Set up .claude/skills/ structure
  - Create python-expert skill
  - Create react-patterns skill
  - Create AGENTS.md file
  - Implement cleanup function
- [ ] Create CLI helper (tests/helpers/cli.ts)
  - Implement execCli() function
  - Spawn CLI process
  - Capture stdout/stderr
  - Return exit code and output

### 11.3 Integration Tests - Init Command
- [ ] Create tests/integration/init.test.ts
- [ ] Test: Initialize with agentsmd preset
  - Verify .skills.json created
  - Verify preset field set
  - Verify targets include AGENTS.md
- [ ] Test: Initialize with custom target
  - Verify custom target in config
- [ ] Test: Initialize with additional skills
  - Verify additionalSkills in config
- [ ] Test: Auto-sync after init
  - Verify AGENTS.md has managed section
  - Verify skills appear in file
- [ ] Test: Skip sync with --no-sync
  - Verify AGENTS.md not modified
- [ ] Test: Update .gitignore
  - Verify .skillz-cache.json added

### 11.4 Integration Tests - Sync Command
- [ ] Create tests/integration/sync.test.ts
- [ ] Test: Sync skills to AGENTS.md
  - Verify managed section created
  - Verify both skills appear
- [ ] Test: Create cache file
  - Verify .skillz-cache.json exists
  - Verify cache contains skill hashes
- [ ] Test: Preserve content outside managed section
  - Add custom content
  - Sync
  - Verify custom content preserved
- [ ] Test: Detect changed skills
  - First sync
  - Modify one skill
  - Second sync
  - Verify only modified skill synced
- [ ] Test: Create backup
  - Verify backup file created
- [ ] Test: Dry run mode
  - Verify file not modified
  - Verify output shows what would change
- [ ] Test: Only specific skills (--only)
  - Sync with --only flag
  - Verify only specified skill synced
- [ ] Test: No backup mode (--no-backup)
  - Verify no backup created

### 11.5 Integration Tests - List Command
- [ ] Create tests/integration/list.test.ts
- [ ] Test: List all skills (table format)
- [ ] Test: List in JSON format
- [ ] Test: List in markdown format
- [ ] Test: Filter synced only
- [ ] Test: Filter unsynced only

### 11.6 Integration Tests - Validate Command
- [ ] Create tests/integration/validate.test.ts
- [ ] Test: Validate valid config
- [ ] Test: Validate invalid config
- [ ] Test: Validate valid skills
- [ ] Test: Detect invalid skill names
- [ ] Test: Detect invalid descriptions
- [ ] Test: Detect missing frontmatter
- [ ] Test: Detect duplicate skills

### 11.7 Integration Tests - Config Command
- [ ] Create tests/integration/config.test.ts
- [ ] Test: View entire config
- [ ] Test: View specific key
- [ ] Test: Set config value
- [ ] Test: Add to array (--add)
- [ ] Test: Remove from array (--remove)

### 11.8 Integration Tests - Watch Command
- [ ] Create tests/integration/watch.test.ts
- [ ] Test: Watch detects file changes
- [ ] Test: Auto-sync on change
- [ ] Test: Debouncing works
- [ ] Test: Custom interval
- [ ] Test: Handles errors without crashing
- [ ] Test: Graceful shutdown

### 11.9 Integration Tests - Clean Command
- [ ] Create tests/integration/clean.test.ts
- [ ] Test: Remove managed section
- [ ] Test: Remove cache file
- [ ] Test: Dry run mode
- [ ] Test: Keep backup flag
- [ ] Test: Confirmation prompt

### 11.10 Integration Tests - Rollback Command
- [ ] Create tests/integration/rollback.test.ts
- [ ] Test: Rollback to latest backup
- [ ] Test: List available backups
- [ ] Test: Rollback specific file
- [ ] Test: Confirmation prompt
- [ ] Test: Error when no backup exists

### 11.11 End-to-End Workflows
- [ ] Test: Complete workflow
  - Init with preset
  - Verify sync
  - Modify skill
  - Sync again
  - Verify incremental update
- [ ] Test: Multiple targets
  - Init with multiple targets
  - Verify all targets synced
- [ ] Test: Multiple skill directories
  - Add additional skill directory
  - Verify all skills discovered

## Phase 12: Documentation

### 12.1 User Documentation
- [ ] Write README.md
  - Project overview
  - Installation instructions
  - Quick start guide
  - Usage examples
  - Configuration reference
  - Troubleshooting
- [ ] Add inline help text
  - Command descriptions
  - Option descriptions
  - Examples
- [ ] Create CONTRIBUTING.md
  - Development setup
  - Running tests
  - Code style
  - PR process
- [ ] Create CHANGELOG.md
  - Version history
  - Breaking changes
  - Migration guides

### 12.2 Code Documentation
- [ ] Add JSDoc comments to all public APIs
- [ ] Document complex algorithms
- [ ] Add inline comments for tricky code
- [ ] Document configuration schema
- [ ] Document cache file format

### 12.3 Examples
- [ ] Create examples/ directory
- [ ] Add example skills
- [ ] Add example configs
- [ ] Add example workflows
- [ ] Add troubleshooting scenarios

## Phase 13: Polish and Optimization

### 13.1 Error Handling
- [ ] Review all error paths
- [ ] Add helpful error messages
- [ ] Add suggestions for common errors
- [ ] Handle edge cases
- [ ] Add validation everywhere

### 13.2 Performance
- [ ] Profile slow operations
- [ ] Optimize skill scanning
- [ ] Cache parsed skills
- [ ] Optimize hash calculation
- [ ] Minimize file I/O

### 13.3 User Experience
- [ ] Add color to output
- [ ] Add spinners for long operations
- [ ] Add progress bars where appropriate
- [ ] Make prompts user-friendly
- [ ] Add success/failure indicators

### 13.4 Code Quality
- [ ] Run ESLint and fix issues
- [ ] Run Prettier on all files
- [ ] Remove unused code
- [ ] Reduce code duplication
- [ ] Add type safety everywhere

## Phase 14: Distribution

### 14.1 NPM Package
- [ ] Review package.json metadata
  - Description
  - Keywords
  - Author
  - License (MIT)
  - Repository URL
  - Homepage URL
  - Bugs URL
- [ ] Add npm ignore file (.npmignore)
  - Exclude tests
  - Exclude source files
  - Include dist only
- [ ] Test package locally
  - `npm pack`
  - Install in test directory
  - Verify CLI works
- [ ] Publish to npm
  - Create npm account
  - `npm publish`
  - Verify installation

### 14.2 Binary Distribution (Future)
- [ ] Research binary compilation options
  - pkg
  - ncc
  - nexe
- [ ] Create build scripts for binaries
- [ ] Test on multiple platforms
  - macOS (arm64, x64)
  - Linux (arm64, x64)
  - Windows (x64)
- [ ] Create release workflow
- [ ] Publish to GitHub releases

### 14.3 GitHub Repository
- [ ] Create GitHub repository
- [ ] Add repository metadata
  - Description
  - Topics/tags
  - License
- [ ] Create issue templates
  - Bug report
  - Feature request
- [ ] Create PR template
- [ ] Set up GitHub Actions
  - Run tests on PR
  - Run lint on PR
  - Publish to npm on tag

## Phase 15: Post-Launch

### 15.1 Testing and Feedback
- [ ] Use CLI in real projects
- [ ] Gather user feedback
- [ ] Fix critical bugs
- [ ] Improve documentation based on questions

### 15.2 Iterate and Improve
- [ ] Add requested features
- [ ] Improve error messages
- [ ] Optimize performance
- [ ] Enhance UX

### 15.3 Community
- [ ] Respond to issues
- [ ] Review PRs
- [ ] Update documentation
- [ ] Maintain CHANGELOG

## Recommended Implementation Order

1. **Week 1**: Phases 1-3 (Setup, Types, Utils)
   - Get basic project structure working
   - Foundation for everything else
   - Set up Jest early

2. **Week 2**: Phases 4-6 (Config, Skills, Templates)
   - Core business logic
   - Set up mock workspace for testing

3. **Week 3**: Phases 7-8 (Target Management, Change Detection)
   - Critical functionality
   - Enables commands to work
   - Start writing integration tests alongside

4. **Week 4**: Phase 9 (Commands)
   - Implement init and sync first (MVP)
   - Write tests for each command as you build
   - Then list, validate, config
   - Finally watch, clean, and rollback

5. **Week 5**: Phases 10-11 (CLI Integration, Complete Testing)
   - Wire everything together
   - Complete integration test suite
   - Test all edge cases and error paths

6. **Week 6**: Phases 12-13 (Documentation, Polish)
   - Make it production-ready
   - Improve UX based on test findings
   - Ensure all tests pass

7. **Week 7**: Phases 14-15 (Distribution, Launch)
   - Publish and iterate
   - Set up CI/CD with test automation

## MVP Scope (Minimum Viable Product)

For a quick MVP, focus on these tasks:
- [ ] Phase 1: Project Setup
- [ ] Phase 2: Core Types
- [ ] Phase 3: Basic Utils (fs-helpers, hash, logger)
- [ ] Phase 4: Config Management
- [ ] Phase 5: Skill Scanning & Parsing
- [ ] Phase 6: Template Engine (default template only)
- [ ] Phase 7: Target File Management
- [ ] Phase 8: Change Detection (basic version)
- [ ] Phase 9.1: Init Command (without interactive prompts)
- [ ] Phase 9.2: Sync Command (basic version, no --only)
- [ ] Phase 10: Basic CLI Integration
- [ ] Phase 11.1-11.4: Basic integration tests (init and sync commands)
- [ ] Phase 12.1: Basic README

With this MVP, users can:
- Initialize skillz with `skillz init --preset agentsmd`
- Sync skills with `skillz sync`
- Get help with `skillz --help`
- Tests ensure basic functionality works

Everything else can be added iteratively.
