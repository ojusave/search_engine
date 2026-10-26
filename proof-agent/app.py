"""Deliberately small Streamlit UI. Steps come from actual tool execution."""

from __future__ import annotations

from queue import Empty, Queue
from threading import Thread

import streamlit as st

from proof_agent.models import InvestigationResult, Step
from proof_agent.runner import investigate

st.set_page_config(page_title="Proof · Verify with evidence", page_icon="🔎", layout="centered")

EXAMPLE = (
    "Python 3.13 was released in October 2024. It removed the Global Interpreter Lock "
    "by default. Python 3.13 introduced an experimental JIT compiler."
)
LABELS = {
    "supported": ("Supported", "✅"),
    "contradicted": ("Contradicted", "❌"),
    "insufficient_evidence": ("Insufficient evidence", "⚪"),
}

st.title("Proof")
st.caption("Paste a claim. Watch the research. Check the sources.")

if "draft" not in st.session_state:
    st.session_state.draft = ""
if st.button("Use example", type="tertiary"):
    st.session_state.draft = EXAMPLE

with st.form("research_form"):
    text = st.text_area(
        "Text to verify",
        key="draft",
        placeholder="Paste an AI answer, a paragraph, or a few factual claims…",
        height=150,
        max_chars=12_000,
    )
    submitted = st.form_submit_button("Investigate", type="primary", use_container_width=True)

if submitted:
    events: Queue[tuple[str, object]] = Queue()

    def worker() -> None:
        try:
            result = investigate(text, on_step=lambda step: events.put(("step", step)))
            events.put(("result", result))
        except Exception as exc:  # Surface a safe brief error to the user.
            events.put(("error", str(exc)))

    Thread(target=worker, daemon=True).start()
    outcome: InvestigationResult | None = None
    error: str | None = None
    observed: list[Step] = []
    with st.status("Investigating…", expanded=True) as progress:
        while True:
            try:
                kind, payload = events.get(timeout=0.25)
            except Empty:
                continue
            if kind == "step":
                step = payload
                observed.append(step)
                if step.kind == "search":
                    st.write(f"🔎 {step.label}")
                elif step.kind == "read":
                    st.write(f"📄 {step.label}")
                elif step.kind == "note" and "unavailable" in step.label.lower():
                    st.write(f"⚠️ {step.label}")
            elif kind == "result":
                outcome = payload
                progress.update(label="Investigation complete", state="complete", expanded=False)
                break
            elif kind == "error":
                error = str(payload)
                progress.update(label="Investigation stopped", state="error", expanded=False)
                break
    st.session_state.last_outcome = outcome
    st.session_state.last_error = error

if st.session_state.get("last_error"):
    st.error(st.session_state.last_error)

result: InvestigationResult | None = st.session_state.get("last_outcome")
if result:
    st.subheader("Findings")
    st.caption(
        f"{len(result.report.findings)} claims · "
        f"{result.search_count} searches · {result.read_count} pages read"
    )
    for i, finding in enumerate(result.report.findings, start=1):
        label, symbol = LABELS[finding.verdict]
        with st.container(border=True):
            st.markdown(f"**{i}. {finding.claim}**")
            st.markdown(f"{symbol} **{label}**")
            st.write(finding.explanation)
            for evidence in finding.evidence:
                with st.expander("View evidence", expanded=False):
                    st.caption(evidence.stance.capitalize())
                    st.write(f"> {evidence.quote}")
                    st.link_button("Open source", evidence.url, type="tertiary")
    with st.expander(f"Research steps ({len(result.steps)})", expanded=False):
        for step in result.steps:
            icon = "🔎" if step.kind == "search" else "📄" if step.kind == "read" else "·"
            st.write(f"{icon} {step.label}")
            if step.detail:
                st.caption(step.detail)
    if result.unverified_quotes:
        st.warning(f"{result.unverified_quotes} unverified quote(s) excluded from the report.")
    st.caption("Research aid, not a guarantee of truth. Check important claims against original sources.")
