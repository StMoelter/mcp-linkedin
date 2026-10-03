import json
from collections.abc import Iterator

import httpx2
import pytest
from starlette.testclient import TestClient

from mcp_linkedin.server import create_app


@pytest.fixture
def client() -> Iterator[TestClient]:
    with TestClient(create_app()) as client:
        yield client


def rpc(
    client: TestClient,
    method: str,
    params: dict[str, object] | None = None,
    request_id: int = 1,
    headers: dict[str, str] | None = None,
) -> httpx2.Response:
    payload: dict[str, object] = {"jsonrpc": "2.0", "id": request_id, "method": method}
    if params is not None:
        payload["params"] = params
    return client.post(
        "/mcp",
        json=payload,
        headers={"Accept": "application/json, text/event-stream", **(headers or {})},
    )


def test_health(client: TestClient) -> None:
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_mcp_initialization_with_proxy_host(client: TestClient) -> None:
    response = rpc(
        client,
        "initialize",
        {
            "protocolVersion": "2025-11-25",
            "capabilities": {},
            "clientInfo": {"name": "foundation-test", "version": "1.0.0"},
        },
        headers={"Host": "proxy.example.test"},
    )
    assert response.status_code == 200
    result = response.json()["result"]
    assert result["serverInfo"]["name"] == "mcp-linkedin"
    assert result["serverInfo"]["version"] == "0.1.0"
    assert "resources" in result["capabilities"]


def test_server_info_resource(client: TestClient) -> None:
    response = rpc(client, "resources/read", {"uri": "server://info"})
    assert response.status_code == 200
    content = response.json()["result"]["contents"][0]
    assert content["mimeType"] == "application/json"
    assert json.loads(content["text"]) == {"name": "mcp-linkedin", "version": "0.1.0"}


def test_demo_tools_are_discoverable(client: TestClient) -> None:
    result = rpc(client, "tools/list").json()["result"]
    tools = {tool["name"]: tool for tool in result["tools"]}
    assert {"connection_check", "roll_dice"} <= tools.keys()
    for name in ("connection_check", "roll_dice"):
        tool = tools[name]
        assert tool["description"]
        assert tool["inputSchema"]["type"] == "object"
        assert tool["outputSchema"]["type"] == "object"
        assert tool["annotations"]["readOnlyHint"] is True
        assert tool["annotations"]["destructiveHint"] is False
        assert tool["annotations"]["openWorldHint"] is False
        assert tool["_meta"]["securitySchemes"] == [{"type": "noauth"}]
    assert tools["connection_check"]["annotations"]["idempotentHint"] is True
    assert tools["roll_dice"]["annotations"]["idempotentHint"] is False
    properties = tools["roll_dice"]["inputSchema"]["properties"]
    assert properties["count"]["minimum"] == 1
    assert properties["count"]["maximum"] == 20
    assert properties["sides"]["minimum"] == 2
    assert properties["sides"]["maximum"] == 100


@pytest.mark.parametrize(
    "arguments, message",
    [
        ({}, "Hello from ChatGPT"),
        ({"message": "Steffen testet MCP 👋"}, "Steffen testet MCP 👋"),
        ({"message": ""}, ""),
    ],
)
def test_connection_check_echoes_text(
    client: TestClient, arguments: dict[str, object], message: str
) -> None:
    result = rpc(client, "tools/call", {"name": "connection_check", "arguments": arguments}).json()[
        "result"
    ]
    assert result.get("isError", False) is False
    assert result["structuredContent"] == {
        "message": message,
        "server_name": "mcp-linkedin",
        "version": "0.1.0",
    }
    assert json.loads(result["content"][0]["text"]) == result["structuredContent"]


@pytest.mark.parametrize("count,sides", [(1, 2), (20, 100), (3, 6)])
def test_dice_results_and_sum(
    client: TestClient, monkeypatch: pytest.MonkeyPatch, count: int, sides: int
) -> None:
    monkeypatch.setattr("secrets.randbelow", lambda limit: limit - 1)
    result = rpc(
        client, "tools/call", {"name": "roll_dice", "arguments": {"count": count, "sides": sides}}
    ).json()["result"]
    assert result.get("isError", False) is False
    assert result["structuredContent"] == {
        "count": count,
        "sides": sides,
        "rolls": [sides] * count,
        "total": count * sides,
    }


def test_dice_defaults_and_minimum_roll(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setattr("secrets.randbelow", lambda limit: 0)
    result = rpc(client, "tools/call", {"name": "roll_dice", "arguments": {}}).json()["result"]
    assert result["structuredContent"] == {"count": 1, "sides": 6, "rolls": [1], "total": 1}


@pytest.mark.parametrize(
    "arguments",
    [
        {"count": 0},
        {"count": 21},
        {"sides": 1},
        {"sides": 101},
        {"count": 1.5},
        {"count": True},
        {"sides": "6"},
    ],
)
def test_dice_rejects_invalid_arguments(client: TestClient, arguments: dict[str, object]) -> None:
    result = rpc(client, "tools/call", {"name": "roll_dice", "arguments": arguments}).json()[
        "result"
    ]
    assert result["isError"] is True
    assert "Unknown tool" not in result["content"][0]["text"]


def test_unknown_method_returns_protocol_error(client: TestClient) -> None:
    response = rpc(client, "unknown/method")
    assert response.status_code == 200
    assert response.json()["error"]["code"] == -32601


def test_malformed_json_is_rejected(client: TestClient) -> None:
    response = client.post(
        "/mcp",
        content="{",
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
    )
    assert response.status_code == 400


@pytest.mark.parametrize("port", ["abc", "0", "65536", "-1"])
def test_invalid_port_fails_startup(monkeypatch: pytest.MonkeyPatch, port: str) -> None:
    from mcp_linkedin.__main__ import main

    monkeypatch.setenv("PORT", port)
    with pytest.raises(ValueError, match="PORT must be an integer between 1 and 65535"):
        main()
