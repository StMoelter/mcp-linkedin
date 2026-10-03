# 0002: Streamable HTTP in Docker

- Status: Accepted
- Date: 2026-10-03

## Context

The MCP service runs behind a webserver acting as its reverse proxy and serves
HTTP inside a Docker container.

## Decision

Expose stateless Streamable HTTP with JSON responses at `/mcp` and HTTP health at
`/health`. The Starlette application owns the MCP session manager's lifespan.
Listen on `0.0.0.0:8000`, with a validated `PORT` override. Run as UID/GID 10001.

The backend accepts proxy-forwarded Host headers. The trusted reverse proxy
validates public Host and Origin headers, manages HTTPS and public routing, and
controls backend access. Compose publishes the port on loopback.

## Consequences

The service can sit behind different reverse proxies and route requests across
identical replicas. Deployment maintains a private backend connection and the
proxy's validation policy. Docker health checks support orchestration, and the
container smoke test exercises the actual HTTP protocol path.
