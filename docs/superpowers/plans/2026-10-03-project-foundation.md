# Project Foundation Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans to implement this plan task by task.

**Goal:** Deliver the approved Python, Docker, Gitflow, and GitHub foundation.

**Architecture:** A Starlette app hosts the official MCP SDK over Streamable HTTP.
Docker packages the locked runtime; a trusted reverse proxy connects over HTTP.
GitHub Actions verifies changes and publishes versioned release images.

**Tech Stack:** Python 3.12, uv, MCP SDK 2.3, Starlette, Uvicorn, pytest, Ruff, mypy, Docker, GitHub Actions.

**Spec:** [Project Foundation Design](../specs/2026-10-03-project-foundation-design.md)

## Global Constraints

- English project text and positive documentation.
- MIT license; implementation authored by coding agents under human direction.
- Python 3.12 baseline and committed uv lockfile.
- Streamable HTTP `/mcp`, HTTP health `/health`, default port 8000.
- Gitflow permanent branches `main` and `development`; subsequent changes via PR.
- Branch protection includes force-push protection and an empty bypass list.

## Review Focus

- External Host headers reach the backend through a trusted proxy.
- MCP lifespan is active before protocol requests arrive.
- Invalid `PORT` values fail startup with clear configuration errors.
- Release versions and main ancestry are verified before image publication.
- GitHub rules are enforced server-side and verified after application.

## Tasks

### Task 1: Runtime and project environment

Files: `pyproject.toml`, `uv.lock`, `src/mcp_linkedin/{__init__,__main__,server}.py`,
`tests/test_server.py`, `.python-version`, `.gitignore`.

Interfaces: `create_app() -> Starlette`, `main() -> None`, `server://info` JSON.

- [x] Write HTTP/protocol/resource and port tests; run them against the missing runtime.
- [x] Implement the app factory, lifespan, metadata resource, and entry point.
- [x] Run `uv run pytest`, Ruff, mypy, and `uv build`; confirm successful output.

### Task 2: Docker and automation

Files: `Dockerfile`, `.dockerignore`, `compose.yaml`, `.github/workflows/{ci,release}.yml`,
`scripts/smoke_test.py`, `.github/branch-ruleset.json`.

Interfaces: HTTP port 8000; CI checks `quality` and `container`; GHCR version tags.

- [x] Build the production image using locked dependencies and UID/GID 10001.
- [x] Run the container health and MCP smoke test.
- [x] Define PR/branch CI and release publication with version and ancestry gates.
- [x] Review workflow syntax and ruleset semantics.

### Task 3: Documentation and Gitflow bootstrap

Files: `README.md`, `LICENSE`, `AGENTS.md`, `CONTRIBUTING.md`, `docs/deployment.md`,
`docs/adr/*.md`, `.github/pull_request_template.md`, `.github/branch-ruleset.json`.

- [x] Document setup, agent authorship, architecture decisions, releases, and Gitflow.
- [ ] Commit the verified initial foundation and establish permanent branches.
- [ ] Push initial branches; apply and verify the ruleset using administrator access.
- [ ] Record actual validation results and remaining external prerequisites.

## Execution Evidence

- Runtime: 9 pytest cases pass; strict mypy and Ruff checks pass.
- Packaging: wheel and source distribution build; both contain the MIT notice.
- Container: Compose build and startup pass with a read-only filesystem;
  runtime UID is 10001, Docker health is healthy, HTTP/MCP smoke checks pass.
- Workflows: actionlint passes; release version validation passes four input cases.
- Independent review: synchronization uses an up-to-date topic branch; release
  verification and publication are pinned to the event commit.
- GitHub administration: apply the checked-in ruleset using an authenticated
  administrator, then verify effective rules for both permanent branches.
