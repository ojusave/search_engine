"""Orchestrate one bounded investigation and verify its citations."""

from __future__ import annotations

from collections.abc import Callable

from pydantic_ai import UsageLimits

from proof_agent.agent import make_agent
from proof_agent.config import Settings
from proof_agent.models import InvestigationResult, Step
from proof_agent.nimble import NimbleClient
from proof_agent.state import ResearchClient, ResearchState
from proof_agent.verify import verify_report


def investigate(
    text: str,
    *,
    settings: Settings | None = None,
    client: ResearchClient | None = None,
    on_step: Callable[[Step], None] | None = None,
) -> InvestigationResult:
    content = text.strip()
    if len(content) < 20 or len(content) > 12_000:
        raise ValueError("Enter between 20 and 12,000 characters to investigate.")
    cfg = settings or Settings.from_env()
    own_client = client is None
    nimble = client or NimbleClient(cfg.nimble_key)
    state = ResearchState(
        client=nimble,
        max_searches=cfg.max_searches,
        max_reads=cfg.max_reads,
        max_page_chars=cfg.max_page_chars,
        on_step=on_step,
    )
    try:
        result = make_agent(cfg.model_name).run_sync(
            content,
            deps=state,
            usage_limits=UsageLimits(
                request_limit=cfg.max_model_requests,
                tool_calls_limit=cfg.max_searches + cfg.max_reads,
            ),
        )
        verified = verify_report(result.output, state.pages)
        state.emit(
            "note", "Checked source excerpts", f"{verified.rejected} invalid citation(s) excluded"
        )
        return InvestigationResult(
            report=verified.report,
            steps=state.steps.copy(),
            search_count=state.search_count,
            read_count=state.read_count,
            unverified_quotes=verified.rejected,
        )
    finally:
        if own_client:
            nimble.close()
