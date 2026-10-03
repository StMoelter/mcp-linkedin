# 0004: GitHub Verification and Release Delivery

- Status: Accepted
- Date: 2026-10-03

## Context

The GitHub repository needs automated verification and delivery of a runnable
Docker image.

## Decision

Use GitHub Actions for `quality` and `container` checks. Verify code quality,
typing, tests, packaging, and container runtime behavior. Publishing a stable
GitHub release reruns CI, verifies its version and main ancestry, and publishes
the container to GHCR with version and commit tags. Scope package write
permission to the publication job.

## Consequences

Pull requests receive repeatable checks, and release consumers select explicit
image versions or digests. The repository owner controls GitHub administration,
GHCR visibility, and deployment of the verified container in the hosting
environment.
