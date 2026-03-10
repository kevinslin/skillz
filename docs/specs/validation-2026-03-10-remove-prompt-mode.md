# Feature Validation: Remove Prompt Mode

## Purpose

This is a validation spec, used to list post-testing validation that must be performed
by the user to confirm the feature implementation and testing is adequate

It should be updated during the development process, then kept as a record for later
context once implementation is complete.

**Feature Plan:** [2026-03-10-remove-prompt-mode.md](./2026-03-10-remove-prompt-mode.md)

**Implementation Plan:** [2026-03-10-remove-prompt-mode.md](./2026-03-10-remove-prompt-mode.md)

## Stage 4: Validation Stage

> AGENT INSTRUCTIONS:
> 
> Review all implementation and testing done to date and fill in the sections below with
> automated validation that has been done and remaining manual validation needed.

## Validation Planning

- Primary automated coverage should remain integration-first because sync behavior is exercised through the built CLI.
- The validation set must prove both the supported native-only path and the explicit failure behavior for legacy prompt-era config.

## Automated Validation (Testing Performed)

> Describe the testing already performed and any additional testing needed to validate
> this feature is working end to end and reviewable by the user.

Completed automated coverage:
- Updated native sync integration fixtures to omit supported `syncMode` usage while preserving copy, dry-run, cache reuse, duplicate handling, and stale cleanup coverage.
- Added legacy-config failure coverage for prompt-style config and legacy file-target destinations.
- Updated init and environment detection integration tests to expect `.skills` targets and no prompt-only persisted fields.
- Kept create-related integration coverage in the full suite so `skill-interactive.hbs` remains validated after sync template cleanup.

### Unit Testing

> List all unit testing that’s been done and add any additional unit tests needed.

- No new unit-only validation was added.

### Integration and End-to-End Testing

> List all integration testing and end-to-end testing that’s been done and add any
> additional unit tests needed.

Executed integration/full-suite runs:
- `npm test -- tests/integration/native-sync.test.ts tests/integration/sync.test.ts tests/integration/init.test.ts tests/integration/environment-detector.test.ts tests/integration/info.test.ts tests/integration/create.test.ts`
- `npm test`

### Manual Testing Needed

> Describe the steps the user should take to validate this feature is working as
> expected.
> 
> Give a detailed list of manual validation steps the user must perform to confirm the
> code and features implemented in these specs.
> 
> Do NOT include tests that are already automated and included and have been validated
> as part of the implementation plan.
> 
> Include all aspects of workflows that the user should test, or aspects that may be new
> to the user and they should see to be completely current on the system:
> 
> - Any new backend workflows that need a sanity check or manual inspection
>
> - Exact CLI commands that the user should validate and also confirm the output and
>   styling are correct
>
> - Sanity checking database state or file state, especially if the user has not seen
>   these
>
> - All visual or UX changes to any web or GUI interfaces.
>
> - The most common workflows involving these UX changes

- Create a temp workspace with `.claude/skills` and run `node dist/cli.js init --preset agentsmd --no-sync`; inspect `skillz.json` and confirm the target is `.skills` with no prompt-era config fields.
- In the same workspace, run `node dist/cli.js sync` and confirm copied skill directories appear under `.skills/` rather than any instruction file being modified.
- Create a legacy-style `skillz.json` with `targets: [{ "destination": "AGENTS.md", "syncMode": "prompt" }]` and run `node dist/cli.js sync`; confirm the command fails with a migration-oriented error and does not create an `AGENTS.md/` directory.
- Review updated `README.md` and `CLAUDE.md` to confirm all sync guidance is native-only and no prompt-mode examples remain.
> 
> When done:
> 
> - Ask the user to do a full post-implementation review, including the acceptance
>   testing above.
>
> - Ask for any further updates or revisions needed.
>
> - Add all feedback and requests for revisions below.
>
> - Add new Phase above and revise the implementation if necessary.
