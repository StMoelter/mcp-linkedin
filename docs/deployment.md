# HTTP Deployment and Releases

## Proxy contract

The container listens on HTTP at `0.0.0.0:8000`. Clients use Streamable HTTP at
`/mcp`; operators use `GET /health`. The backend accepts the Host header forwarded
by the proxy. Uvicorn uses the backend connection metadata for request handling.

The reverse proxy manages HTTPS, public hostnames, public Host and Origin
validation, and access control. Place the backend on a trusted private connection
reachable by the proxy. Compose's loopback binding supports a proxy running on
the host; a shared private Docker network supports a proxy running in a container.

Forward `/mcp` with its request body, Content-Type, Accept, and MCP protocol
headers intact. Support the Streamable HTTP methods `POST`, `GET`, and `DELETE`.
Use HTTP/1.1 upstream connections, streaming-friendly response buffering, and
timeouts sized for tool execution. The application uses stateless MCP requests
and JSON responses, which supports routing requests across identical replicas.

## Container operation

```sh
docker compose up --build -d
docker compose ps
docker compose logs mcp-linkedin
python3 scripts/smoke_test.py
docker compose down
```

The image runs as UID/GID 10001. Compose provides a read-only root filesystem,
a writable temporary directory, dropped capabilities, and a restricted privilege
configuration. Docker checks `/health` every 30 seconds. `PORT` accepts a value
between 1 and 65535; align the container port mapping with the configured value.

## Deploy a published image

Download `compose.deploy.yaml` from the selected GitHub release, then run:

```sh
docker compose -f compose.deploy.yaml pull
docker compose -f compose.deploy.yaml up -d
docker compose -f compose.deploy.yaml ps
docker compose -f compose.deploy.yaml logs mcp-linkedin
```

The release's deployment file defaults to its published image version and
publishes HTTP on `127.0.0.1:8000` for the host's trusted proxy. The repository
copy defaults to `ghcr.io/stmoelter/mcp-linkedin:0.1.0`. Set `MCP_IMAGE`
in the deployment directory's `.env` file to choose another version or the
digest printed in the release notes. A digest identifies the exact image:

```dotenv
MCP_IMAGE=ghcr.io/stmoelter/mcp-linkedin:0.1.0
```

For a digest, use `MCP_IMAGE=ghcr.io/stmoelter/mcp-linkedin@sha256:<digest>`.
After changing `.env`, run the same `pull` and `up -d` commands. To return to a
previous deployment, select its version or digest and repeat those commands.
Run `python3 scripts/smoke_test.py http://127.0.0.1:8000 0.1.0` from a repository
checkout to check health, discovered tools, their results, and the expected version.

Set the GHCR package's visibility to **Public** in its package settings to enable
anonymous image pulls. The multi-platform image supports Linux AMD64 and ARM64.
Use the [ChatGPT guide](chatgpt.md) to connect through your HTTPS proxy.

## GitHub Actions

`CI` runs on pull requests targeting `main` or `development`, on pushes to those
branches, and on manual requests. Required checks are `quality`, `container`,
`security`, and `documentation`. Quality verifies the lockfile, lint, formatting,
strict typing, 100% application coverage, distributions, and workflow syntax.
Container verification checks Compose configuration, the image build, HTTP health,
MCP initialization, tool discovery, both demo calls, and the runtime user.
Security audits locked dependencies
and license metadata. Documentation checks Markdown and internal file links.
Reports are retained for 14 days; see [quality checks](quality.md).

`Release` runs when a `v*` tag is pushed. It checks that
`vMAJOR.MINOR.PATCH` matches the package version and that the tagged commit is in
main's history. It reruns all four CI checks and publishes:

- `ghcr.io/stmoelter/mcp-linkedin:<version>`
- `ghcr.io/stmoelter/mcp-linkedin:sha-<commit>`

The publishing job uses GitHub's scoped `GITHUB_TOKEN` with package write
permission. It downloads the published image by digest, checks its runtime
user and MCP tools, and verifies both platform entries. A successful publication
creates a GitHub release containing the image digest, deployment Compose file,
and companion skill ZIP. Repository write permission belongs to that release
announcement job. Re-running the announcement updates its image coordinates,
digest, and downloadable assets.

Prepare the release through the Gitflow procedure in [CONTRIBUTING.md](../CONTRIBUTING.md).
After the release PR has merged into main, tag its merged commit:

```sh
git fetch origin
git tag -a v0.1.0 origin/main -m "Release 0.1.0"
git push origin v0.1.0
gh run list --workflow release.yml
gh release view v0.1.0
```

The tag starts image verification and publication directly. A successful release
provides the image coordinates and assets needed to deploy the tested version.

## References

- [MCP Python SDK deployment](https://py.sdk.modelcontextprotocol.io/run/deploy/)
- [GitHub repository rules](https://docs.github.com/en/rest/repos/rules)
- [GitHub Actions container publishing](https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-docker-images)
