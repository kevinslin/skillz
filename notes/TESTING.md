# Testing Guide

## Overview

This project uses **Jest** for integration testing. We focus on integration tests rather than unit tests to ensure the CLI works end-to-end in real-world scenarios.

## Setup

### Install Jest and Dependencies

```bash
npm install -D jest @types/jest ts-jest @jest/globals
```

### Configure Jest

Create `jest.config.js` in the project root:

```javascript
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/*.test.ts'],
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/types/**',
  ],
  coverageDirectory: 'coverage',
  verbose: true,
  testTimeout: 10000,
};
```

### Update package.json Scripts

```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  }
}
```

## Mock Workspace Structure

All integration tests use a mock workspace with realistic Claude skills and configuration files.

### Mock Workspace Layout

```
tests/fixtures/mock-workspace/
├── .claude/
│   └── skills/
│       ├── python-expert/
│       │   └── SKILL.md
│       └── react-patterns/
│           └── SKILL.md
├── AGENTS.md
└── .gitignore
```

### Mock Skill 1: python-expert

**File:** `tests/fixtures/mock-workspace/.claude/skills/python-expert/SKILL.md`

```markdown
---
name: python-expert
description: Expert Python development assistance with best practices, testing, and modern Python features
---

# Python Expert

This skill provides expert-level Python development assistance.

## Capabilities

- Write idiomatic Python code following PEP 8
- Implement type hints and mypy compatibility
- Create comprehensive unit tests with pytest
- Use modern Python features (3.10+)
- Apply design patterns appropriately
- Optimize performance when needed

## Guidelines

1. Always use type hints for function signatures
2. Write docstrings in Google style
3. Prefer composition over inheritance
4. Use dataclasses for data containers
5. Handle errors explicitly with try/except
6. Write tests for all new functions

## Example

```python
from dataclasses import dataclass
from typing import Optional

@dataclass
class User:
    """Represents a user in the system.

    Attributes:
        id: Unique identifier
        name: User's full name
        email: User's email address
    """
    id: int
    name: str
    email: Optional[str] = None

    def send_notification(self, message: str) -> bool:
        """Send a notification to the user.

        Args:
            message: The notification message to send

        Returns:
            True if notification sent successfully, False otherwise
        """
        if not self.email:
            return False
        # Implementation here
        return True
```

## Testing

Always write tests using pytest:

```python
def test_user_notification():
    user = User(id=1, name="John Doe", email="john@example.com")
    assert user.send_notification("Hello") is True

    user_no_email = User(id=2, name="Jane Doe")
    assert user_no_email.send_notification("Hello") is False
```
```

### Mock Skill 2: react-patterns

**File:** `tests/fixtures/mock-workspace/.claude/skills/react-patterns/SKILL.md`

```markdown
---
name: react-patterns
description: Modern React patterns including hooks, composition, performance optimization, and TypeScript integration
---

# React Patterns

This skill provides expertise in modern React development patterns and best practices.

## Capabilities

- Component composition and reusability
- Custom hooks for shared logic
- Performance optimization (memo, useMemo, useCallback)
- TypeScript integration with proper typing
- State management patterns
- Server components and RSC patterns

## Key Patterns

### 1. Compound Components

```typescript
interface TabsProps {
  children: React.ReactNode;
  defaultValue?: string;
}

export function Tabs({ children, defaultValue }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue);

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className="tabs">{children}</div>
    </TabsContext.Provider>
  );
}

Tabs.List = TabsList;
Tabs.Tab = Tab;
Tabs.Panel = TabPanel;
```

### 2. Custom Hooks

```typescript
function useLocalStorage<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(() => {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : initialValue;
  });

  useEffect(() => {
    localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue] as const;
}
```

### 3. Performance Optimization

```typescript
const ExpensiveComponent = memo(({ data }: Props) => {
  const processed = useMemo(() =>
    expensiveOperation(data),
    [data]
  );

  const handleClick = useCallback(() => {
    doSomething(processed);
  }, [processed]);

  return <div onClick={handleClick}>{processed}</div>;
});
```

## Guidelines

1. Use functional components with hooks
2. Keep components small and focused
3. Extract custom hooks for reusable logic
4. Use TypeScript for all components
5. Optimize only when necessary (measure first)
6. Follow React naming conventions
```

### Mock AGENTS.md File

**File:** `tests/fixtures/mock-workspace/AGENTS.md`

```markdown
# My Project Agents

This file contains configuration for AI agents working on this project.

## Project Context

This is a Python web application built with FastAPI and React.

## Code Style

- Python: Follow PEP 8
- React: Use functional components with TypeScript
- Always write tests for new features

## Additional Instructions

You now have access to Skills. Skills are specialized instruction sets stored as markdown files...
[comprehensive skill usage instructions]

### Available Skills

- [python-expert](.claude/skills/python-expert/SKILL.md): Expert Python development assistance with best practices, testing, and modern Python features
- [react-patterns](.claude/skills/react-patterns/SKILL.md): Modern React patterns including hooks, composition, performance optimization, and TypeScript integration
```

### Mock .gitignore

**File:** `tests/fixtures/mock-workspace/.gitignore`

```
node_modules/
dist/
.skillz-cache.json
```

## Setting Up Mock Workspace

Create a helper function to set up the mock workspace for each test:

**File:** `tests/helpers/workspace.ts`

```typescript
import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface MockWorkspace {
  root: string;
  skillsDir: string;
  agentsFile: string;
  cleanup: () => Promise<void>;
}

export async function createMockWorkspace(): Promise<MockWorkspace> {
  // Create temporary directory
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'skillz-test-'));

  // Create directory structure
  const skillsDir = path.join(root, '.claude', 'skills');
  await fs.ensureDir(skillsDir);

  // Create python-expert skill
  const pythonSkillDir = path.join(skillsDir, 'python-expert');
  await fs.ensureDir(pythonSkillDir);
  await fs.writeFile(
    path.join(pythonSkillDir, 'SKILL.md'),
    getPythonExpertSkillContent()
  );

  // Create react-patterns skill
  const reactSkillDir = path.join(skillsDir, 'react-patterns');
  await fs.ensureDir(reactSkillDir);
  await fs.writeFile(
    path.join(reactSkillDir, 'SKILL.md'),
    getReactPatternsSkillContent()
  );

  // Create AGENTS.md
  const agentsFile = path.join(root, 'AGENTS.md');
  await fs.writeFile(agentsFile, getAgentsMdContent());

  // Create .gitignore
  await fs.writeFile(
    path.join(root, '.gitignore'),
    'node_modules/\ndist/\n.skillz-cache.json\n'
  );

  return {
    root,
    skillsDir,
    agentsFile,
    cleanup: async () => {
      await fs.remove(root);
    },
  };
}

function getPythonExpertSkillContent(): string {
  return `---
name: python-expert
description: Expert Python development assistance with best practices, testing, and modern Python features
---

# Python Expert

This skill provides expert-level Python development assistance.

## Capabilities

- Write idiomatic Python code following PEP 8
- Implement type hints and mypy compatibility
- Create comprehensive unit tests with pytest
- Use modern Python features (3.10+)

## Guidelines

1. Always use type hints for function signatures
2. Write docstrings in Google style
3. Prefer composition over inheritance
4. Use dataclasses for data containers
`;
}

function getReactPatternsSkillContent(): string {
  return `---
name: react-patterns
description: Modern React patterns including hooks, composition, performance optimization, and TypeScript integration
---

# React Patterns

This skill provides expertise in modern React development patterns and best practices.

## Key Patterns

### 1. Compound Components
### 2. Custom Hooks
### 3. Performance Optimization

## Guidelines

1. Use functional components with hooks
2. Keep components small and focused
3. Extract custom hooks for reusable logic
`;
}

function getAgentsMdContent(): string {
  return `# My Project Agents

This file contains configuration for AI agents working on this project.

## Project Context

This is a Python web application built with FastAPI and React.
`;
}
```

## Integration Test Scenarios

### Test File Structure

```
tests/
├── integration/
│   ├── init.test.ts
│   ├── sync.test.ts
│   ├── list.test.ts
│   ├── validate.test.ts
│   ├── config.test.ts
│   ├── watch.test.ts
│   ├── clean.test.ts
│   └── rollback.test.ts
├── helpers/
│   ├── workspace.ts
│   └── cli.ts
└── fixtures/
    └── (mock workspace files as described above)
```

### Example Integration Test: Init Command

**File:** `tests/integration/init.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace';
import { execCli } from '../helpers/cli';
import fs from 'fs-extra';
import path from 'path';

describe('init command', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should create skillz.json with agentsmd preset', async () => {
    const result = await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const configPath = path.join(workspace.root, 'skillz.json');
    expect(await fs.pathExists(configPath)).toBe(true);

    const config = await fs.readJson(configPath);
    expect(config.preset).toBe('agentsmd');
    expect(config.targets.map((target) => target.destination)).toContain('AGENTS.md');
  });

  it('should create skillz.json with custom target', async () => {
    const result = await execCli(['init', '--target', '.cursor/rules/skills.mdc', '--no-sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = await fs.readJson(path.join(workspace.root, 'skillz.json'));
    expect(config.targets.map((target) => target.destination)).toContain('.cursor/rules/skills.mdc');
  });

  it('should add additional skill directories', async () => {
    const additionalSkillsDir = path.join(workspace.root, 'custom-skills');
    await fs.ensureDir(additionalSkillsDir);

    const result = await execCli([
      'init',
      '--preset', 'agentsmd',
      '--additional-skills', additionalSkillsDir,
      '--no-sync'
    ], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const config = await fs.readJson(path.join(workspace.root, 'skillz.json'));
    expect(config.additionalSkills).toContain(additionalSkillsDir);
  });

  it('should run sync by default after init', async () => {
    // Remove existing AGENTS.md to test creation
    await fs.remove(workspace.agentsFile);

    const result = await execCli(['init', '--preset', 'agentsmd'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    // Check AGENTS.md was created with managed section
    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('## Additional Instructions');
    expect(agentsContent).toContain('python-expert');
    expect(agentsContent).toContain('react-patterns');
  });

  it('should update .gitignore with cache file', async () => {
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });

    const gitignorePath = path.join(workspace.root, '.gitignore');
    const gitignoreContent = await fs.readFile(gitignorePath, 'utf-8');
    expect(gitignoreContent).toContain('.skillz-cache.json');
  });
});
```

### Example Integration Test: Sync Command

**File:** `tests/integration/sync.test.ts`

```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace';
import { execCli } from '../helpers/cli';
import fs from 'fs-extra';
import path from 'path';

describe('sync command', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
    // Initialize config
    await execCli(['init', '--preset', 'agentsmd', '--no-sync'], {
      cwd: workspace.root,
    });
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should sync skills to AGENTS.md', async () => {
    const result = await execCli(['sync'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('## Additional Instructions');
    expect(agentsContent).toContain('python-expert');
    expect(agentsContent).toContain('react-patterns');
  });

  it('should create cache file after sync', async () => {
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    const cachePath = path.join(workspace.root, '.skillz-cache.json');
    expect(await fs.pathExists(cachePath)).toBe(true);

    const cache = await fs.readJson(cachePath);
    expect(cache.skills['python-expert']).toBeDefined();
    expect(cache.skills['react-patterns']).toBeDefined();
  });

  it('should preserve content outside managed section', async () => {
    const originalContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    const customContent = '## Project Context\n\nThis is custom content.';

    // Add custom content before managed section
    await fs.writeFile(
      workspace.agentsFile,
      customContent + '\n\n' + originalContent
    );

    await execCli(['sync'], {
      cwd: workspace.root,
    });

    const updatedContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(updatedContent).toContain(customContent);
    expect(updatedContent).toContain('## Additional Instructions');
  });

  it('should detect and sync only changed skills', async () => {
    // First sync
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    // Modify one skill
    const pythonSkillPath = path.join(
      workspace.skillsDir,
      'python-expert',
      'SKILL.md'
    );
    let skillContent = await fs.readFile(pythonSkillPath, 'utf-8');
    skillContent += '\n\n## New Section\n\nNew content here.';
    await fs.writeFile(pythonSkillPath, skillContent);

    // Second sync with verbose
    const result = await execCli(['sync', '--verbose'], {
      cwd: workspace.root,
    });

    expect(result.stdout).toContain('modified');
    expect(result.stdout).toContain('python-expert');
  });

  it('should create backup before syncing', async () => {
    // First sync to create initial state
    await execCli(['sync'], {
      cwd: workspace.root,
    });

    // Modify and sync again
    const pythonSkillPath = path.join(
      workspace.skillsDir,
      'python-expert',
      'SKILL.md'
    );
    await fs.appendFile(pythonSkillPath, '\n\nNew content.');

    await execCli(['sync'], {
      cwd: workspace.root,
    });

    // Check for backup file
    const backupFiles = await fs.readdir(workspace.root);
    const hasBackup = backupFiles.some(f =>
      f.startsWith('AGENTS.md.backup-')
    );
    expect(hasBackup).toBe(true);
  });

  it('should support --dry-run mode', async () => {
    const originalContent = await fs.readFile(workspace.agentsFile, 'utf-8');

    const result = await execCli(['sync', '--dry-run'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('dry run');

    // File should not be modified
    const afterContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(afterContent).toBe(originalContent);
  });

  it('should support --only flag to sync specific skills', async () => {
    const result = await execCli(['sync', '--only', 'python-expert'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
    expect(agentsContent).toContain('python-expert');
    // Should still contain react-patterns from previous state if it existed
  });

  it('should skip backup when --no-backup flag is used', async () => {
    await execCli(['sync', '--no-backup'], {
      cwd: workspace.root,
    });

    const files = await fs.readdir(workspace.root);
    const hasBackup = files.some(f => f.startsWith('AGENTS.md.backup-'));
    expect(hasBackup).toBe(false);
  });
});
```

### CLI Helper

**File:** `tests/helpers/cli.ts`

```typescript
import { spawn } from 'child_process';
import path from 'path';

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

export interface CliOptions {
  cwd?: string;
  env?: Record<string, string>;
}

export async function execCli(
  args: string[],
  options: CliOptions = {}
): Promise<CliResult> {
  const cliPath = path.join(__dirname, '../../dist/cli.js');

  return new Promise((resolve, reject) => {
    const child = spawn('node', [cliPath, ...args], {
      cwd: options.cwd || process.cwd(),
      env: { ...process.env, ...options.env },
    });

    let stdout = '';
    let stderr = '';

    child.stdout.on('data', (data) => {
      stdout += data.toString();
    });

    child.stderr.on('data', (data) => {
      stderr += data.toString();
    });

    child.on('close', (code) => {
      resolve({
        exitCode: code || 0,
        stdout,
        stderr,
      });
    });

    child.on('error', (error) => {
      reject(error);
    });
  });
}
```

## Running Tests

### Run All Tests

```bash
npm test
```

### Run Tests in Watch Mode

```bash
npm run test:watch
```

### Run Tests with Coverage

```bash
npm run test:coverage
```

### Run Specific Test File

```bash
npm test -- tests/integration/sync.test.ts
```

### Run Tests Matching Pattern

```bash
npm test -- --testNamePattern="sync command"
```

## Test Coverage Goals

Aim for the following integration test coverage:

- [ ] **Init Command**
  - Initialize with presets (agentsmd, aider)
  - Initialize with custom target
  - Initialize with additional skill directories
  - Initialize with global skills
  - Auto-sync after init
  - Skip sync with --no-sync
  - Update .gitignore

- [ ] **Sync Command**
  - Sync all skills to target
  - Create cache file
  - Preserve content outside managed section
  - Detect changed skills
  - Create backups
  - Dry run mode
  - Force mode
  - No backup mode
  - Sync only specific skills (--only)
  - Multiple target files

- [ ] **List Command**
  - List all skills
  - List with table format
  - List with JSON format
  - List with markdown format
  - Filter synced only
  - Filter unsynced only

- [ ] **Validate Command**
  - Validate config file
  - Validate skill files
  - Detect invalid skill names
  - Detect invalid descriptions
  - Detect missing frontmatter
  - Detect duplicate skills

- [ ] **Config Command**
  - View entire config
  - View specific key
  - Set config value
  - Add to array (--add)
  - Remove from array (--remove)

- [ ] **Watch Command**
  - Watch for file changes
  - Auto-sync on changes
  - Debouncing works
  - Custom interval
  - Handle errors without crashing

- [ ] **Clean Command**
  - Remove managed section
  - Remove cache file
  - Dry run mode
  - Keep backup
  - Confirmation prompt

- [ ] **Rollback Command**
  - Rollback to latest backup
  - List available backups
  - Rollback specific file
  - Confirmation prompt

## Debugging Tests

### Enable Verbose Output

Set environment variable to see detailed logs:

```bash
DEBUG=skillz npm test
```

### Keep Test Workspace

Modify the test to not cleanup:

```typescript
afterEach(async () => {
  console.log('Workspace location:', workspace.root);
  // await workspace.cleanup(); // Comment out to inspect
});
```

### Run Single Test

```bash
npm test -- -t "should sync skills to AGENTS.md"
```

## Continuous Integration

### GitHub Actions Workflow

Create `.github/workflows/test.yml`:

```yaml
name: Tests

on:
  push:
    branches: [main]
  pull_request:
    branches: [main]

jobs:
  test:
    runs-on: ubuntu-latest

    strategy:
      matrix:
        node-version: [18.x, 20.x]

    steps:
    - uses: actions/checkout@v3

    - name: Use Node.js ${{ matrix.node-version }}
      uses: actions/setup-node@v3
      with:
        node-version: ${{ matrix.node-version }}

    - name: Install dependencies
      run: npm ci

    - name: Build
      run: npm run build

    - name: Run tests
      run: npm test

    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/coverage-final.json
```

## Best Practices

1. **Isolation**: Each test should create its own mock workspace
2. **Cleanup**: Always cleanup temporary files in afterEach
3. **Real CLI**: Test the actual CLI binary, not internal functions
4. **Assertions**: Verify both exit codes and file contents
5. **Edge Cases**: Test error conditions and edge cases
6. **Timeouts**: Set reasonable timeouts for long-running operations
7. **Deterministic**: Tests should be deterministic and not flaky
8. **Readable**: Use descriptive test names that explain what's being tested

## Troubleshooting

### Tests Hang

- Check for missing cleanup in afterEach
- Check for unclosed file handles
- Increase test timeout in jest.config.js

### Permission Errors

- Ensure temporary directories are writable
- Check file permissions in cleanup function

### Path Issues

- Use path.join for cross-platform compatibility
- Resolve paths relative to test workspace root
- Use absolute paths when spawning CLI

### Flaky Tests

- Ensure proper cleanup between tests
- Don't rely on timing (use deterministic checks)
- Mock external dependencies if needed
