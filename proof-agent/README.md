# Proof — an AI agent that checks its sources

**Paste text. Watch the research. Read the evidence.**

Proof investigates factual claims using the live web. Instead of generating an answer and attaching plausible-looking citations, it searches for evidence, reads source pages, decides whether further research is needed, and then reports what it could (and couldn't) verify.

Built with **Nimble Search + Extract**, **PydanticAI**, **OpenAI**, and **Streamlit**.

> **Status:** Implemented and passing local mocked-API unit tests. Live end-to-end verification requires your own Nimble and OpenAI credentials; no real-agent accuracy benchmark is claimed here.

## What it does

1. Paste an AI response, article excerpt, or a few factual statements.
2. Proof identifies up to five independently verifiable claims.
3. Its agent **chooses its own Nimble searches**, examines candidate sources with Nimble Extract, and follows up when necessary.
4. Results are classified as **Supported**, **Contradicted**, or **Insufficient evidence**.
5. See the *actual tool-use timeline* and open the source pages behind every accepted quotation.

Example input:

> Python 3.13 was released in October 2024. It removed the Global Interpreter Lock by default. Python 3.13 introduced an experimental JIT compiler.

The example intentionally mixes factual statements; the application must investigate them rather than rely on the expected answer. **Results are only shown after a live run**, not hard-coded in the UI.

## Quick start

**Requirements:** Python 3.11+, a [Nimble API key](https://online.nimbleway.com/), and an [OpenAI API key](https://platform.openai.com/api-keys).

```bash
git clone https://github.com/ojusave/search_engine.git
cd search_engine/proof-agent
python -m venv .venv
source .venv/bin/activate                 # Windows: .venv\Scripts\activate
pip install -e .
cp .env.example .env
```

Edit `.env` and add your keys:

```dotenv
NIMBLE_API_KEY=your_nimble_key
OPENAI_API_KEY=your_openai_key
PROOF_MODEL=openai:gpt-4.1-mini
```

Start the app:

```bash
streamlit run app.py
```

Open the local URL printed by Streamlit (normally http://localhost:8501). Click **Use example** or paste your own paragraph, then **Investigate**. Search and read steps appear while the agent works; findings and sources appear when it finishes.

Prefer the terminal? Run the same implementation without the UI:

```bash
proof 'Python 3.13 was released in October 2024. It removed the GIL by default.'
```

**Do not commit credentials.** `.env` and Streamlit secrets are ignored by Git. For a hosted application use the hosting provider's secret manager, and put an authentication/rate limit in front of public access so strangers cannot consume your paid APIs.

## How it works

```text
                         Pasted paragraph
                                │
                                ▼
                   PydanticAI research agent
                    (OpenAI reasoning model)
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
         Nimble Search                    Nimble Extract
       (find public URLs)               (read real pages)
                │                               │
                └───────────────┬───────────────┘
                                ▼
                     Evaluate what was found
                        ↺ search/read again
                                │
                                ▼
                        Structured report
                                │
                                ▼
                 Validate URLs + exact quotes
                                │
                                ▼
                    Findings + research trace
```

**Why is this an agent rather than a fixed pipeline?** The application defines two narrow tools, but does **not** encode `search → extract → summarize` as a mandatory sequence. The model chooses queries, which search hits to open, whether to follow up, and when to stop. Tool calls are capped; unsuccessful investigations should yield uncertainty, not invented evidence.

### What Nimble actually does

| Tool | Nimble endpoint | Responsibility |
|---|---|---|
| `search_web(query)` | `POST /v2/search` | Discover current candidate sources and return title, URL, snippet |
| `read_page(url)` | `POST /v2/extract` | Read a discovered source as Markdown before citing it |

Both calls go through the same small HTTP client (`nimble.py`). `full_content=false` and `search_depth=lite` keep initial discovery focused; Extract provides the source text used for final evidence. The LLM does **not** use another provider's web-search feature. The design intentionally makes Nimble necessary to the workflow, without making untested comparisons to competing search APIs.

API references: [Nimble Search](https://docs.nimbleway.com/api-reference/search/search) · [Nimble Extract](https://docs.nimbleway.com/api-reference/extract/extract) · [API introduction](https://docs.nimbleway.com/api-reference/introduction)

## Project layout

```text
proof-agent/
├── app.py                     Minimal Streamlit interface + live progress display
├── src/proof_agent/
│   ├── agent.py               PydanticAI instructions and tool registration
│   ├── cli.py                 Terminal entry point
│   ├── config.py              Environment settings and run budgets
│   ├── models.py              Pydantic report and event contracts
│   ├── nimble.py              One Nimble HTTP client, Search + Extract
│   ├── runner.py              Execute, bound, verify and return an investigation
│   ├── state.py               Per-run source allowlist, cache and real tool trace
│   ├── urls.py                Reject suspicious extraction URLs
│   └── verify.py              Deterministic source/quotation validation
├── tests/                     Mock-HTTP and pure-unit tests; no paid calls
├── .github/workflows/         CI: lint + pytest + compilation
├── .env.example               Configuration template (no credentials)
└── pyproject.toml             Dependencies, command, lint/test settings
```

The separation matters: we can swap the interface without changing research logic, change models without rewriting Nimble, or test the verifier without making an API call.

## Guardrails and design decisions

- **Evidence, not snippets.** The agent must read a page before citing it. Snippets are useful for discovery, not conclusive verification.
- **Check quotations.** After the model produces a report, code checks that every evidence URL was actually extracted and that the claimed quote occurs in its retrieved text. Invalid citations are removed; unsupported verdicts are downgraded. This is **provenance validation**, not proof that a source is factually correct.
- **Research budgets.** Maximum 5 searches, 8 page reads, 18 model requests per investigation by default. Re-reading a previously retrieved URL uses the in-memory cache.
- **Conservative URLs.** Extract only public HTTP(S) links returned during the current Nimble search, and reject literal IPs, local names, credentials, and unusual ports. This is not comprehensive SSRF defense (e.g. DNS rebinding/redirects); use an egress proxy or network controls in production.
- **Untrusted content.** Retrieved web pages are evidence, never system instructions. Prompt-injection resistance is *not guaranteed* by an instruction alone; test it explicitly.
- **No permanent storage.** The app does not save pasted text, source content, or reports. One investigation is stored in Streamlit session state until the session ends. Provider-side processing and retention follow the providers' own terms.
- **Honest uncertainty.** No percentages or invented confidence scores. A lack of evidence isn't evidence that a claim is false.

This is a developer demo—not a source of medical, financial, legal, or other high-stakes decisions without independent verification.

## Testing

```bash
pip install -e '.[dev]'
ruff check .
pytest -q
python -m compileall -q src app.py
```

Tests use `httpx.MockTransport` and fakes, so CI runs without any paid API keys. They verify the Nimble request shapes, safe URL handling, tool-call budgets, cached reads, recorded events, error handling, and citation rejection.

**Live smoke test (requires your keys and may incur cost):**

1. Start the app with both API keys.
2. Click **Use example** and **Investigate**.
3. Confirm the timeline shows real Search and Extract operations.
4. Open at least one cited URL; compare the quote to the original page.
5. Try a false claim and a claim without good available evidence. Confirm the app doesn't call either one "supported" without evidence.
6. Repeat with a breaking-news claim and watch whether the agent requests newer sources.

For rigorous evaluation, add a small hand-verified set of claims and track verdict correctness, citation validity, retrieval relevance, source freshness, latency, and API usage. Those scores are intentionally **not** fabricated in this README.

## Troubleshooting

| Symptom | What to check |
|---|---|
| `NIMBLE_API_KEY is missing` | Copy `.env.example` to `.env`; fill in your key |
| `OPENAI_API_KEY is missing` | Add the OpenAI key in `.env` and restart |
| Nimble HTTP 401/403 | Verify the key and account permissions in the Nimble dashboard |
| Nimble HTTP 429 | Wait for account quota/rate limits; don't retry aggressively |
| OpenAI model error | Confirm `PROOF_MODEL` is supported by your account and is tool-capable |
| Search succeeds but Extract fails | Try another returned source; some pages restrict extraction |
| Insufficient evidence | Inspect the research timeline and source quotes; uncertainty is intentional |
| Tool/model budget exhausted | Reduce the text to fewer claims; the limits protect latency and cost |

## Extending Proof

Good next steps are a benchmark suite, structured telemetry, a durable queue for longer investigations, stronger SSRF/prompt-injection controls, and a human-review option. None is necessary to understand or run the core demonstration.

---

**Built for the Nimble Principal Developer Advocate take-home exercise.** The point is not to pretend an LLM can certify truth. It's to show how a developer can build a legible investigation loop where fresh web data is central, evidence is inspectable, and the AI knows when it has not established an answer.
