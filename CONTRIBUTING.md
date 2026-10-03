# Contributing

The implementation is authored by coding agents under human direction. Human
contributors define requirements, review changes, and guide architecture. Project
content and commit messages use English. Contributions use the MIT License.

## Gitflow

| Branch | Purpose | Starting point | Pull request target |
| --- | --- | --- | --- |
| `main` | Published release history | Initial foundation | Release and hotfix PRs |
| `development` | Integrated work for the next release | Initial foundation | Feature and synchronization PRs |
| `feature/<topic>` | A focused improvement | `development` | `development` |
| `release/<version>` | Release preparation and version changes | `development` | `main` |
| `hotfix/<topic>` | An urgent release correction | `main` | `main` |

The first foundation commit establishes the common base of `main` and
`development`. GitHub protects every subsequent update with pull requests,
successful `quality`, `container`, `security`, and `documentation` checks, resolved review discussions,
forward-moving history, and protected branch retention. Protection applies to
administrators through an empty bypass list. Merge commits preserve Gitflow
ancestry. The owner reviews and merges PRs; the initial review-approval count is
zero, supporting an owner-led project with coding agents.

### Features

```sh
git switch development
git pull --ff-only origin development
git switch -c feature/service-improvement
# Implement the change and run the checks in AGENTS.md.
git add <changed-files>
git commit -m "feat: improve service behavior"
git push -u origin feature/service-improvement
```

Open a pull request into `development`. Describe the resulting behavior, actual
validation results, documentation impact, and relevant ADRs. Merge through GitHub when the checks pass
and review discussions are resolved.

Before every commit and push, inspect the branch and upstream with
`git branch --show-current` and `git status --short --branch`. Commit and push
from a `feature/*`, `release/*`, or `hotfix/*` branch. Use atomic, buildable
commits with `<type>: <imperative summary>` messages. Follow the complete
[quality workflow](docs/quality.md) and record the actual results in the PR.

Keep the topic branch current with its target branch by merging the latest target
commit into it and pushing the merge commit. Strict CI rules verify an up-to-date
topic branch before merging the pull request.

### Releases

1. Create `release/<version>` from `development`.
2. Set the package version in `pyproject.toml`, update version expectations in
   tests and documentation, and run `uv lock`.
3. Open and merge a PR into `main` after CI passes.
4. Tag the merged main commit as `v<version>` and push the tag.
5. Publish a stable GitHub release for the tag. GitHub Actions verifies the tag,
   package version, main ancestry, and CI, then publishes the container to GHCR.
6. Create `feature/sync-main-<version>` from the latest `development`, merge
   `origin/main` into it, and open its PR into `development`. Merge after CI.

```sh
git fetch origin
git switch -c feature/sync-main-0.1.0 origin/development
git merge --no-ff origin/main
git push -u origin feature/sync-main-0.1.0
```

### Hotfixes

Create `hotfix/<topic>` from `main`, implement the correction with a regression
test, and prepare the next patch version. Merge through a PR into `main`, follow
the release tagging procedure, and synchronize `main` into `development` through
a topic branch and PR as described above.
Bring the correction into any active release branch as part of its preparation.

## Architecture records

Use [docs/adr/template.md](docs/adr/template.md). Number decisions sequentially
and link the relevant record in the pull request. Record implemented choices and
their operational consequences using positive, concrete statements.

## GitHub administration

An authenticated repository administrator applies the checked-in
[branch ruleset](.github/branch-ruleset.json). GitHub CLI requires a login with
repository Administration write permission (or equivalent classic token scope).

```sh
gh auth login
gh api --method POST repos/StMoelter/mcp-linkedin/rulesets \
  --input .github/branch-ruleset.json
```

For an existing ruleset, obtain its identifier with
`gh api repos/StMoelter/mcp-linkedin/rulesets`, then apply the file using
`gh api --method PUT repos/StMoelter/mcp-linkedin/rulesets/<id> --input .github/branch-ruleset.json`.

Verify the stored ruleset's active enforcement and empty bypass list, and inspect
the effective rules for each branch:

```sh
gh api repos/StMoelter/mcp-linkedin/rulesets/<id>
gh api repos/StMoelter/mcp-linkedin/rules/branches/main
gh api repos/StMoelter/mcp-linkedin/rules/branches/development
```

Effective rules include `pull_request`, `required_status_checks`,
`non_fast_forward`, and `deletion`. Repository settings enable merge commits and
set `main` as the default branch. GitHub provides branch rulesets for public
repositories and eligible plans for private repositories; the administrator
maintains the repository's access and plan configuration.
