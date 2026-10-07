import json
from pathlib import Path

import pytest

GOLDEN = Path(__file__).resolve().parents[2] / "shared" / "golden-demo.json"


@pytest.fixture(scope="session")
def golden() -> dict:
    return json.loads(GOLDEN.read_text(encoding="utf-8"))
