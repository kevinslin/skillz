# Next Steps - Implementation Plan

## Priority: Complete MVP Commands

The core `init` and `sync` commands are working. Now we need to complete the remaining commands to have a fully functional CLI.

## Recommended Implementation Order

### Step 1: List Command (Easiest - ~30 mins)
**Why first:** Simple, no complex logic, good for momentum

**Tasks:**
1. Create `src/commands/list.ts`
2. Implement basic table listing with cli-table3
3. Add --format flag (table, json, markdown)
4. Add --synced-only and --unsynced-only filters
5. Register command in CLI
6. Write 3-4 integration tests

**Files to create/modify:**
- `src/commands/list.ts` (new)
- `src/cli.ts` (update)
- `tests/integration/list.test.ts` (new)

---

### Step 2: Validate Command (~45 mins)
**Why second:** Useful for debugging, builds on existing validation

**Tasks:**
1. Create `src/commands/validate.ts`
2. Validate skillz.json with existing Zod schemas
3. Scan and validate all skills
4. Check file permissions
5. Detect duplicates
6. Generate formatted report with colors
7. Register command in CLI
8. Write 4-5 integration tests

**Files to create/modify:**
- `src/commands/validate.ts` (new)
- `src/cli.ts` (update)
- `tests/integration/validate.test.ts` (new)

---

### Step 3: Config Command (~30 mins)
**Why third:** Useful utility, leverages existing config functions

**Tasks:**
1. Create `src/commands/config.ts`
2. Implement view config (all or specific key)
3. Implement set config value
4. Implement array operations (--add, --remove)
5. Pretty print with colors
6. Register command in CLI
7. Write 4-5 integration tests

**Files to create/modify:**
- `src/commands/config.ts` (new)
- `src/cli.ts` (update)
- `tests/integration/config.test.ts` (new)

---

### Step 4: Clean Command (~30 mins)
**Why fourth:** Simple cleanup utility

**Tasks:**
1. Create `src/commands/clean.ts`
2. Remove managed section from targets
3. Remove .skillz-cache.json
4. Add --dry-run mode
5. Add confirmation prompt with inquirer
6. Register command in CLI
7. Write 3-4 integration tests

**Files to create/modify:**
- `src/commands/clean.ts` (new)
- `src/cli.ts` (update)
- `tests/integration/clean.test.ts` (new)

---

### Step 5: Watch Command (~60 mins)
**Why last:** Most complex, requires chokidar and event handling

**Tasks:**
1. Create `src/commands/watch.ts`
2. Set up chokidar file watcher
3. Implement debouncing logic
4. Add --interval flag
5. Add --no-debounce flag
6. Handle SIGINT for graceful shutdown
7. Auto-sync on changes
8. Register command in CLI
9. Write 4-5 integration tests (may need timeout handling)

**Files to create/modify:**
- `src/commands/watch.ts` (new)
- `src/cli.ts` (update)
- `tests/integration/watch.test.ts` (new)

---

### Step 6: Final Integration Tests (~30 mins)
**Why important:** Ensure everything works together

**Tasks:**
1. Create end-to-end workflow tests
2. Test multiple targets
3. Test multiple skill directories
4. Test error conditions

**Files to create/modify:**
- `tests/integration/workflows.test.ts` (new)

---

### Step 7: Documentation (~45 mins)
**Why important:** Make it usable for others

**Tasks:**
1. Write comprehensive README.md
   - Installation
   - Quick start
   - All commands with examples
   - Configuration reference
   - Troubleshooting
2. Add detailed command help text
3. Create CHANGELOG.md (for v0.1.0)
4. Update package.json description/keywords

**Files to create/modify:**
- `README.md` (comprehensive)
- `CHANGELOG.md` (new)
- `package.json` (update metadata)

---

### Step 8: Polish & Testing (~30 mins)
**Why important:** Professional quality

**Tasks:**
1. Run `npm run lint` and fix all issues
2. Run `npm run format` on all files
3. Review all error messages for clarity
4. Add suggestions to error messages
5. Test all commands manually
6. Run full test suite
7. Check test coverage

**Commands to run:**
```bash
npm run lint
npm run format
npm test
npm run test:coverage
```

---

## Total Estimated Time: ~4.5 hours

## Testing Strategy for Each Command

For each command, write tests that cover:
1. ✅ Basic functionality works
2. ✅ Flags work correctly
3. ✅ Error conditions handled
4. ✅ Edge cases (empty directories, missing files, etc.)

## Definition of Done

A command is "complete" when:
- ✅ Implementation file created
- ✅ Registered in CLI with proper options
- ✅ Help text added
- ✅ Integration tests written
- ✅ All tests passing
- ✅ Manually tested
- ✅ Error handling verified

## After All Commands Complete

### Optional Enhancements (Future)
- Binary distribution with `pkg`
- GitHub Actions CI/CD
- NPM publishing
- VSCode extension
- More templates (Cursor, Aider specific)
- Remote skills support
- Skill marketplace

## Immediate Next Action

**Start with:** List Command (Step 1)

This is the easiest and will give quick momentum. It's also immediately useful for users to see what skills they have.

```bash
# Implementation order:
1. src/commands/list.ts
2. Update src/cli.ts
3. tests/integration/list.test.ts
4. npm test (verify passing)
5. Manual test: node dist/cli.js list
```

Ready to proceed?
