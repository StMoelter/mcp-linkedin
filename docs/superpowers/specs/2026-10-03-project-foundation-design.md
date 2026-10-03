# Project Foundation Design

## Approved purpose

Establish an English-language, MIT-licensed Python project for a LinkedIn MCP
server developed entirely by coding agents under human direction. Provide a
working HTTP runtime, a Docker deployment, Gitflow, architecture records, agent
instructions, GitHub Actions, and enforced branch protection.

## Runtime

Python 3.12 is the development and container baseline. uv manages dependencies
and commits a complete lockfile. The official MCP SDK 2.3 provides Streamable
HTTP on `/mcp`. A Starlette application owns the MCP lifespan and provides
`GET /health` with HTTP 200 and JSON `{"status":"ok"}`. The resource
`server://info` returns service name `mcp-linkedin` and package version `0.1.0`.
Uvicorn listens on `0.0.0.0`; `PORT` defaults to `8000` and accepts integers
between 1 and 65535. Container configuration errors fail at startup.

## Deployment boundary

Docker serves HTTP to a trusted reverse proxy. The proxy validates public Host
and Origin values, manages HTTPS and public routing, and controls access to the
backend. The HTTP backend accepts proxy-forwarded hostnames. Compose binds the
published port to loopback. The container runs as UID/GID 10001 with a health
check and a reproducible locked production environment.

## Repository and delivery

English documentation covers runtime, positive deployment instructions, agent
authorship, contribution rules, and ADRs. MIT copyright belongs to Steffen
Moelter. ADRs record Python/dependencies, HTTP/Docker, Gitflow, and CI/releases.

Bootstrap establishes the common initial commit for `main` and `development`.
Features use `feature/*`, releases use `release/*`, and urgent release fixes use
`hotfix/*`. Pull requests carry every subsequent change to permanent branches.
Merge commits preserve Gitflow ancestry. Synchronization uses a
`feature/sync-main-<version>` branch created from development with main merged
into it, then a PR to development. This keeps the topic branch current under
strict required-status checks. Main is the default branch.

GitHub Actions verifies lint, format, strict typing, tests, distributions, and a
container smoke test for pull requests and permanent-branch pushes. Publishing a
GitHub release from a version tag on main verifies the version and main ancestry,
reruns CI, then publishes a versioned GHCR image.

An active GitHub branch ruleset targets both permanent branches with a required
pull request, required CI status checks, resolved review conversations, force-push
protection, deletion protection, and an empty bypass list. Required approvals
default to zero so the repository owner can merge agent-authored pull requests
after reviewing them. API administration requires an authenticated repository
administrator. Applied rules are verified using the GitHub API.

## Validation

Tests verify HTTP health, protocol initialization, resource retrieval, malformed
MCP requests, proxy-forwarded Host handling, and invalid port configuration.
Container verification covers startup, health, MCP initialization, and runtime
user. Workflow and ruleset definitions are reviewed against official interfaces.
