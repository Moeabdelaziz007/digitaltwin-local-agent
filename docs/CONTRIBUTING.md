# Contributing to DigitalMiniTwin 🤝

Thank you for your interest in helping build a sovereign, local-first AI future.

## Development Setup
1.  Fork the repository.
2.  Follow the **Quick Start** in the `README.md`.
3.  Ensure your local `whisper.cpp` build is working.

## Guidelines
- **Local First**: Any new feature must be functional without an internet connection.
- **Privacy First**: Avoid adding dependencies that require cloud telemetry.
- **Code Style**:
    - **Frontend**: Use Next.js 15 patterns and Tailwind v4.
    - **Go**: Follow standard `gofmt` and modular swarm patterns.

## Branching & PRs
1.  Create a branch with a descriptive name (`feat/voice-vAD` or `fix/orb-drag`).
2.  Open a Pull Request with a clear description of the change.
3.  Ensure all CI checks pass.

## Commit Messages
Use [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: ...`
- `fix: ...`
- `docs: ...`
- `style: ...`

## Deployment Checklist
Before merging/deploying, verify all of the following locally or in CI:
- `npm run check:env` passes with required environment variables present.
- `npm run typecheck` passes with zero TypeScript errors.
- `npm run lint` passes with zero warnings (critical rules fail the build).
- `npm run build` passes.
- `npm run check:smoke` passes for auth/signature guards:
  - `/api/conversation` unauthorized branch.
  - `/api/cron/decay` CRON secret guard.
  - `/api/webhooks/clerk` signature verification requirement.
- `npm run check:memory-dataset` passes to verify memory eval dataset metadata/version alignment.

## Memory Eval Dataset Versioning
- Source of truth: `eval/datasets/memory/baseline.json`.
- Required fields: `dataset_version`, `source`, and `cases[]`.
- CI guard: `scripts/check-memory-dataset-version.js` (invoked by `scripts/quality-gate.sh`).
- Keep `dataset_version` bumped when cases/expected behavior change, to prevent eval history drift.
