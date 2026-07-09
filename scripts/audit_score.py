#!/usr/bin/env python3
# Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-14 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
# MacroHard design audit scoring -- validates design-tokens.json against the 3D standard.
"""
MacroHard Audit Score Calculator

Scores the design token set against the MacroHard 3D standard:
  - Colors: sovereign palette + 3D depth/light refs
  - Typography: font family, size, weight, line-height
  - Spacing: numeric scale keys
  - 3D-standard: isometric angle, elevation, shadow

Weighted total produces a score 0.0-1.0. Gate: >=0.8 PASS, >=0.6 WARN, <0.6 FAIL.
Phase 6: full implementation with visual inspection and component audit.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

TOKEN_PATH = Path("design-tokens.json")

WEIGHTS = {
    "colors":      0.30,
    "typography":  0.25,
    "spacing":     0.20,
    "3d-standard": 0.25,
}


def score_colors(tokens: dict) -> float:
    colors = tokens.get("colors", {})
    sovereign = colors.get("sovereign", {})
    std_3d = colors.get("3d-standard", {})
    required_sovereign = ["primary", "secondary", "accent", "text", "surface"]
    required_3d = ["depth-0", "depth-1", "light-top", "shadow"]
    s = sum(1 for k in required_sovereign if k in sovereign) / len(required_sovereign)
    d = sum(1 for k in required_3d if k in std_3d) / len(required_3d)
    return (s + d) / 2


def score_typography(tokens: dict) -> float:
    typo = tokens.get("typography", {})
    required = ["font-family", "font-size", "font-weight", "line-height"]
    return sum(1 for k in required if k in typo) / len(required)


def score_spacing(tokens: dict) -> float:
    spacing = tokens.get("spacing", {})
    required_keys = ["1", "2", "4", "8", "16"]
    return sum(1 for k in required_keys if k in spacing) / len(required_keys)


def score_3d_standard(tokens: dict) -> float:
    std = tokens.get("3d-standard", {})
    required = ["isometric-angle-x", "isometric-angle-y", "elevation-scale", "shadow-offset-x"]
    return sum(1 for k in required if k in std) / len(required)


def compute_score(token_path: Path = TOKEN_PATH) -> dict:
    if not token_path.exists():
        return {"total": 0.0, "error": "design-tokens.json not found"}

    tokens = json.loads(token_path.read_text())

    scores = {
        "colors":      score_colors(tokens),
        "typography":  score_typography(tokens),
        "spacing":     score_spacing(tokens),
        "3d-standard": score_3d_standard(tokens),
    }

    total = sum(scores[k] * WEIGHTS[k] for k in scores)

    return {
        "total":   round(total, 4),
        "percent": round(total * 100, 1),
        "scores":  {k: round(v, 4) for k, v in scores.items()},
        "weights": WEIGHTS,
        "status":  "PASS" if total >= 0.8 else "WARN" if total >= 0.6 else "FAIL",
    }


if __name__ == "__main__":
    result = compute_score()
    print(json.dumps(result, indent=2))
    if result.get("status") == "FAIL":
        sys.exit(1)
