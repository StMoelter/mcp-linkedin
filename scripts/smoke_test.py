"""Check health and MCP initialization against a running HTTP container."""

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
        except (urllib.error.URLError, TimeoutError):
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
    print("Container health and MCP initialization passed.")


if __name__ == "__main__":
    main()
