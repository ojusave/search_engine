from proof_agent.models import Step
from proof_agent.nimble import NimbleError, SearchHit
from proof_agent.state import ResearchState


class FakeNimble:
    def __init__(self):
        self.search_calls = 0
        self.read_calls = 0

    def search(self, query, *, max_results=5):
        self.search_calls += 1
        return [SearchHit("Official docs", "https://python.org/", "Primary source")]

    def extract(self, url):
        self.read_calls += 1
        return "Python 3.13 was released in October 2024."


def test_research_steps_are_from_real_tool_operations_and_cached():
    api = FakeNimble()
    observed: list[Step] = []
    state = ResearchState(api, max_searches=1, max_reads=1, on_step=observed.append)
    assert state.read("https://python.org/")["error"].startswith("Only public")
    hits = state.search("Python 3.13")
    assert hits[0]["title"] == "Official docs"
    assert state.search("repeat")[0]["error"].startswith("Search budget")
    assert "released" in state.read(hits[0]["url"])["content"]
    assert state.read(hits[0]["url"])["cached"] == "true"
    assert api.search_calls == 1 and api.read_calls == 1
    assert [s.kind for s in observed].count("search") == 1
    assert [s.kind for s in observed].count("read") == 1
    assert len(state.pages) == 1


def test_search_failures_go_back_to_agent_as_tool_errors():
    class Broken(FakeNimble):
        def search(self, query, *, max_results=5):
            raise NimbleError("Search temporarily unavailable")

    state = ResearchState(Broken())
    assert state.search("test")[0]["error"] == "Search temporarily unavailable"
    assert any(s.label == "Search unavailable" for s in state.steps)
