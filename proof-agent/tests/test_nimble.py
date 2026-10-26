import httpx
import pytest

from proof_agent.nimble import NimbleClient, NimbleError


def test_search_and_extract_use_correct_v2_endpoints():
    requests = []

    def handler(request):
        requests.append(request)
        assert request.headers["Authorization"] == "Bearer fake-key"
        if request.url.path.endswith("/search"):
            assert '"search_depth":"lite"' in request.content.decode()
            return httpx.Response(
                200,
                json={
                    "results": [
                        {
                            "url": "https://docs.python.org/3.13/",
                            "title": "Python",
                            "description": "Docs",
                        },
                        {"url": "http://127.0.0.1/", "title": "Unsafe"},
                    ]
                },
            )
        assert request.url.path.endswith("/extract")
        assert '"formats":["markdown"]' in request.content.decode()
        return httpx.Response(
            200, json={"status": "success", "data": {"markdown": "# Python docs"}}
        )

    http_client = httpx.Client(transport=httpx.MockTransport(handler))
    api = NimbleClient("fake-key", http_client=http_client)
    results = api.search("python")
    assert len(results) == 1
    assert results[0].title == "Python"
    assert api.extract(results[0].url) == "# Python docs"
    assert [r.url.path for r in requests] == ["/v2/search", "/v2/extract"]
    http_client.close()


def test_http_error_does_not_leak_api_key():
    client = httpx.Client(transport=httpx.MockTransport(lambda _: httpx.Response(401)))
    api = NimbleClient("secret-test", http_client=client)
    with pytest.raises(NimbleError, match="HTTP 401") as err:
        api.search("example")
    assert "secret-test" not in str(err.value)
    client.close()


def test_extract_rejects_empty_content():
    client = httpx.Client(
        transport=httpx.MockTransport(
            lambda _: httpx.Response(200, json={"status": "success", "data": {"markdown": ""}})
        )
    )
    with pytest.raises(NimbleError, match="no readable Markdown"):
        NimbleClient("dummy", http_client=client).extract("https://example.com/")
    client.close()
