import os

# Testy nie wymagają bazy (także gdy odpalane w kontenerze, gdzie DB_ENABLED=true)
os.environ["DB_ENABLED"] = "false"
os.environ["ROUTING_WARMUP"] = "false"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c
