import io
import json
import runpy
import sys
import urllib.request
from pathlib import Path

import pytest


def test_smoke_retries_reset_during_container_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    attempts = 0

    def urlopen(url: str | urllib.request.Request, timeout: float) -> io.BytesIO:
        nonlocal attempts
        payload: dict[str, object]
        if isinstance(url, str):
            attempts += 1
            if attempts < 3:
                raise ConnectionResetError("Container is starting")
            payload = {"status": "ok"}
        else:
            payload = {"result": {"serverInfo": {"name": "mcp-linkedin"}}}
        return io.BytesIO(json.dumps(payload).encode())

    monkeypatch.setattr(urllib.request, "urlopen", urlopen)
    monkeypatch.setattr("time.sleep", lambda seconds: None)
    monkeypatch.setattr(sys, "argv", ["smoke_test.py"])
    runpy.run_path(
        str(Path(__file__).resolve().parents[1] / "scripts/smoke_test.py"), run_name="__main__"
    )
