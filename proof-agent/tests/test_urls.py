import pytest

from proof_agent.urls import public_url


@pytest.mark.parametrize(
    "url",
    [
        "http://localhost/admin",
        "http://127.0.0.1:80/secret",
        "http://169.254.169.254/latest/meta-data/",
        "http://10.0.0.1/",
        "http://[::1]/",
        "http://intranet.internal/",
        "http://a.local/",
        "file:///etc/passwd",
        "https://example.com:8080/",
        "https://user:password@example.com/",
        "javascript:alert(1)",
        "http://0x7f000001/",
    ],
)
def test_unsafe_url_rejected(url):
    assert public_url(url) is None


def test_normalizes_url_and_removes_fragment():
    assert public_url("HTTPS://Docs.Python.Org/3.13/#changelog") == "https://docs.python.org/3.13/"


def test_normalizes_root():
    assert public_url("https://python.org") == "https://python.org/"
