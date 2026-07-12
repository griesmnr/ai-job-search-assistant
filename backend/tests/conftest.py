import sys
from pathlib import Path
import importlib
from unittest.mock import MagicMock

import anthropic
import dotenv
import openai
import pytest
import supabase as supabase_package
from fastapi.testclient import TestClient
from google import genai


BACKEND_DIR = Path(__file__).resolve().parents[1]

if str(BACKEND_DIR) not in sys.path:
    sys.path.insert(0, str(BACKEND_DIR))


@pytest.fixture
def main_module(monkeypatch):
    """
    Import main.py with all external clients replaced by mocks.

    This prevents tests from:
    - reading the real .env.local file
    - contacting Supabase
    - contacting OpenAI
    - contacting Anthropic
    - contacting Google Gemini
    """

    monkeypatch.setattr(
        dotenv,
        "load_dotenv",
        lambda *args, **kwargs: None,
    )

    monkeypatch.setenv("SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setenv("SUPABASE_SERVICE_ROLE_KEY", "test-service-key")
    monkeypatch.setenv("OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setenv("ANTHROPIC_API_KEY", "test-anthropic-key")
    monkeypatch.setenv("GOOGLE_API_KEY", "test-google-key")
    monkeypatch.setenv("APP_ACCESS_SECRET", "test-app-secret")

    fake_supabase = MagicMock()
    fake_openai = MagicMock()
    fake_anthropic = MagicMock()
    fake_genai = MagicMock()

    monkeypatch.setattr(
        supabase_package,
        "create_client",
        lambda *args, **kwargs: fake_supabase,
    )
    monkeypatch.setattr(
        openai,
        "OpenAI",
        lambda *args, **kwargs: fake_openai,
    )
    monkeypatch.setattr(
        anthropic,
        "Anthropic",
        lambda *args, **kwargs: fake_anthropic,
    )
    monkeypatch.setattr(
        genai,
        "Client",
        lambda *args, **kwargs: fake_genai,
    )

    # Force a clean import for every test.
    sys.modules.pop("main", None)

    module = importlib.import_module("main")

    module.supabase = fake_supabase
    module.openai_client = fake_openai
    module.anthropic_client = fake_anthropic
    module.genai_client = fake_genai

    return module


@pytest.fixture
def client(main_module):
    return TestClient(main_module.app)