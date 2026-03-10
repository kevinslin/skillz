# Feature Validation: Remove Prompt Mode

## Purpose

Track automated and manual validation for the prompt-mode removal change. This task keeps managed-file syncing as the default behavior while narrowing the public config model to an optional `native` mode only.

**Feature Plan:** `docs/project/specs/active/2026-03-10-remove-prompt-mode.md`

**Implementation Plan:** `docs/project/specs/active/2026-03-10-remove-prompt-mode.md`

## Stage 4: Validation Stage

This validation spec is paired with the feature spec above and will be updated as implementation and test execution complete.

## Validation Planning

- Preserve existing integration coverage for syncing to `AGENTS.md` and preset-driven init flows.
- Preserve existing integration coverage for native syncing to `.skills`.
- Add or update coverage for mixed file/native targets without relying on `syncMode: "prompt"`.
- Confirm config validation rejects explicit `syncMode: "prompt"`.

## Automated Validation (Testing Performed)

Completed:
- `npm run format`
- `npm run lint`
- `npm test -- --runInBand tests/integration/sync.test.ts tests/integration/native-sync.test.ts tests/integration/init.test.ts`
- `npm test`

### Unit Testing

- Review whether schema validation is exercised directly today.
- Integration coverage now exercises config validation for rejecting `prompt` via `tests/integration/native-sync.test.ts`.

### Integration and End-to-End Testing

Planned:
- `npm test -- --runInBand tests/integration/sync.test.ts`
- `npm test -- --runInBand tests/integration/native-sync.test.ts`
- `npm test -- --runInBand tests/integration/init.test.ts`
- `npm test`

### Manual Testing Needed

1. Create a workspace config with `targets: [{ "destination": "AGENTS.md" }]` and run `skillz sync`. Confirm the managed section is written to `AGENTS.md`.
2. Create a workspace config with `targets: [{ "destination": ".skills", "syncMode": "native" }]` and run `skillz sync`. Confirm skill directories are copied into `.skills/`.
3. Create a workspace config with `targets: [{ "destination": "AGENTS.md", "syncMode": "prompt" }]` and run `skillz sync`. Confirm the CLI rejects the config with a validation error mentioning the unsupported value.
4. Create a mixed-target config with one file target and one native target, leaving the file target without `syncMode`. Confirm both targets sync successfully in one run.

Post-implementation review:
- Review the updated README and maintainer docs to confirm they no longer advertise prompt mode.
- Request any follow-up adjustments if file-target terminology is still unclear or inconsistent.

## Manual Notes 

[keep this for the user to add notes. do not change between edits]

## Changelog
- 2026-03-10: Created validation spec for prompt-mode removal task (`019cbc96-c95b-70f2-9ce6-b811a5f2fd32`)
- 2026-03-10: Recorded completed automated validation commands and remaining manual checks (`019cbc96-c95b-70f2-9ce6-b811a5f2fd32`)
