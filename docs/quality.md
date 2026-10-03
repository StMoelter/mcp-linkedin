# Quality Checks

## Code and tests

Install Python 3.12 and uv 0.11.7. Run these commands from the repository root:

```sh
uv sync --locked
uv run --locked ruff check .
uv run --locked ruff format --check .
uv run --locked mypy
uv run --locked pytest
uv build
```

Pytest enforces 100% line and branch coverage for `src/mcp_linkedin`. Tests verify
the HTTP and MCP contracts and the startup configuration. Strict mypy checks
`src`, `tests`, and Python scripts. Tests for remote integrations use local
fixtures, fakes, and testcontainers, with controlled clocks and random seeds
when the scenario needs them.

Generate the same test artifacts as CI:

```sh
uv run --locked pytest --junitxml=reports/junit.xml \
  --cov-report=xml:reports/coverage.xml --cov-report=html:reports/coverage
```

## Dependency audits

```sh
mkdir -p reports
uv run --locked pip-licenses --output-file=reports/licenses.json
uv export --locked --all-groups --no-emit-project \
  --output-file reports/requirements-audit.txt > /dev/null
uv run --locked pip-audit --strict --require-hashes --disable-pip \
  --requirement reports/requirements-audit.txt \
  --format=json --output=reports/audit.json
```

The license check inspects installed runtime and development dependencies against
the exact list in `pyproject.toml`. The list recognizes MIT, MIT-0, Apache-2.0,
BSD-2-Clause, BSD-3-Clause, ISC, 0BSD, CC0-1.0, MPL-2.0, PSF-2.0, Python-2.0,
and Unlicense, including explicit metadata aliases and approved dual-license
expressions. The project itself carries its MIT notice in its distributions.
New license metadata receives individual review and an explicit list entry.

The vulnerability audit reads hash-pinned dependencies exported from `uv.lock`,
including development tools. It queries the advisory service and fails on known
vulnerabilities or an incomplete audit. An exception is specific to an advisory
and records the affected dependency, justification, owner, creation date, expiry
date, and replacement or remediation plan in this document. Its CI argument
references that record. Review exceptions on each dependency update and remove
expired entries as part of the update.

## Documentation

Use [PyMarkdown](https://pymarkdown.readthedocs.io/) and
[Lychee 0.24.2](https://github.com/lycheeverse/lychee/releases/tag/lychee-v0.24.2).
Install the Lychee release binary for the development platform and place it on PATH.

```sh
git ls-files -z '*.md' | xargs -0 uv run --locked pymarkdown \
  --config .pymarkdown.json --strict-config scan
git ls-files '*.md' | lychee --offline --no-progress --files-from -
```

Both checks use the Git inventory, including newly staged documents. Markdown
rules support tables, enforce clear heading/list structure, and allow 100-character
prose lines. Internal link checks verify local file targets using offline mode.
Review English wording, implemented behavior, and positive descriptions alongside
the automated checks. Include documentation impact in the PR.

## Containers and workflows

```sh
docker compose config --quiet
docker compose --project-name mcp-linkedin-check up --build -d
python3 scripts/smoke_test.py
docker compose --project-name mcp-linkedin-check exec -T mcp-linkedin id
docker compose --project-name mcp-linkedin-check ps
docker compose --project-name mcp-linkedin-check down
docker run --rm --volume "$PWD:/repo:ro" --workdir /repo rhysd/actionlint:1.7.7
```

Verify HTTP health, MCP initialization, UID 10001, and a healthy container.
The workflow check validates GitHub Actions syntax and embedded shell commands.

## GitHub checks and reports

Every PR targeting a permanent branch runs `quality`, `container`, `security`,
and `documentation`. Release publication runs the same checks before pushing the
image to GHCR. CI retains JUnit, XML/HTML coverage, license, vulnerability, and
link reports as artifacts for 14 days. Reports are generated under the ignored
`reports/` directory. GitHub enforces all four successful checks before merging
through the active branch ruleset.
