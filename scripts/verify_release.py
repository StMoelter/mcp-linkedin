"""Validate a stable release tag against package metadata and main ancestry."""

import re
import subprocess
import sys
import tomllib
from pathlib import Path


def verify_release(tag: str) -> str:
    """Return the release version when metadata and Git history agree."""
    if not re.fullmatch(r"v(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)", tag):
        raise ValueError("Use vMAJOR.MINOR.PATCH for a stable release tag")
    version: str = tomllib.loads(Path("pyproject.toml").read_text())["project"]["version"]
    if tag != f"v{version}":
        raise ValueError("Release tag must match the package version")
    ancestry = subprocess.run(
        ["git", "merge-base", "--is-ancestor", "HEAD", "origin/main"],
        capture_output=True,
        check=False,
    )
    if ancestry.returncode != 0:
        raise ValueError("Release commit must belong to origin/main history")
    return version


def main() -> int:
    """Print the verified version for consumption by GitHub Actions."""
    try:
        print(verify_release(sys.argv[1]))
    except ValueError as error:
        print(error, file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
