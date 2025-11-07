---
name: testing
description: Guidelines for writing integration and unit tests for the skillz CLI
---

# Testing Guidelines for Skillz CLI

## Testing Philosophy

Skillz uses **integration tests** as the primary testing strategy. Integration tests:
- Test the full CLI as a real user would interact with it
- Catch issues that unit tests might miss (like import problems, config issues)
- Provide confidence that the actual user experience works correctly
- Are easier to maintain as the codebase evolves

Unit tests are used sparingly for complex logic that needs isolated testing.

## Test Structure

### Location
- Integration tests: `tests/integration/*.test.ts`
- Unit tests: `tests/core/*.test.ts` (use sparingly)
- Test helpers: `tests/helpers/*.ts`

### Available Test Helpers

#### `createMockWorkspace()` (tests/helpers/workspace.ts)
Creates a temporary workspace with realistic test fixtures:
- Two mock skills: `python-expert` and `react-patterns`
- An `AGENTS.md` fixture with existing content
- Automatic cleanup via `workspace.cleanup()`

```typescript
const workspace = await createMockWorkspace();
try {
  // Your test code
  console.log(workspace.root); // Temp directory path
  console.log(workspace.skillsDir); // .claude/skills path
  console.log(workspace.agentsFile); // AGENTS.md path
} finally {
  await workspace.cleanup();
}
```

#### `execCli()` (tests/helpers/cli.ts)
Spawns the actual CLI process and captures output:
```typescript
const result = await execCli(['init', '--preset', 'agentsmd'], {
  cwd: workspace.root,
});

expect(result.exitCode).toBe(0);
expect(result.stdout).toContain('Initialization complete');
```

## Writing Integration Tests

### Template
```typescript
import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import { createMockWorkspace, MockWorkspace } from '../helpers/workspace.js';
import { execCli } from '../helpers/cli.js';
import fs from 'fs-extra';
import path from 'path';

describe('my command', () => {
  let workspace: MockWorkspace;

  beforeEach(async () => {
    workspace = await createMockWorkspace();
  });

  afterEach(async () => {
    await workspace.cleanup();
  });

  it('should do something', async () => {
    const result = await execCli(['my-command', '--flag'], {
      cwd: workspace.root,
    });

    expect(result.exitCode).toBe(0);

    // Check file was created
    const outputPath = path.join(workspace.root, 'output.txt');
    expect(await fs.pathExists(outputPath)).toBe(true);

    // Check file contents
    const content = await fs.readFile(outputPath, 'utf-8');
    expect(content).toContain('expected text');
  });
});
```

### Best Practices

1. **Always use beforeEach/afterEach** for workspace setup/cleanup
2. **Test the CLI as a real process** using `execCli()` - don't import command functions directly
3. **Check both exit codes and file system changes**
4. **Test error conditions** - verify commands fail appropriately
5. **Use snapshots sparingly** - only for complex output that's unlikely to change frequently
6. **Keep tests independent** - each test should work in isolation

### Common Test Patterns

#### Testing Configuration Files
```typescript
const config = (await fs.readJson(
  path.join(workspace.root, 'skillz.json')
)) as Config;
expect(config.preset).toBe('agentsmd');
```

#### Testing Generated Content
```typescript
const agentsContent = await fs.readFile(workspace.agentsFile, 'utf-8');
expect(agentsContent).toContain('BEGIN SKILLZ MANAGED SECTION');
expect(agentsContent).toContain('python-expert');
```

#### Testing Flags
```typescript
// --dry-run should not modify files
const result = await execCli(['sync', '--dry-run'], {
  cwd: workspace.root,
});
expect(result.exitCode).toBe(0);
expect(await fs.pathExists(cachePath)).toBe(false);
```

## Jest Configuration

### Current Setup (jest.config.cjs)
- **Preset**: `ts-jest/presets/default-esm` - ES modules support
- **Test Environment**: Node.js
- **Timeout**: 10 seconds (integration tests can be slow)
- **Transform**: TypeScript files with ESM enabled
- **Module Resolution**: Maps `.js` imports to `.ts` files

### Known Issues

#### ESM Modules (chalk, ora, etc.)
Some dependencies use ESM-only syntax that Jest struggles with. If you encounter:
```
SyntaxError: Cannot use import statement outside a module
```

**Solutions:**
1. **Mock the module** (preferred for unit tests):
```typescript
jest.unstable_mockModule('../../src/utils/logger.js', () => ({
  info: jest.fn(),
  success: jest.fn(),
  // ... etc
}));
```

2. **Skip the test** if it's redundant with integration tests:
```typescript
it.skip('test description', async () => {
  // Test code
});
```

3. **Use integration tests instead** - they run the compiled code, avoiding ESM issues

## Running Tests

```bash
# Run all tests
npm test

# Run with coverage
npm run test:coverage

# Run in watch mode (during development)
npm run test:watch

# Update snapshots
npm test -- -u

# Run specific test file
npm test -- init.test.ts

# Run with verbose output
npm test -- --verbose
```

## Test Coverage Goals

Focus on:
- ✅ All commands have integration tests
- ✅ Happy path scenarios work
- ✅ Error conditions handled gracefully
- ✅ File system changes are correct
- ✅ CLI flags work as documented

Don't over-test:
- ❌ Internal implementation details
- ❌ Third-party library behavior
- ❌ Simple utility functions (unless complex)

## Debugging Tests

### Inspect workspace state
```typescript
it('should do something', async () => {
  const workspace = await createMockWorkspace();
  try {
    await execCli(['my-command'], { cwd: workspace.root });

    // Add this to see what files exist
    console.log('Files:', await fs.readdir(workspace.root));
    console.log('Config:', await fs.readFile(
      path.join(workspace.root, 'skillz.json'),
      'utf-8'
    ));
  } finally {
    await workspace.cleanup();
  }
});
```

### Keep workspace for manual inspection
```typescript
const workspace = await createMockWorkspace();
console.log('Workspace at:', workspace.root);
// Comment out cleanup temporarily:
// await workspace.cleanup();
// Then inspect: ls -la /tmp/skillz-test-XXXXX
```

## Adding Tests for New Commands

When implementing a new command (e.g., `list`), create:

1. **tests/integration/list.test.ts** with 3-5 tests:
   - Basic functionality works
   - Flags work correctly
   - Error conditions handled
   - Edge cases (empty directories, etc.)

2. Follow the existing pattern from `init.test.ts` or `sync.test.ts`

3. Ensure tests are in the test suite by running `npm test`

## Summary

- **Prefer integration tests** over unit tests
- **Use test helpers** (`createMockWorkspace`, `execCli`)
- **Test real CLI behavior** by spawning processes
- **Clean up properly** with beforeEach/afterEach
- **Focus on user-visible behavior**, not implementation
- **Mock sparingly** - only when necessary for isolation
