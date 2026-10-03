# Quality Foundation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Enforce the coding-agent rules, test coverage, dependency audits, and
documentation checks for the Python MCP service.

**Architecture:** Preserve the HTTP runtime and add deterministic verification
around its public contracts. Four GitHub checks govern permanent-branch updates
and release publication. Established tools implement the quality workflow.

**Tech stack:** Python 3.12, uv, pytest-cov, strict mypy, Ruff, pip-audit,
pip-licenses, PyMarkdown, Lychee 0.24.2, actionlint 1.7.7, Docker, GitHub Actions.

**Specification:** [Established tools](../../adr/0005-established-technical-tools.md)
and [enforced quality](../../adr/0006-enforced-quality-checks.md).

## Constraints

- English, positive, self-contained project text; MIT-licensed agent-authored code.
- Implement on `feature/quality-foundation` and hand off through a PR to `development`.
- Enforce 100% line and branch coverage for application code and strict typing
  for application code, tests, and Python scripts.
- Use local inputs for application tests and the advisory service for dependency audits.
- Require `quality`, `container`, `security`, and `documentation` on both permanent branches.
- Preserve PR-only history, force-push and deletion protection, and an empty bypass list.

## Review Focus

- Startup tests exercise the configuration consumed by the server.
- Dependency audits include runtime and development packages from the lockfile.
- License decisions use explicit complete names and expressions.
- Documentation checks include versioned hidden-directory Markdown and staged additions.
- Required checks run for PRs and release verification with authenticated administration.

## Tasks

### Task 1: Tests, types, and dependency tooling

- [x] Enable coverage enforcement and demonstrate the existing startup coverage gap.
- [x] Cover default and configured ports, valid boundaries, and the module entrypoint.
- [x] Type test boundaries and check `src`, `tests`, and `scripts` with strict mypy.
- [x] Lock audit/documentation tools and inspect dependency license metadata.
- [x] Audit dependencies and update the vulnerable HTTP framework to a fixed release.

### Task 2: Rules, documentation, and CI

- [x] Add focused agent rules, public-boundary test guidance, and review requirements.
- [x] Record ADRs and document local commands, licensing, and advisory exception handling.
- [x] Define four automatic jobs, report artifacts, and Compose/workflow validation.
- [x] Verify local checks, container startup, MCP behavior, packaging, and the complete diff.

### Task 3: GitHub integration

- [ ] Commit and push the verified feature branch.
- [ ] Create its PR to `development` with authenticated GitHub access.
- [ ] Apply the four-check ruleset using repository administrator authentication.
- [ ] Verify effective branch rules and successful GitHub checks on the PR.
