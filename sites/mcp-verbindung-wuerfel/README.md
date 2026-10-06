# MCP Connection and Dice Site

This directory contains the source of the private ChatGPT Site
[MCP Verbindung & Würfel](https://mcp-verbindung-wuerfel.steffenm-0815.chatgpt.site).

## Tools

The stateless `POST /mcp` endpoint exposes exactly two tools:

- `connection_check` returns `{"success":true,"message":"Connection successful"}`.
- `roll_dice` accepts `count` (1–100, default 1) and `sides` (2–1000, default 6).
  It returns the rolls and their sum, using Web Crypto with rejection sampling.

The implementation lives in [app/mcp/route.ts](app/mcp/route.ts).
The page lives in [app/page.tsx](app/page.tsx).

## Local development

Use Node.js 22.13 or later and pnpm. Run commands from this directory:

```sh
pnpm install --frozen-lockfile
pnpm dev
pnpm build
```

The build produces a Cloudflare Worker. Sites owns authentication, deployment,
and the provisioned private plugin. The hosting manifest preserves the existing
Site identity. Publishing changes requires the authenticated Sites workflow.
Commits to this GitHub repository store source for editing and review.

## Source snapshot

The application and starter files were exported from published Site source commit
`9e5e8a5e02d067df3d292fc42ed7c2e92f99f588`. This README documents the export.
The vendored license has a Markdown heading
added for repository linting; its original notice is preserved.
The starter includes its dependencies, build helpers, lockfile, and license notices.
Runtime credentials, local dependencies, and build output are excluded.

The repository's Python service and this TypeScript Site are independently built.
The Site implements the small stateless MCP surface directly to retain the published
behavior. The Python service continues to use the official MCP SDK.
