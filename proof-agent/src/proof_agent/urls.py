"""Conservative URL validation for outbound Nimble extraction requests."""

from __future__ import annotations

import ipaddress
from urllib.parse import urlsplit, urlunsplit


BLOCKED_SUFFIXES = (".localhost", ".local", ".internal", ".test", ".invalid", ".onion")


def public_url(value: str) -> str | None:
    """Return a normalized public HTTP(S) URL, or None for unsafe/invalid targets.

    This prevents direct private-IP and hostname targets. It is not a replacement
    for network-level SSRF controls or checking DNS/redirect destinations.
    """
    try:
        parts = urlsplit(value.strip())
        if parts.scheme.lower() not in {"https", "http"} or not parts.hostname:
            return None
        if parts.username or parts.password or parts.port not in (None, 80, 443):
            return None
        host = parts.hostname.rstrip(".").lower()
        if host in {"localhost", "0", "0.0.0.0"} or host.endswith(BLOCKED_SUFFIXES):
            return None
        if "." not in host:
            return None
        try:
            ipaddress.ip_address(host)
        except ValueError:
            # Reject integer-like, malformed and encoded-IP-style hostnames.
            if any(c in host for c in ("%", "\\", " ")):
                return None
        else:
            # Do not extract literal IP addresses, even public ones.
            return None
        return urlunsplit(
            (parts.scheme.lower(), parts.netloc.lower(), parts.path or "/", parts.query, "")
        )
    except (ValueError, AttributeError):
        return None
