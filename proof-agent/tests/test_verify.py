from proof_agent.models import Evidence, Finding, Report
from proof_agent.verify import verify_report

URL = "https://docs.python.org/3.13/"
TEXT = "Python 3.13 was released in October 2024. The GIL is still enabled by default."


def make_report(verdict, evidence):
    return Report(
        findings=[
            Finding(
                claim="Test claim",
                verdict=verdict,
                explanation="Model explanation",
                evidence=evidence,
            )
        ]
    )


def test_valid_evidence_preserved_and_whitespace_normalized():
    quote = "Python 3.13 was released in   October 2024."
    report = make_report("supported", [Evidence(url=URL, quote=quote, stance="supports")])
    result = verify_report(report, {URL: TEXT})
    assert result.rejected == 0
    assert result.report.findings[0].verdict == "supported"
    assert len(result.report.findings[0].evidence) == 1


def test_hallucinated_quote_is_removed_and_verdict_downgraded():
    report = make_report(
        "supported",
        [
            Evidence(
                url=URL,
                quote="A made up assertion that's not in the webpage",
                stance="supports",
            )
        ],
    )
    result = verify_report(report, {URL: TEXT})
    assert result.rejected == 1
    assert result.report.findings[0].verdict == "insufficient_evidence"
    assert not result.report.findings[0].evidence


def test_hallucinated_url_is_rejected():
    report = make_report(
        "contradicted",
        [Evidence(url="https://not-read.example/", quote=TEXT[:33], stance="contradicts")],
    )
    result = verify_report(report, {URL: TEXT})
    assert result.rejected == 1
    assert result.report.findings[0].verdict == "insufficient_evidence"


def test_conflicting_evidence_fails_closed():
    report = make_report(
        "supported",
        [
            Evidence(url=URL, quote="Python 3.13 was released in October 2024.", stance="supports"),
            Evidence(url=URL, quote="The GIL is still enabled by default.", stance="contradicts"),
        ],
    )
    result = verify_report(report, {URL: TEXT})
    assert result.report.findings[0].verdict == "insufficient_evidence"
