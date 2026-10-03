# LinkedIn MCP Server

A Python MCP server built for Docker and HTTP connections through a reverse proxy.

The entire implementation is written and maintained by coding agents under human
direction. The project is distributed under the [MIT License](LICENSE).

## Development

Install Python 3.12 and [uv](https://docs.astral.sh/uv/), then run:

```sh
uv sync --locked
uv run mcp-linkedin
```

The server listens on `0.0.0.0:8000`. MCP clients connect to
`http://localhost:8000/mcp`. `GET /health` returns `{"status":"ok"}`.
The MCP resource `server://info` provides the service name and version.

```sh
uv run ruff check .
uv run ruff format --check .
uv run mypy
uv run pytest
uv build
```

The test suite enforces 100% line and branch coverage for the application.
Strict type checks include tests and Python scripts. See [quality checks](docs/quality.md)
for dependency audits, documentation checks, and the complete local workflow.

## Docker

```sh
docker compose up --build -d
curl --fail http://localhost:8000/health
docker compose down
```

Compose publishes the service on `127.0.0.1:8000`. An external reverse proxy can
connect to that loopback port. A proxy container can connect to `mcp-linkedin:8000`
on a shared Docker network. The image runs as UID/GID `10001` and includes a health
check. `PORT` sets the HTTP listening port; its default is `8000`.

For published releases:

```sh
docker run --rm -p 127.0.0.1:8000:8000 ghcr.io/stmoelter/mcp-linkedin:0.1.0
```

Release tags follow `vMAJOR.MINOR.PATCH`. The release workflow publishes the version
tag and `sha-<commit>` tag after verification. See [deployment](docs/deployment.md)
for the proxy contract and release procedure.

## Collaboration

Development follows [Gitflow](CONTRIBUTING.md): `main` holds releases and
`development` integrates features. Pull requests and successful CI checks govern
updates to both branches. Read [AGENTS.md](AGENTS.md) for coding-agent instructions
and [architecture decisions](docs/adr/README.md) for the project conventions.
