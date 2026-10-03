# 0006: Enforced Quality Checks

- Status: Accepted
- Date: 2026-10-03
- Extends: [0004: GitHub delivery](0004-github-delivery.md)

## Context

The agent-authored service requires verifiable code quality, reproducible tests,
reviewed dependencies, and documentation consistent with implemented behavior.

## Decision

Require four GitHub checks: `quality`, `container`, `security`, and `documentation`.
Apply them to PRs into `main` and `development` and to release verification.

Enforce 100% line and branch coverage for application code. Test observable
behavior through public boundaries and use local fixtures, fakes, or containers
for remote integrations. Strict typing includes application code, tests, and
Python scripts. Validate Compose and workflow configuration with established CLIs.

Audit hash-pinned runtime and development dependencies with pip-audit and inspect
license metadata with pip-licenses against an exact project list. Advisory
exceptions have an individual justification, owner, and expiry. Review dependency
changes and fix findings as part of those changes.

Check versioned Markdown with PyMarkdown and local file links with Lychee in
offline mode. Keep English documentation positive, self-contained, and aligned
with implemented behavior. Publish test and quality reports as CI artifacts with
14-day retention. The owner reviews PRs and GitHub's active ruleset enforces them
for both permanent branches with an empty bypass list.

## Consequences

Changes carry repeatable validation evidence, coverage gaps fail CI, and dependency
findings receive explicit review. Local quality commands match CI. The advisory
check requires network access to its vulnerability data source; application tests
use controlled local inputs. [Quality checks](../quality.md) define the commands
and exception records.
