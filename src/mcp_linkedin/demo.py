"""Anonymous tools for checking MCP connectivity and trying dice rolls."""

import secrets
from typing import Annotated

from mcp.server import MCPServer
from mcp.types import ToolAnnotations
from pydantic import BaseModel, Field


class ConnectionResult(BaseModel):
    message: str
    server_name: str
    version: str


class DiceResult(BaseModel):
    count: int
    sides: int
    rolls: list[int]
    total: int


def register_demo_tools(server: MCPServer, service_version: str) -> None:
    """Register typed test tools on an application's MCP runtime."""

    @server.tool(
        title="Check MCP connection",
        annotations=ToolAnnotations(
            read_only_hint=True, destructive_hint=False, open_world_hint=False, idempotent_hint=True
        ),
        meta={"securitySchemes": [{"type": "noauth"}]},
        structured_output=True,
    )
    def connection_check(message: str = "Hello from ChatGPT") -> ConnectionResult:
        """Confirm the live MCP connection by echoing text and returning server name and version."""
        return ConnectionResult(
            message=message, server_name="mcp-linkedin", version=service_version
        )

    @server.tool(
        title="Roll dice",
        annotations=ToolAnnotations(
            read_only_hint=True,
            destructive_hint=False,
            open_world_hint=False,
            idempotent_hint=False,
        ),
        meta={"securitySchemes": [{"type": "noauth"}]},
        structured_output=True,
    )
    def roll_dice(
        count: Annotated[int, Field(ge=1, le=20, strict=True)] = 1,
        sides: Annotated[int, Field(ge=2, le=100, strict=True)] = 6,
    ) -> DiceResult:
        """Roll 1 to 20 dice with 2 to 100 sides and return individual values and their sum."""
        rolls = [secrets.randbelow(sides) + 1 for _ in range(count)]
        return DiceResult(count=count, sides=sides, rolls=rolls, total=sum(rolls))
