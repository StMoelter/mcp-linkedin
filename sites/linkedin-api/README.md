# LinkedIn API Site

A separate private Sites application with three authenticated MCP tools:

- `linkedin_connection_status`: connection, expiry, and granted permissions.
- `linkedin_profile`: the connected member's basic OpenID Connect profile.
- `linkedin_publish_post`: a confirmed public text post with a stable request ID.

The Sites runtime supplies the trusted `oai-authenticated-user-id` header. Tool
calls and OAuth routes require that identity. Discovery exposes tool definitions.
The dice Site has its own project, source, database, environment, and plugin.

## LinkedIn setup

Create an application in the [LinkedIn Developer Portal](https://www.linkedin.com/developers/apps).
Enable **Sign In with LinkedIn using OpenID Connect** and **Share on LinkedIn**.
Register this exact authorized redirect URL:

```text
https://linkedin-api.steffenm-0815.chatgpt.site/auth/linkedin/callback
```

Set `LINKEDIN_CLIENT_ID` and secret `LINKEDIN_CLIENT_SECRET` through Sites runtime
environment settings. Provision a secret `TOKEN_ENCRYPTION_KEY`: 32 random bytes
encoded as base64url. Keep that key stable for existing connections. Configure
`SITE_ORIGIN` with the HTTPS Site origin and `LINKEDIN_API_VERSION` with a supported
LinkedIn REST API version (the deployment uses `202605`).

Visit the private Site, sign in with ChatGPT, and select **LinkedIn verbinden**.
The requested scopes are `openid profile w_member_social`. A successful callback
connects that LinkedIn account to the current authenticated Sites user.
Application setup must be completed before real LinkedIn operations can succeed.

## Credentials and persistence

Sites holds the application client secret and encryption key in runtime secret
storage. D1 stores AES-GCM-encrypted access and optional refresh tokens, connection
metadata, short-lived hashed OAuth state, and publication request records.
Encryption authenticates the Sites user ID as associated data. Every token and
publication lookup is scoped to that user. OAuth state also binds the browser
cookie and expires after ten minutes. Successful callbacks consume it atomically.

An application client secret belongs to the deployment's LinkedIn Developer App.
Each installing user authorizes their own account and receives separate tokens.
Sharing the same hosted plugin does not copy deployment secrets into a plugin
package. A separately deployed copy requires its own secret configuration and
redirect registration. This deployment remains owner-private. Multi-user sharing
requires Sites access provisioning and a verified trusted identity on every tool
call. End-to-end cross-account sharing has not been validated.

Disconnect removes the current user's local tokens. Revoke authorization in
LinkedIn settings to revoke the remote grant. Publication records remain for
request deduplication. Refresh works only when LinkedIn grants a refresh token.
Otherwise the user reconnects after expiry. Changing the encryption key requires
reconnection unless existing records are re-encrypted first.

## Publishing behavior

Approve the exact text before calling `linkedin_publish_post` with
`confirmed: true` and a stable `request_id` of 16–100 letters, digits, `_`, or `-`.
The server fixes the author to the connected member. It atomically claims each
user/request pair before making the external request. Confirmed duplicate
requests return the recorded post. Changed text conflicts. An uncertain result
requires checking LinkedIn manually and is never retried automatically.

The OpenID Connect `sub` is used as the member identifier for the person author.
Verify this assumption with the actual LinkedIn app before relying on posting.
The initial deployment has no real LinkedIn credentials or posting validation.
No LinkedIn post was created during local tests.

## Development

Use the pinned package manager through `npm run install:ci`, then run:

```sh
npm test
npm run lint
node node_modules/typescript/bin/tsc --noEmit
npm run build
```

Tests exercise the handler and D1 SQL in Miniflare with simulated LinkedIn
responses, including OAuth replay, identity separation, token encryption,
publication confirmation, deduplication, and uncertain outcomes. Sites packages
the Worker and applies the committed Drizzle migration on deployment.

The production Site is [LinkedIn API](https://linkedin-api.steffenm-0815.chatgpt.site).
The hosted MCP endpoint is `/mcp`. Sites provisions the private plugin entry.

## License

MIT. Preserve the included dependency license notices.
