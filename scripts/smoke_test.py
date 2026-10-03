"""Check health, MCP discovery, and demo calls against a running HTTP service."""

import json
import sys
import time
import urllib.error
import urllib.request


def main() -> None:
    base_url = sys.argv[1] if len(sys.argv) > 1 else "http://127.0.0.1:8000"
    for attempt in range(30):
        try:
            with urllib.request.urlopen(f"{base_url}/health", timeout=2) as response:
                assert json.load(response) == {"status": "ok"}
            break
        except (urllib.error.URLError, TimeoutError, ConnectionError):
            if attempt == 29:
                raise
            time.sleep(1)

    request = urllib.request.Request(
        f"{base_url}/mcp",
        data=json.dumps(
            {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2025-11-25",
                    "capabilities": {},
                    "clientInfo": {"name": "container-smoke", "version": "1.0.0"},
                },
            }
        ).encode(),
        headers={
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream",
        },
    )
    with urllib.request.urlopen(request, timeout=5) as response:
        payload = json.load(response)
    assert payload["result"]["serverInfo"]["name"] == "mcp-linkedin"
    server_version = payload["result"]["serverInfo"]["version"]
    if len(sys.argv) > 2:
        assert server_version == sys.argv[2], "Deployed version must match the selected release"

    checks = [
        {"method": "tools/list", "params": {}},
        {
            "method": "tools/call",
            "params": {
                "name": "connection_check",
                "arguments": {"message": "Container smoke check"},
            },
        },
        {
            "method": "tools/call",
            "params": {"name": "roll_dice", "arguments": {"count": 3, "sides": 6}},
        },
    ]
    results = []
    for request_id, check in enumerate(checks, start=2):
        request = urllib.request.Request(
            f"{base_url}/mcp",
            data=json.dumps({"jsonrpc": "2.0", "id": request_id, **check}).encode(),
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream",
            },
        )
        with urllib.request.urlopen(request, timeout=5) as response:
            payload = json.load(response)
        assert "error" not in payload, payload
        result = payload["result"]
        assert not result.get("isError", False), result
        results.append(result)
    assert {"connection_check", "roll_dice"} <= {tool["name"] for tool in results[0]["tools"]}
    assert results[1]["structuredContent"] == {
        "message": "Container smoke check",
        "server_name": "mcp-linkedin",
        "version": server_version,
    }
    dice = results[2]["structuredContent"]
    assert dice["count"] == 3 and dice["sides"] == 6
    assert len(dice["rolls"]) == 3
    assert all(isinstance(roll, int) and 1 <= roll <= 6 for roll in dice["rolls"])
    assert dice["total"] == sum(dice["rolls"])
    print(f"Health, MCP discovery, connection check, and dice passed (version {server_version}).")


if __name__ == "__main__":
    main()
