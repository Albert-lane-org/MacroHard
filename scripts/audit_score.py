#!/usr/bin/env python3
# Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-21 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
# MacroHard design audit scoring -- validates design-tokens.json against the 5D standard.
"""
MacroHard Audit Score Calculator

MH-P14-04: Updated to the 5D standard.
Scores the design token set:
  - Colors (spatial, 30%): sovereign palette + 3D depth/light refs
  - Typography (financial, 25%): font family, size, weight, line-height
  - Spacing (civic, 20%): numeric scale keys
  - 3D-standard (terrain, 25%): isometric angle, elevation, shadow

5D scoring weights by dimension (for workbook scoring):
  col/row (spatial)   30%
  layer   (depth)     25%
  time    (temporal)  25%
  domain  (cross)     20%

Weighted total produces a score 0.0-1.0. Gate: >=0.8 PASS, >=0.6 WARN, <0.6 FAIL.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

TOKEN_PATH = Path("design-tokens.json")

WEIGHTS = {
    "colors":      0.30,
    "typography":  0.25,
    "spacing":     0.20,
    "3d-standard": 0.25,
}

# MH-P14-04: 5D dimension weights for workbook-based audit scoring
WEIGHTS_5D = {
    "spatial":   0.30,  # col + row
    "depth":     0.25,  # layer
    "temporal":  0.25,  # time
    "cross":     0.20,  # domain
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


def score_5d(workbook: dict[str, Any]) -> dict[str, Any]:
    """MH-P14-04: Score a 5D workbook dict against the sovereign 5D standard.

    ``workbook`` must contain:
      ``cells``: list of dicts with keys col, row, layer, time, domain, value
      ``name`` (optional): volume name

    Returns AuditScore: {total, percent, scores, weights, status}
    where status is "PASS" (>=0.8), "WARN" (>=0.6), or "FAIL" (<0.6).
    """
    cells: list[dict[str, Any]] = workbook.get("cells", [])
    if not cells:
        return {"total": 0.0, "percent": 0.0, "scores": {}, "weights": WEIGHTS_5D, "status": "FAIL", "error": "no cells"}

    n = len(cells)
    max_col = max(c.get("col", 0) for c in cells)
    max_row = max(c.get("row", 0) for c in cells)
    max_layer = max(c.get("layer", 0) for c in cells)
    max_time = max(c.get("time", 0) for c in cells)
    domains_used = len({c.get("domain", 0) for c in cells})

    # Spatial score: cells spread across col/row relative to a 100x100 reference grid
    spatial_coverage = min(1.0, (max_col + 1) / 10.0) * 0.5 + min(1.0, (max_row + 1) / 10.0) * 0.5

    # Depth score: any use of layers beyond 0 scores full; 0 layers = min score
    depth_score = min(1.0, (max_layer + 1) / 3.0)

    # Temporal score: any use of time dimension beyond 0
    temporal_score = min(1.0, (max_time + 1) / 3.0)

    # Cross-domain score: using multiple domains
    cross_score = min(1.0, domains_used / 3.0)

    subscores = {
        "spatial":  round(spatial_coverage, 4),
        "depth":    round(depth_score, 4),
        "temporal": round(temporal_score, 4),
        "cross":    round(cross_score, 4),
    }

    total = sum(subscores[k] * WEIGHTS_5D[k] for k in subscores)

    return {
        "total":   round(total, 4),
        "percent": round(total * 100, 1),
        "scores":  subscores,
        "weights": WEIGHTS_5D,
        "cell_count": n,
        "status":  "PASS" if total >= 0.8 else "WARN" if total >= 0.6 else "FAIL",
    }


def compute_score(token_path: Path = TOKEN_PATH) -> dict[str, Any]:
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
