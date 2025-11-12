import fs from 'fs-extra';
import path from 'path';
import os from 'os';

export interface MockWorkspace {
  root: string;
  skillsDir: string;
  agentsFile: string;
  cleanup: () => Promise<void>;
}

export interface CreateMockWorkspaceOptions {
  skipAgentsMd?: boolean;
}

export async function createMockWorkspace(
  options: CreateMockWorkspaceOptions = {}
): Promise<MockWorkspace> {
  // Create temporary directory
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'skillz-test-'));

  // Create directory structure
  const skillsDir = path.join(root, '.claude', 'skills');
  await fs.ensureDir(skillsDir);

  // Create python-expert skill
  const pythonSkillDir = path.join(skillsDir, 'python-expert');
  await fs.ensureDir(pythonSkillDir);
  await fs.writeFile(path.join(pythonSkillDir, 'SKILL.md'), getPythonExpertSkillContent());

  // Create react-patterns skill
  const reactSkillDir = path.join(skillsDir, 'react-patterns');
  await fs.ensureDir(reactSkillDir);
  await fs.writeFile(path.join(reactSkillDir, 'SKILL.md'), getReactPatternsSkillContent());

  // Create AGENTS.md (unless skipAgentsMd is true)
  const agentsFile = path.join(root, 'AGENTS.md');
  if (!options.skipAgentsMd) {
    await fs.writeFile(agentsFile, getAgentsMdContent());
  }

  // Create .gitignore
  await fs.writeFile(path.join(root, '.gitignore'), 'node_modules/\ndist/\n.skillz-cache.json\n');

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
