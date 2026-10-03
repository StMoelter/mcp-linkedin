# MCP Test Lab Implementation Plan

## Approved outcome

Extend the existing HTTP MCP server with an anonymous connection check and dice
tool. Publish the first stable image through a pushed `v0.1.0` tag after Gitflow
integration, and provide deployment instructions and a portable plugin skill.

## Implementation

- [x] Add HTTP/MCP tests before implementing typed demo tools and their metadata.
- [x] Test tag format, package version, and main ancestry using real Git fixtures.
- [x] Expand the container smoke test to discover and invoke both tools.
- [x] Implement tag-triggered AMD64/ARM64 registry publication.
- [x] Document deployment, ChatGPT connection, release procedure, and decisions.
- [x] Complete local quality checks, container checks, and independent review.
- [x] Activate effective branch protection and integrate the foundation PR.
- [x] Integrate the demo through its checked PR.
- [ ] Integrate release preparation into main, tag, and verify the published image.
- [ ] Synchronize main into development through a PR.

## Execution record

The initial test run demonstrated missing tool discovery and calls and a missing
release validator. After implementation, all 37 tests passed with 100% application
line and branch coverage. The release validator rejects malformed tags, version
mismatches, and commits awaiting main integration.

Ruff, strict mypy, Markdown lint, internal links, actionlint, dependency licenses,
and the advisory audit passed. Wheel and source builds succeeded. Docker images
for AMD64 and ARM64 built and passed health, tool discovery, connection checks,
and dice calls. The Compose container was healthy and ran as UID 10001.
The versioned repository provides the deployment Compose file and companion
plugin skill. The current suite contains 38 tests, including the startup-reset
regression exercised through the real HTTP/MCP application.

Independent reviews completed. [ADR 0008](../../adr/0008-registry-release-boundary.md)
records the current release boundary: the workflow completes with registry
publication and reports image coordinates and digest. Deployment and the final
ChatGPT connection follow in the operator's environment.

Ruling: create the demo branch from development and fast-forward the reviewed
foundation into it while GitHub authentication is pending. This preserves the
foundation commits and enables local implementation; GitHub integration still
starts with the foundation PR before the demo PR.

Default release platforms are Linux AMD64 and ARM64. The first package version
is 0.1.0. Deployment accepts either a version tag or the published image digest.
GitHub administrator authentication is verified. The active branch rules enforce
PRs, all four CI checks, forward-moving history, and protected branch retention.
The approval count of zero is consistent across rulesets and classic protection.
The operator provides the HTTPS endpoint for the final ChatGPT connection test.

Foundation PR #1 and demo PR #2 merged into development after all four GitHub
checks passed. The release branch is prepared from that integrated history.
