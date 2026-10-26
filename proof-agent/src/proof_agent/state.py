"""Per-run research state and transparent, bounded tool operations."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Callable, Protocol

from proof_agent.models import Step
from proof_agent.nimble import NimbleError, SearchHit
from proof_agent.urls import public_url


class ResearchClient(Protocol):
    def search(self, query: str, *, max_results: int = 5) -> list[SearchHit]: ...
    def extract(self, url: str) -> str: ...


@dataclass
class ResearchState:
    client: ResearchClient
    max_searches: int = 5
    max_reads: int = 8
    max_page_chars: int = 16_000
    on_step: Callable[[Step], None] | None = None
    hits: dict[str, SearchHit] = field(default_factory=dict)
    pages: dict[str, str] = field(default_factory=dict)
    steps: list[Step] = field(default_factory=list)
    search_count: int = 0
    read_count: int = 0

    def emit(self, kind: Step.kind, label: str, detail: str = "") -> None:
        step = Step(kind=kind, label=label, detail=detail)
        self.steps.append(step)
        if self.on_step:
            self.on_step(step)

    def search(self, query: str) -> list[dict[str, str]]:
        query = query.strip()[:300]
        if not query:
            return [{"error": "Provide a nonempty search query."}]
        if self.search_count >= self.max_searches:
            return [{"error": "Search budget exhausted. Return your best supported answer."}]
        self.search_count += 1
        self.emit("search", f"Search · {query}")
        try:
            results = self.client.search(query)
        except NimbleError as exc:
            self.emit("note", "Search unavailable", str(exc))
            return [{"error": str(exc)}]
        for hit in results:
            self.hits[hit.url] = hit
        self.emit("note", f"Found {len(results)} result(s)")
        return [
            {"title": hit.title, "url": hit.url, "description": hit.description}
            for hit in results
        ]

    def read(self, url: str) -> dict[str, str]:
        safe_url = public_url(url)
        if not safe_url or safe_url not in self.hits:
            return {"error": "Only public URLs from this run's Nimble Search can be read."}
        if safe_url in self.pages:
            return {"url": safe_url, "content": self.pages[safe_url], "cached": "true"}
        if self.read_count >= self.max_reads:
            return {"error": "Page-reading budget exhausted. Finish with verified evidence."}
        self.read_count += 1
        self.emit("read", f"Read · {self.hits[safe_url].title}", safe_url)
        try:
            content = self.client.extract(safe_url)[: self.max_page_chars]
        except NimbleError as exc:
            self.emit("note", "Page unavailable", str(exc))
            return {"error": str(exc)}
        self.pages[safe_url] = content
        return {"url": safe_url, "content": content}
