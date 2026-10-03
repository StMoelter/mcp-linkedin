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
