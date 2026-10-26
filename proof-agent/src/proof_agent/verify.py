"""Deterministic post-processing: don't trust generated URLs or quotations."""

from __future__ import annotations

import re
from dataclasses import dataclass

from proof_agent.models import Evidence, Finding, Report
from proof_agent.urls import public_url


@dataclass(frozen=True)
class Verified:
    report: Report
    rejected: int


def normalize(value: str) -> str:
    return re.sub(r"\s+", " ", value).strip().casefold()


def verify_report(report: Report, pages: dict[str, str]) -> Verified:
    """Only retain evidence actually present in pages read by the agent.

    This establishes provenance of the excerpt, not the factual truth of its contents.
    """
    final: list[Finding] = []
    rejected = 0
    for finding in report.findings:
        valid: list[Evidence] = []
        for item in finding.evidence:
            url = public_url(item.url)
            page = pages.get(url or "", "")
            if url and len(normalize(item.quote)) >= 15 and normalize(item.quote) in normalize(page):
                valid.append(Evidence(url=url, quote=item.quote.strip(), stance=item.stance))
            else:
                rejected += 1

        supporting = any(e.stance == "supports" for e in valid)
        contradicting = any(e.stance == "contradicts" for e in valid)
        verdict = finding.verdict
        explanation = finding.explanation
        if (supporting and contradicting) or (
            verdict == "supported" and not supporting
        ) or (verdict == "contradicted" and not contradicting):
            verdict = "insufficient_evidence"
            explanation = (
                "Sources disagree, or a verifiable excerpt for this verdict was unavailable. "
                "Review the evidence below."
            )
        final.append(
            Finding(
                claim=finding.claim,
                verdict=verdict,
                explanation=explanation,
                evidence=valid,
            )
        )
    return Verified(report=Report(findings=final), rejected=rejected)
