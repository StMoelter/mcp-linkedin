# 0001: Python and Reproducible Dependencies

- Status: Accepted
- Date: 2026-10-03

## Context

The server requires a Python implementation, a reproducible container, and a
consistent development environment for coding agents.

## Decision

Use Python 3.12 as the baseline, the official MCP Python SDK 2.x, Starlette, and
Uvicorn. Manage dependencies with uv and commit `uv.lock`. Package the service
with Hatchling using a `src` layout. Use Ruff, strict mypy, and pytest for quality.

## Consequences

Development, CI, and Docker resolve the same locked dependencies. Dependency
updates include lockfile changes and validation. SDK major-version migrations
receive a separate architecture decision and protocol verification.
