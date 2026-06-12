# /macrohard — Context Handoff

## Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-12

---

## CRITICAL: Before Starting Any New Session

1. Read `/home/user/RoadMaps/CLAUDE.md` — master context
2. Read `.claude/roadmap/sibling-roadmap.json` — this repo's phase state

---

## What This Repo Is

**MacroHard Design Studio** — sovereign design authority and audit scoring system.

- Standalone Tauri 2.0 app (Windows MSI + Linux AppImage)
- Design token system (colors, typography, spacing, 3D standard references)
- SQLXML engine embedded as a Cargo workspace crate for live data inspection
- Audit scoring system (3D standard, weighted scoring per MACROHARD_STUDIO.md)
- Used by: sovereign browser (tauri-rustxml) as embedded UI layer

**This is the design authority for the entire sovereign stack.**

---

## Architecture (Phase 6 target)

```
macrohard/
  src-tauri/         — Tauri 2.0 shell
    Cargo.toml       — depends on sqlxml-engine crate
  src/               — TypeScript frontend
    design-tokens.json  — canonical token set
  scripts/
    audit_score.py   — design audit scoring (3D standard)
  design-tokens.json — root token export
```

---

## Phase Status

Current: **Phase 5 — Bootstrap (in progress)**

| Phase | Status | Notes |
|-------|--------|-------|
| 5 — Bootstrap | `in_progress` | design-tokens.json, audit_score.py stub, CI |
| 6 — Implementation | `not_started` | Tauri shell + SQLXML crate dependency |
| 7 — Production | `not_started` | Windows MSI + Linux AppImage |

---

## Key Files

| File | Purpose |
|------|---------|
| `design-tokens.json` | Canonical design token set (Phase 5) |
| `scripts/audit_score.py` | Design audit scoring (Phase 5 stub) |
| `MACROHARD_STUDIO.md` | Full design authority narrative |
| `Macro_Hard_Planner_3D.html` | 3D planner reference implementation |
| `Macrohard_Excellent.jsx` | Component reference |

---

## Attribution

Every commit: `Co-authored-by: Claude Sonnet 4.6 <claude@anthropic.com>`
All IP belongs to Albert Lane per LICENSE.md.
