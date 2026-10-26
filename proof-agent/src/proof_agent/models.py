"""Typed data contracts shared by the agent, verifier, and UI."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

from pydantic import BaseModel, Field


Verdict = Literal["supported", "contradicted", "insufficient_evidence"]
Stance = Literal["supports", "contradicts"]


class Evidence(BaseModel):
    url: str = Field(description="URL passed to and successfully read by the read_page tool")
    quote: str = Field(description="An exact excerpt from that retrieved source")
    stance: Stance


class Finding(BaseModel):
    claim: str
    verdict: Verdict
    explanation: str
    evidence: list[Evidence] = Field(default_factory=list)


class Report(BaseModel):
    findings: list[Finding] = Field(min_length=1, max_length=5)


@dataclass(frozen=True)
class Step:
    kind: Literal["search", "read", "note"]
    label: str
    detail: str = ""


@dataclass(frozen=True)
class InvestigationResult:
    report: Report
    steps: list[Step]
    search_count: int
    read_count: int
    unverified_quotes: int
