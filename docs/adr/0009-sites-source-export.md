# 0009: Preserve the Private Sites MCP Source

- Status: Accepted
- Date: 2026-10-06

## Context

The owner requested a GitHub copy of a published private ChatGPT Site so its MCP
source can be inspected and edited using ordinary Git access.

## Decision

Store the complete tracked Site source in `sites/mcp-verbindung-wuerfel/`, with
its lockfile and third-party notices. This TypeScript subproject retains the
published stateless implementation of `connection_check` and `roll_dice`.
The Site uses a small direct JSON-RPC handler to preserve the published source
without introducing a protocol or deployment migration during this export.
The Python application continues to use the official MCP SDK under ADR 0005.

Sites manages the Site's owner-only access, OAuth, and provisioned plugin.
The hosting manifest retains the existing Site ID. GitHub commits provide source
history; the authenticated Sites publishing workflow deploys an explicitly chosen
source state. Repository publication and Site access are separate concerns.

## Consequences

The owner can clone, inspect, and edit the source from GitHub. Runtime tokens and
local build artifacts stay outside Git. The Site's Node dependencies and Worker
build are maintained independently of the Python service. Protocol expansion
requires revisiting the direct handler and considering an official SDK.
