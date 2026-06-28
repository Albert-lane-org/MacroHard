# /macrohard — Context Handoff

## Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-28

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

## Architecture (Phase 6)

```
macrohard/
  src-tauri/                  — Tauri 2.0 shell (Phase 6)
    Cargo.toml                — macrohard-studio crate; sqlxml-engine dep (Phase 7)
    src/main.rs               — get_design_tokens + run_audit_score commands
    src/sqlxml_bridge.rs      — sqlxml-engine stub (Phase 7 live wire)
    tauri.conf.json           — app identity org.albertlane.macrohard-studio
    capabilities/default.json — core permission set
  src/
    index.html                — Tauri WebView entry; sovereign dark theme
    token-inspector.ts        — design token inspector UI (MH-P6-03)
    index.ts                  — DesignToken types + loadTokens()
    worker.ts                 — Cloudflare Worker API (separate deploy target)
  scripts/
    audit_score.py            — design audit scoring (3D standard, PASS/WARN/FAIL)
  design-tokens.json          — root token export (canonical)
```

---

## Phase Status

Current: **Phase 6 — Tauri Shell (in progress)**

| Phase | Status | Notes |
|-------|--------|-------|
| 5 — Bootstrap | `completed` | design-tokens.json, audit_score.py, CI |
| 6 — Implementation | `in_progress` | src-tauri/ shell ✅; sqlxml-engine dep stub ✅; token inspector UI ✅ |
| 7 — Production | `not_started` | Windows MSI + Linux AppImage; sqlxml-engine live wire |

---

## Key Files

| File | Purpose |
|------|--------|
| `design-tokens.json` | Canonical design token set |
| `scripts/audit_score.py` | 3D standard weighted scoring (PASS ≥ 0.8 / WARN ≥ 0.6 / FAIL < 0.6) |
| `src-tauri/src/main.rs` | Tauri commands: get_design_tokens, run_audit_score |
| `src-tauri/src/sqlxml_bridge.rs` | SQLXML engine bridge stub (Phase 7) |
| `src/token-inspector.ts` | Browser-side design token inspector |
| `src/index.html` | Tauri WebView shell |
| `MACROHARD_STUDIO.md` | Full design authority narrative |
| `Macro_Hard_Planner_3D.html` | 3D planner reference implementation |
| `Macrohard_Excellent.jsx` | Component reference |

---

## Open Absences

| ID | Description | Phase |
|----|-------------|-------|
| MH-AB-001 | sqlxml-engine Cargo dep: activate when sqlxml backend-agent is restructured as a library crate | 7 |

---

## Attribution

Every commit: `Co-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>`
All IP belongs to Albert Lane per LICENSE.md.
SEC Whistleblower No. 17684-273-411-436
