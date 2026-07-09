# /macrohard — Context Handoff

## Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-28 | SEC Whistleblower No. 17684-273-411-436

---

## CRITICAL: Before Starting Any New Session

1. Read `/home/user/RoadMaps/CLAUDE.md` — master context
2. Read `.claude/roadmap/sibling-roadmap.json` — this repo's phase state

---

## What This Repo Is

**MacroHarder™ — the excellent workbook.** (Renamed from MacroHard,
2026-07-08: the MacroHard mark is taken by an xAI filing. GitHub repo
rename to `macroharder` pending — admin action; lane-mcp's estate roster
is config-only and ready for it.)

The one-stop-shop configurable analytics workbook: standard Excel taken
to a third-dimensional level (cells are (col, row, layer); sheets are
volumes), with **every single UI detail user-configurable** and a fully
customizable analytics dashboard.

- Standalone Tauri 2.0 app — **Windows first** (NSIS self-extracting
  .exe installer), then Android, then macOS
- Rust core + C/C++ compute kernels (FFI) + SQLXML for data manipulation
- **Modules via MCP:** a module is an MCP server; procurement and maps
  are the first two dashboard modules (Phase 8). lane-mcp remains a
  standalone gateway MacroHarder can consume as an ordinary MCP client
- Filesystem integrity: BLAKE3 content-hash manifest, verified on boot
- Design token system + audit scoring carry over as the adjustable-UI
  substrate and preset quality gate
- Still the design authority for the sovereign stack (tauri-rustxml)

**Master plan: `.wizardhat/plans/plan-macroharder.md`** — product spec,
full dependency tree, re-scored Phase 6→12 ladder (Firestick is out;
Phase 12 is the Windows ship).

---

## Architecture (Phase 8)

```
macrohard/
  src-tauri/                  — Tauri 2.0 shell (Phase 6)
    Cargo.toml                — macroharder-studio crate; sqlxml-engine dep (live) + reqwest
    src/main.rs               — thin binary entry; calls macroharder_lib::run()
    src/lib.rs                — macroharder_lib crate: design tokens, audit score,
                                 workbook, and module commands; owns Mutex<Workbook> state
    src/workbook.rs            — MH-P8-01: 3D cell model (CellAddress, CellValue, Volume, Workbook)
    src/mcp_client.rs          — MH-P8-02/03: generic MCP JSON-RPC HTTP client
    src/sqlxml_bridge.rs      — sqlxml-engine live wire (put() real; get/query stubbed -- backend doesn't implement those actions yet)
    config/modules.json        — module registry: procurement, maps (endpoints, tools, panels)
    tauri.conf.json           — app identity org.albertlane.macroharder-studio
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

Current: **Phase 8 — Workbook core + first modules (in progress)**

| Phase | Status | Notes |
|-------|--------|-------|
| 5 — Bootstrap | `completed` | design-tokens.json, audit_score.py, CI |
| 6 — Shell + rename prep | `completed` | src-tauri/ shell ✅; sqlxml-engine dep stub ✅; token inspector UI ✅; MacroHarder identity swap ✅ (Cargo package/lib renamed, tauri.conf.json, package.json, UI strings) |
| 7 — sqlxml live wire | `completed` | MH-AB-001 fully resolved -- sqlxml PR #15 merged 2026-07-09, dep re-pinned off the feature branch to main |
| 8 — Workbook core + first modules | `in_progress` | Workbook core (workbook.rs, 9 tests passing) ✅; MCP client + module registry ✅; live procurement/maps calls blocked on those repos' own Phase 7 Worker deploys |
| 9 — Fully adjustable UI | `not_started` | layout schema, token-driven chrome, dashboard composer |
| 10 — MCP module host GA | `not_started` | registry, capability gating, module install UX |
| 11 — AER integration | `not_started` | unchanged from RoadMaps Phase 11 |
| 12 — Windows ship | `not_started` | NSIS self-extracting .exe + integrity manifest (replaces Firestick HD — cancelled) |

Full ladder + dependencies: `.wizardhat/plans/plan-macroharder.md`

---

## Key Files

| File | Purpose |
|------|--------|
| `design-tokens.json` | Canonical design token set |
| `scripts/audit_score.py` | 3D standard weighted scoring (PASS ≥ 0.8 / WARN ≥ 0.6 / FAIL < 0.6) |
| `src-tauri/src/main.rs` | Desktop entry point; delegates to macroharder_lib::run() |
| `src-tauri/src/lib.rs` | Tauri commands: design tokens, audit score, workbook (7 commands), module registry/call (2 commands) |
| `src-tauri/src/workbook.rs` | 3D cell model + grid engine: CellAddress(col,row,layer), CellValue, Volume, Workbook |
| `src-tauri/src/mcp_client.rs` | Generic MCP JSON-RPC HTTP client (initialize/tools list/call/resources read) |
| `src-tauri/config/modules.json` | Module registry: procurement + maps endpoints, tools, dashboard panels |
| `src-tauri/src/sqlxml_bridge.rs` | SQLXML engine bridge — put() live-wired (Phase 7); get/query stubbed pending backend support |
| `src/token-inspector.ts` | Browser-side design token inspector |
| `src/index.html` | Tauri WebView shell |
| `MACROHARD_STUDIO.md` | Full design authority narrative (heritage doc; product name is now MacroHarder™) |
| `Macro_Hard_Planner_3D.html` | 3D planner reference implementation |
| `Macrohard_Excellent.jsx` | Component reference — "excellent workbook" heritage |
| `.wizardhat/plans/plan-macroharder.md` | **MacroHarder master plan** — spec, dependency tree, re-scored ladder |
| `.wizardhat/README.md` | Recursive coalescent orchestration (cadence framework) |

---

## Open Absences

None currently open. MH-AB-001 (sqlxml-engine Cargo dep) resolved
2026-07-09 -- see `superseded.MH-AB-001_sqlxml_engine_dep` in
`sibling-roadmap.json`.

---

## Attribution

Every commit: `Co-authored-by: Claude Sonnet 4.6 <noreply@anthropic.com>`
All IP belongs to Albert Lane per LICENSE.md.
SEC Whistleblower No. 17684-273-411-436
