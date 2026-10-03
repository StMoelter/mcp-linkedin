# 0007: Anonymous Demo Tools and Tag-Triggered Releases

- Status: Accepted
- Date: 2026-10-03
- Extends: [0002](0002-http-container-runtime.md)
- Supersedes the release trigger in: [0004](0004-github-delivery.md)
- Publication boundary updated by: [0008](0008-registry-release-boundary.md)

## Context

The first deployment needs an observable ChatGPT connection test and an enjoyable
tool call. Operators need a published image after pushing the release tag, along
with deployment instructions and a portable skill for the connected plugin.

## Decision

Expose anonymous `connection_check` and `roll_dice` tools using the official MCP
SDK. The first echoes a test message and reports the installed version. The
second returns bounded dice rolls and their sum. Pydantic describes validated
inputs and structured results. Tool annotations describe their read-only, local
behavior, with fresh randomness on each dice call.

Push stable `vMAJOR.MINOR.PATCH` tags for commits in main's history. Validate the
package version and run all four CI gates before publishing Linux AMD64 and ARM64
images to GHCR. Download and exercise the published image by digest before
creating the GitHub release with Compose and skill assets. Keep package write
permission in the image job and repository write permission in the release job.

## Consequences

Users can confirm the deployed version through a ChatGPT tool call and try dice
requests with clear input boundaries. Operators deploy versioned images or exact
digests and configure the public HTTPS endpoint through their reverse proxy.
The companion skill guides the connected tools using the user's test requests.
Repository administration enables public image pulls and protected Gitflow PRs.
