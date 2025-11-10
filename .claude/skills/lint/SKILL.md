---
name: lint
description: lint project (project, gitignored)
---

# Lint Project

This skill ensures code quality by running formatting and linting checks on the project.

## When to Use

Invoke this skill:

- After making significant code changes
- Before committing code
- When explicitly asked to check code quality
- After implementing new features or fixing bugs
- When finishing a development session

## Commands to Run

Run these commands **in sequence** and check their exit codes:

1. **Format check**

   ```bash
   npm run format
   ```

2. **Lint check**
   ```bash
   npm run lint
   ```

## Expected Behavior

### Success (Exit Code 0)

- Both commands complete without errors
- Report: "✅ All lint checks passed"
- No further action needed

### Failure (Non-Zero Exit Code)

- One or both commands failed
- **Report the specific failures** to the user
- **Show the error output** from the failed command(s)
- **Offer to fix** the issues if they are auto-fixable

## Example Output Format

When all checks pass:

```
✅ Formatting check passed
✅ Lint check passed

All code quality checks completed successfully.
```

When checks fail:

```
❌ Formatting check failed
npm run format exited with code 1

Error output:
[actual error messages]

❌ Lint check failed
npm run lint exited with code 2

Error output:
[actual error messages]

Would you like me to fix these issues?
```

## Auto-Fixing

If errors are found:

- Prettier formatting issues can be auto-fixed with `npm run format`
- Some ESLint issues can be auto-fixed with `npm run lint -- --fix`
- Complex lint errors may require manual intervention

## Important Notes

- Run both commands even if the first one fails (to get complete report)
- Always report exit codes to the user
- Don't assume success - verify the exit code
- Provide actionable feedback based on the specific errors
