# 0005: Established Tools for Standard Technical Tasks

- Status: Accepted
- Date: 2026-10-03

## Context

Coding agents implement a Python MCP service and maintain its quality workflow.
Protocol handling, validation, dependency analysis, and documentation parsing
benefit from established implementations with maintained technical contracts.

## Decision

Prefer maintained framework functions, libraries, and CLIs for standard technical
tasks. The official MCP SDK owns protocol handling; Starlette and Uvicorn own the
HTTP runtime. Ruff, mypy, pytest-cov, pip-audit, pip-licenses, PyMarkdown, Lychee,
and actionlint supply the corresponding quality checks. uv locks Python tools
alongside application dependencies; CI fixes standalone tool versions.

Choose the smallest sufficient design. A custom implementation receives a
documented reason demonstrating its suitability and maintenance cost. Introduce
LinkedIn integrations through explicit, typed interfaces with the first consuming
feature. The integration component owns HTTP calls, credentials, and remote
payload conversion; application-facing contracts describe the required capability.

## Consequences

Own code concentrates on application behavior. Quality tooling remains repeatable,
and dependency updates include lockfile and validation evidence. Consumers use
focused interfaces, and integration tests supply local responses and fakes.
