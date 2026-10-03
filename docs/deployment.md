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

## GitHub Actions

`CI` runs on pull requests targeting `main` or `development`, on pushes to those
branches, and on manual requests. Required checks are `quality` and `container`.
The quality check verifies the lockfile, lint, formatting, strict typing, tests,
and Python distributions. The container check builds the image and verifies HTTP
health, MCP initialization, and the runtime user.

`Release` runs when a stable GitHub release is published. It checks that
`vMAJOR.MINOR.PATCH` matches the package version and that the tagged commit is in
main's history. It reruns CI and publishes:

- `ghcr.io/stmoelter/mcp-linkedin:<version>`
- `ghcr.io/stmoelter/mcp-linkedin:sha-<commit>`

The publishing job uses GitHub's scoped `GITHUB_TOKEN` with package write
permission. The repository owner manages GHCR package visibility and consumer
access. Deploy a selected version or digest through the hosting environment's
container orchestration, then verify `/health` and MCP initialization.

## References

- [MCP Python SDK deployment](https://py.sdk.modelcontextprotocol.io/run/deploy/)
- [GitHub repository rules](https://docs.github.com/en/rest/repos/rules)
- [GitHub Actions container publishing](https://docs.github.com/en/actions/use-cases-and-examples/publishing-packages/publishing-docker-images)
