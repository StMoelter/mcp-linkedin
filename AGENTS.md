# Coding Agent Instructions

## Project contract

This project is implemented entirely by coding agents under human direction.
Use English for code, identifiers, comments, documentation, commits, and pull
requests. Write documentation positively: describe supported behavior, concrete
configuration, and operational responsibilities.

The project uses the MIT License. Preserve its copyright and license notices.

## Architecture

- Use Python 3.12 as the baseline and `src/mcp_linkedin` for the package.
- Use the official MCP Python SDK for protocol handling and Streamable HTTP.
- Keep `/mcp` as the protocol endpoint and `/health` as the HTTP health endpoint.
- Run the MCP session manager for the application's complete lifespan.
- Serve HTTP in Docker; the trusted reverse proxy owns HTTPS, public routing,
  Host and Origin validation, and backend access control.
- Keep configuration in environment variables and validate it at startup.
- Keep LinkedIn credentials in runtime secret storage and redact them in logs.
- Add LinkedIn features as focused components with explicit authorization,
  typed inputs, and behavior tests.

## Gitflow

`main` contains releases. `development` integrates work. Treat both branches as
protected: route every update through a pull request and preserve their existing
history with forward-moving merge commits. Branch rules apply to administrators
and agents alike.

Create `feature/<topic>` from `development`, `release/<version>` from
`development`, and `hotfix/<topic>` from `main`. Open feature PRs into
`development`. Merge release and hotfix PRs into `main`, then create a
`feature/sync-main-<version>` branch from `development`, merge `main` into that
topic branch, and open its PR into `development`. Keep topic branches current
with their PR target using merge commits. Use ordinary pushes on topic branches.

Read [CONTRIBUTING.md](CONTRIBUTING.md) before changing the repository.

Before every commit and push, run `git branch --show-current` and
`git status --short --branch`. Work from `feature/*`, `release/*`, or `hotfix/*`
and check the branch's upstream. Hand off changes by pushing the topic branch
and creating or updating its PR. Keep each commit atomic, buildable, and testable;
use `<type>: <imperative summary>` with a body when context helps the reviewer.

## Implementation rules

- Make focused changes that directly serve the requested outcome.
- Use clear, specific names and give each unit one coherent responsibility.
- Prefer the smallest sufficient design; add abstractions for demonstrated needs.
- Keep each business rule and configuration decision in one authoritative place.
- Group shared code by meaning and responsibility.
- Use comments to explain necessary reasons and unexpected library behavior.
- Verify material assumptions and clarify requirements that change the result.
- Write durable artifacts that stand on their own and describe the current behavior.
- Use maintained libraries and framework functions for standard technical tasks;
  document the reason for a custom implementation in the relevant ADR.
- Introduce LinkedIn HTTP access through explicit, typed interfaces alongside the
  first consuming feature. Keep remote payload conversion and credentials inside
  the integration component, and pass only the interface a consumer needs.

## Reviews

Inspect the complete diff and its relevant contracts. Report concrete findings
with a location, observable effect, and applicable project rule. Distinguish
verified defects from uncertainty. Complete delegated reviews before reporting
their outcome, and include the review's material findings in the handoff.

## Dependencies and verification

Manage dependencies using uv and commit `uv.lock` with dependency changes.
Before opening a PR, run:

```sh
uv sync --locked
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked mypy
uv run --locked pytest
uv build
docker build --tag mcp-linkedin:test .
```

Exercise HTTP and MCP behavior through real application boundaries. Match test
scope to the behavior changed. Own application code requires 100% line and branch
coverage. Strict typing covers application code, tests, and Python scripts.
Application tests use local fixtures, fakes, or testcontainers for remote APIs;
control time and random seeds when they affect results. For runtime/container changes, run the container
and `python3 scripts/smoke_test.py`; verify health and UID 10001. Include actual
validation results and material limitations in the PR.

Run the security and documentation checks in [docs/quality.md](docs/quality.md).
All four CI checks (`quality`, `container`, `security`, `documentation`) govern
permanent-branch updates. Dependency license metadata is checked against the
explicit project list; review additions individually. Known vulnerability findings
require correction or an individually justified, dated exception with an expiry.

Update setup, behavior, command, and architecture documentation in the same
change as the implementation. Keep internal links valid, use consistent Markdown,
and describe supported behavior and operational responsibilities positively.

## Architecture decisions

Read relevant records in `docs/adr/`. Add a numbered ADR for decisions affecting
transport, authentication, LinkedIn integration, deployment, or delivery. Use the
template and record context, decision, and consequences. Keep documentation
aligned with the implemented behavior.
