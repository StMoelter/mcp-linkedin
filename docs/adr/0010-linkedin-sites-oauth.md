# 0010: Separate Sites-hosted LinkedIn OAuth application

- Status: Proposed
- Date: 2026-10-11

## Context

The owner requested a separate Sites project for a LinkedIn MCP integration,
with private plugin provisioning, runtime secrets, persistent connections, and
isolation between installing users. The existing Python Docker service and the
dice Site each retain their own deployment boundary.

## Decision

Keep the Sites application under `sites/linkedin-api`. Sites supplies a
Cloudflare Worker, trusted authenticated-user headers, secret environment
variables, D1 persistence, and a private MCP plugin entry. Use the Sites starter's
TypeScript runtime for this deployment. The Python service continues to use the
official MCP SDK and its existing container lifecycle.

The small stateless JSON-RPC adapter implements Sites discovery, initialization,
tool listing, and tool calls directly. It provides three focused tools for
connection status, the current member profile, and confirmed public text posts.
The adapter intentionally exposes no arbitrary HTTP destination or account
selector. The Sites platform owns transport authentication and routing.

Use LinkedIn's authorization-code flow with `openid profile w_member_social`.
Bind one-time OAuth state to the authenticated Sites user and a secure browser
cookie. Encrypt tokens using AES-GCM with that user's ID as associated data.
Scope every connection, OAuth-state, and publication-record operation to the same
trusted identity. Keep the client secret and encryption key in Sites runtime
secret storage. One hosted app uses its own LinkedIn Developer App credentials,
while each installing user grants separate account authorization.

Atomically claim publication request IDs per user. Store a content hash and the
confirmed LinkedIn post identifier. Repeated confirmed requests return that
identifier. Uncertain outcomes require a manual LinkedIn check before further
action. Refresh tokens are used when LinkedIn grants them, otherwise reconnect.

## Consequences

The application is deployed owner-private with a separate database and plugin.
The initial deployment requires real LinkedIn client configuration before OAuth
and live API validation. Verify the OpenID Connect subject-to-person-author
mapping with that app before enabling production posting. Cross-account plugin
sharing requires Sites access provisioning and end-to-end identity validation.

The TypeScript deployment is an explicit proposed addition to the Python-only
architecture. Its focused security behavior tests run against local Miniflare D1
and simulated LinkedIn responses. Python retains its enforced 100% coverage.
The Sites addition enforces 100% line, branch, and function coverage per
application file and rejects source files omitted from the report. CI runs this
gate plus E2E scenarios through the built Worker, real D1, and simulated LinkedIn
responses. The protected Python quality job depends on that Sites job. Vendored
platform build source is tracked with its license to support clean clones.
Review the architecture and add dedicated dependency auditing and license checks
before integrating this draft into a permanent branch.

Built Worker E2E tests exposed two runtime compatibility defects: native fetch
requires its global receiver, and Workers supports manual or follow redirect
modes. Bind fetch to its global context, request manual redirects, and reject
all redirect responses. This keeps credentials at the fixed LinkedIn endpoints.

The source and setup instructions are public in GitHub. Deployment secrets and
user tokens stay in private runtime storage. Separately deployed copies supply
their own credentials, encryption key, and registered callback origin.
