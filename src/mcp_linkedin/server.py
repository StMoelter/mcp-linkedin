"""HTTP application and MCP service metadata."""

import json
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from importlib.metadata import version

from mcp.server import MCPServer
from mcp.server.transport_security import TransportSecuritySettings
from starlette.applications import Starlette
from starlette.requests import Request
from starlette.responses import JSONResponse
from starlette.routing import Mount, Route


def create_app() -> Starlette:
    """Create an independent MCP runtime for a trusted HTTP backend."""
    service_version = version("mcp-linkedin")
    mcp = MCPServer("mcp-linkedin", version=service_version)

    @mcp.resource("server://info", mime_type="application/json")
    def server_info() -> str:
        """Read the running service's name and version."""
        return json.dumps({"name": "mcp-linkedin", "version": service_version})

    mcp_app = mcp.streamable_http_app(
        stateless_http=True,
        json_response=True,
        transport_security=TransportSecuritySettings(enable_dns_rebinding_protection=False),
    )

    @asynccontextmanager
    async def lifespan(app: Starlette) -> AsyncIterator[None]:
        async with mcp.session_manager.run():
            yield

    async def health(request: Request) -> JSONResponse:
        return JSONResponse({"status": "ok"})

    return Starlette(
        routes=[Route("/health", health), Mount("/", app=mcp_app)],
        lifespan=lifespan,
    )
