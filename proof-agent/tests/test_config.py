import pytest

from proof_agent.config import Settings


def test_settings_fail_without_credentials(monkeypatch):
    monkeypatch.delenv("NIMBLE_API_KEY", raising=False)
    monkeypatch.setenv("OPENAI_API_KEY", "dummy")
    with pytest.raises(ValueError, match="NIMBLE_API_KEY"):
        Settings.from_env()


def test_settings_from_env(monkeypatch):
    monkeypatch.setenv("NIMBLE_API_KEY", "nimble-test")
    monkeypatch.setenv("OPENAI_API_KEY", "openai-test")
    monkeypatch.setenv("PROOF_MODEL", "openai:gpt-4.1-mini")
    cfg = Settings.from_env()
    assert cfg.max_searches == 5
    assert cfg.nimble_key == "nimble-test"
