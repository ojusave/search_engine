"""Nimble v2 Search and Extract client. All external web retrieval lives here."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

from proof_agent.urls import public_url

BASE_URL = "https://sdk.nimbleway.com/v2"


class NimbleError(Exception):
    """A safe-to-display error raised for a failed Nimble operation."""


@dataclass(frozen=True)
class SearchHit:
    title: str
    url: str
    description: str


class NimbleClient:
    def __init__(self, api_key: str, *, http_client: httpx.Client | None = None):
        self._key = api_key
        self._owns_client = http_client is None
        self._http = http_client or httpx.Client(timeout=httpx.Timeout(40.0, connect=8.0))

    def close(self) -> None:
        if self._owns_client:
            self._http.close()

    def __enter__(self) -> NimbleClient:
        return self

    def __exit__(self, *_: object) -> None:
        self.close()

    def _post(self, endpoint: str, payload: dict[str, Any]) -> dict[str, Any]:
        try:
            response = self._http.post(
                f"{BASE_URL}/{endpoint}",
                headers={"Authorization": f"Bearer {self._key}"},
                json=payload,
            )
            response.raise_for_status()
            data = response.json()
        except httpx.TimeoutException as exc:
            raise NimbleError(f"Nimble {endpoint} timed out.") from exc
        except httpx.HTTPStatusError as exc:
            raise NimbleError(f"Nimble {endpoint} returned HTTP {exc.response.status_code}.") from exc
        except (httpx.RequestError, ValueError) as exc:
            raise NimbleError(f"Nimble {endpoint} could not return usable data.") from exc
        if not isinstance(data, dict):
            raise NimbleError(f"Nimble {endpoint} returned an unexpected response.")
        return data

    def search(self, query: str, *, max_results: int = 5) -> list[SearchHit]:
        data = self._post(
            "search",
            {
                "query": query,
                "search_depth": "lite",
                "max_results": max_results,
                "full_content": False,
            },
        )
        raw_hits = data.get("results")
        if not isinstance(raw_hits, list):
            raise NimbleError("Nimble Search returned no results list.")
        hits: list[SearchHit] = []
        for hit in raw_hits:
            if not isinstance(hit, dict):
                continue
            url = public_url(str(hit.get("url") or ""))
            if url:
                hits.append(
                    SearchHit(
                        title=str(hit.get("title") or "Untitled")[:200],
                        url=url,
                        description=str(hit.get("description") or "")[:500],
                    )
                )
        return hits

    def extract(self, url: str) -> str:
        safe_url = public_url(url)
        if not safe_url:
            raise NimbleError("Refusing to extract a non-public HTTP(S) URL.")
        data = self._post("extract", {"url": safe_url, "formats": ["markdown"]})
        if data.get("status") != "success":
            raise NimbleError("Nimble could not extract this page.")
        payload = data.get("data")
        markdown = payload.get("markdown") if isinstance(payload, dict) else None
        if not isinstance(markdown, str) or not markdown.strip():
            raise NimbleError("Nimble returned no readable Markdown for this page.")
        return markdown
