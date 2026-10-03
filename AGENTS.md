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
scope to the behavior changed. For runtime/container changes, run the container
and `python3 scripts/smoke_test.py`; verify health and UID 10001. Include actual
validation results and material limitations in the PR.

## Architecture decisions

Read relevant records in `docs/adr/`. Add a numbered ADR for decisions affecting
transport, authentication, LinkedIn integration, deployment, or delivery. Use the
template and record context, decision, and consequences. Keep documentation
aligned with the implemented behavior.
