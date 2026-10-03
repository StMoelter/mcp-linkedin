"""Launch the HTTP service."""

import os

import uvicorn

from mcp_linkedin.server import create_app


def main() -> None:
    """Serve HTTP using the configured container port."""
    message = "PORT must be an integer between 1 and 65535"
    try:
        port = int(os.environ.get("PORT", "8000"))
    except ValueError as error:
        raise ValueError(message) from error
    if not 1 <= port <= 65535:
        raise ValueError(message)
    uvicorn.run(create_app(), host="0.0.0.0", port=port, proxy_headers=False)


if __name__ == "__main__":
    main()
