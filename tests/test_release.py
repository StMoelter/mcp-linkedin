import subprocess
import sys
from pathlib import Path

import pytest

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "verify_release.py"


@pytest.fixture
def release_repo(tmp_path: Path) -> Path:
    subprocess.run(
        ["git", "init", "--initial-branch=main", str(tmp_path)], check=True, capture_output=True
    )
    (tmp_path / "pyproject.toml").write_text('[project]\nversion = "0.1.0"\n')
    subprocess.run(["git", "add", "."], cwd=tmp_path, check=True)
    subprocess.run(
        [
            "git",
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.test",
            "commit",
            "-m",
            "Initial version",
        ],
        cwd=tmp_path,
        check=True,
        capture_output=True,
    )
    subprocess.run(
        ["git", "update-ref", "refs/remotes/origin/main", "HEAD"], cwd=tmp_path, check=True
    )
    return tmp_path


def verify(repo: Path, tag: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [sys.executable, str(SCRIPT), tag], cwd=repo, text=True, capture_output=True, check=False
    )


def test_release_accepts_matching_main_version(release_repo: Path) -> None:
    result = verify(release_repo, "v0.1.0")
    assert result.returncode == 0, result.stderr
    assert result.stdout.strip() == "0.1.0"


@pytest.mark.parametrize("tag", ["0.1.0", "v01.1.0", "v0.1.0-rc.1", "v0.1", "v0.1.0extra"])
def test_release_rejects_invalid_tag(release_repo: Path, tag: str) -> None:
    result = verify(release_repo, tag)
    assert result.returncode == 1
    assert "vMAJOR.MINOR.PATCH" in result.stderr


def test_release_rejects_version_mismatch(release_repo: Path) -> None:
    result = verify(release_repo, "v0.2.0")
    assert result.returncode == 1
    assert "package version" in result.stderr


def test_release_rejects_unmerged_commit(release_repo: Path) -> None:
    (release_repo / "feature.txt").write_text("Feature awaiting its PR\n")
    subprocess.run(["git", "add", "."], cwd=release_repo, check=True)
    subprocess.run(
        [
            "git",
            "-c",
            "user.name=Test",
            "-c",
            "user.email=test@example.test",
            "commit",
            "-m",
            "Feature",
        ],
        cwd=release_repo,
        check=True,
        capture_output=True,
    )
    result = verify(release_repo, "v0.1.0")
    assert result.returncode == 1
    assert "main" in result.stderr
