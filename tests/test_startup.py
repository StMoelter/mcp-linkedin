"""Verify the listening configuration at the server boundary."""

import runpy

import pytest
import uvicorn
from starlette.applications import Starlette
from starlette.testclient import TestClient

from mcp_linkedin import __main__ as entrypoint


@pytest.mark.parametrize(
    ("configured_port", "expected_port"),
    [(None, 8000), ("8123", 8123), ("1", 1), ("65535", 65535)],
)
def test_startup_serves_the_application_on_the_configured_port(
    monkeypatch: pytest.MonkeyPatch, configured_port: str | None, expected_port: int
) -> None:
    received: list[tuple[str, int, bool]] = []

    def serve(app: Starlette, *, host: str, port: int, proxy_headers: bool) -> None:
        with TestClient(app) as client:
            assert client.get("/health").json() == {"status": "ok"}
        received.append((host, port, proxy_headers))

    monkeypatch.setattr(uvicorn, "run", serve)
    if configured_port is None:
        monkeypatch.delenv("PORT", raising=False)
    else:
        monkeypatch.setenv("PORT", configured_port)

    entrypoint.main()

    assert received == [("0.0.0.0", expected_port, False)]


def test_module_entrypoint_launches_the_http_application(monkeypatch: pytest.MonkeyPatch) -> None:
    received: list[int] = []

    def serve(app: Starlette, *, host: str, port: int, proxy_headers: bool) -> None:
        with TestClient(app) as client:
            assert client.get("/health").status_code == 200
        received.append(port)

    monkeypatch.setattr(uvicorn, "run", serve)
    monkeypatch.setenv("PORT", "8124")

    runpy.run_path(entrypoint.__file__, run_name="__main__")

    assert received == [8124]
