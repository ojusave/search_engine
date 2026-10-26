"""Environment-based configuration. Never persist or print API credentials."""

from __future__ import annotations

import os
from dataclasses import dataclass

from dotenv import load_dotenv


@dataclass(frozen=True)
class Settings:
    nimble_key: str
    model_name: str = "openai:gpt-4.1-mini"
    max_searches: int = 5
    max_reads: int = 8
    max_page_chars: int = 16_000
    max_model_requests: int = 18

    @classmethod
    def from_env(cls) -> Settings:
        load_dotenv()
        nimble_key = os.getenv("NIMBLE_API_KEY", "").strip()
        if not nimble_key:
            raise ValueError("NIMBLE_API_KEY is missing. See .env.example.")
        if not os.getenv("OPENAI_API_KEY", "").strip():
            raise ValueError("OPENAI_API_KEY is missing. See .env.example.")
        return cls(nimble_key=nimble_key, model_name=os.getenv("PROOF_MODEL") or cls.model_name)
