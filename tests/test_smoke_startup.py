import io
import runpy
import sys
import urllib.request
from pathlib import Path

import pytest
from starlette.testclient import TestClient

from mcp_linkedin.server import create_app


def test_smoke_retries_reset_during_container_startup(monkeypatch: pytest.MonkeyPatch) -> None:
    attempts = 0
    with TestClient(create_app()) as client:

        def urlopen(url: str | urllib.request.Request, timeout: float) -> io.BytesIO:
            nonlocal attempts
            if isinstance(url, str):
                attempts += 1
                if attempts < 3:
                    raise ConnectionResetError("Container is starting")
                response = client.get("/health")
            else:
                assert isinstance(url.data, bytes)
                response = client.post("/mcp", content=url.data, headers=dict(url.header_items()))
            response.raise_for_status()
            return io.BytesIO(response.content)

        monkeypatch.setattr(urllib.request, "urlopen", urlopen)
        monkeypatch.setattr("time.sleep", lambda seconds: None)
        monkeypatch.setattr(sys, "argv", ["smoke_test.py"])
        runpy.run_path(
            str(Path(__file__).resolve().parents[1] / "scripts/smoke_test.py"), run_name="__main__"
        )
