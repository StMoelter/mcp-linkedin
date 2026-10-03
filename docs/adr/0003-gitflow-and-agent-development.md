# 0003: Gitflow and Agent-Authored Development

- Status: Accepted
- Date: 2026-10-03

## Context

The project is entirely written by coding agents, uses English and the MIT
License, and requires Gitflow with protected permanent branches.

## Decision

Use `main` for releases and `development` for integration. Bootstrap both from
the initial foundation commit. Develop on `feature/*`, prepare versions on
`release/*`, and correct releases on `hotfix/*`. Route subsequent permanent-branch
changes through pull requests with merge commits and required CI checks.

An active GitHub ruleset protects both branches, including administrator actions,
through an empty bypass list. It preserves history and branch retention. The
owner reviews agent-authored PRs with an initial required-approval count of zero.
Human direction and review guide the agents. MIT copyright belongs to Steffen
Moelter. `AGENTS.md` defines the working contract.

## Consequences

Release history and integration history remain distinct and connected. Releases
and hotfixes are synchronized by merging main into a topic branch created from
development, then submitting its PR to development. This keeps the PR current
with its target under strict required-status checks. Agent-authored
changes carry their validation evidence, and GitHub enforces the merge workflow.
