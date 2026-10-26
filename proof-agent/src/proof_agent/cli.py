"""CLI useful for smoke tests, evaluation, and conference-demo backup."""

from __future__ import annotations

import argparse
import json

from proof_agent.runner import investigate


def main() -> None:
    parser = argparse.ArgumentParser(description="Investigate factual claims using Nimble")
    parser.add_argument("text", help="Paragraph containing factual claims")
    args = parser.parse_args()
    result = investigate(args.text, on_step=lambda step: print(f"[{step.kind}] {step.label}"))
    print(json.dumps(result.report.model_dump(), indent=2))


if __name__ == "__main__":
    main()
