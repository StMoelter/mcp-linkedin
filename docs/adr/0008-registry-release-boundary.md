# 0008: Release Delivery Ends at the Container Registry

- Status: Accepted
- Date: 2026-10-03
- Updates: [0007](0007-demo-tools-and-tag-releases.md)

## Context

Operators pull the published container directly onto their own server. The
release workflow delivers a versioned image, with Gitflow preserving reviewed
integration and release history.

## Decision

Keep tag-triggered version and ancestry validation, all four CI gates, and
AMD64/ARM64 publication to GHCR. Complete the workflow after registry publication
and report the versioned image name and immutable digest in its summary.
Use public package visibility so server operators can pull anonymously.

Keep deployment configuration and the companion plugin skill in the versioned
repository. Verify anonymous image access and MCP behavior after publication
from the release operator's environment. Deployment belongs to the server
operator's orchestration.

## Consequences

GitHub Actions owns image verification, building, and publication. Operators
receive `ghcr.io/stmoelter/mcp-linkedin:<version>` and can pin a digest for exact
deployment. Gitflow PRs govern permanent branch changes, and pushing a stable
version tag starts the verified publication workflow.
