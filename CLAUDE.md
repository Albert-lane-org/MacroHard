# /macrohard — Context Handoff

## Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-28 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use

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
                                 workbook, layout, and module commands; owns Mutex state
    src/workbook.rs            — MH-P8-01: 3D cell model (CellAddress, CellValue, Volume, Workbook)
    src/layout.rs              — MH-P9-01: DashboardLayout/PanelPlacement grid schema, JSON-persisted
    src/mcp_client.rs          — MH-P8-02/03: generic MCP JSON-RPC HTTP client
    src/registry.rs            — MH-P10-01: ModuleRegistry — install/uninstall + capability-gated tool dispatch
    src/sqlxml_bridge.rs      — sqlxml-engine live wire (put() real; get/query stubbed -- backend doesn't implement those actions yet)
    config/modules.json        — module registry: procurement, maps (endpoints, tools, panels, capability)
    tauri.conf.json           — app identity org.albertlane.macroharder-studio
    capabilities/default.json — core permission set
  src/
    index.html                — Tauri WebView entry; sovereign dark theme; Dashboard/Tokens tabs
    chrome.ts                 — MH-P9-02: applies design-tokens.json onto chrome CSS custom properties
    dashboard-composer.ts     — MH-P9-03: layout-driven panel grid (add/remove/move/resize/hide)
    token-inspector.ts        — design token inspector UI (MH-P6-03)
    index.ts                  — DesignToken types + loadTokens()
    worker.ts                 — Cloudflare Worker API (separate deploy target)
  tsconfig.json                — Worker-side TS (no DOM lib)
  tsconfig.frontend.json       — WebView-side TS (chrome.ts, dashboard-composer.ts, token-inspector.ts; DOM lib)
  scripts/
    audit_score.py            — design audit scoring (3D standard, PASS/WARN/FAIL)
  design-tokens.json          — root token export (canonical)
```

---

## Phase Status

Current: **Phase 10 — MCP module host GA (in progress)**

| Phase | Status | Notes |
|-------|--------|-------|
| 5 — Bootstrap | `completed` | design-tokens.json, audit_score.py, CI |
| 6 — Shell + rename prep | `completed` | src-tauri/ shell ✅; sqlxml-engine dep stub ✅; token inspector UI ✅; MacroHarder identity swap ✅ (Cargo package/lib renamed, tauri.conf.json, package.json, UI strings) |
| 7 — sqlxml live wire | `completed` | MH-AB-001 fully resolved -- sqlxml PR #15 merged 2026-07-09, dep re-pinned off the feature branch to main |
| 8 — Workbook core + first modules | `completed` | Workbook core (workbook.rs, 9 tests passing) ✅; MCP client + module registry ✅; code-complete `module_call_tool` path for procurement/maps ✅. procurement-db/maps-cache D1 + document-archive/map-tiles R2 provisioned and migrated 2026-07-09 -- `modules.json` still correctly reports `code_ready_deploy_blocked` since `wrangler deploy` itself needs a CLOUDFLARE_API_TOKEN this session doesn't have; calls will start returning real data the moment those two Workers go live, no MacroHarder-side code changes needed |
| 9 — Fully adjustable UI | `completed` | `layout.rs`: DashboardLayout/PanelPlacement grid schema + add/remove/move/resize/visibility/z-order, JSON-persisted, 14/14 unit tests passing ✅. 7 `layout_*` Tauri commands ✅. `chrome.ts`: chrome CSS custom properties now read live from design-tokens.json instead of being hardcoded in index.html ✅. `dashboard-composer.ts`: renders the layout as a CSS grid, add-panel control, drag-to-move (pointer events), resize/hide/remove/bring-to-front controls ✅. Split `tsconfig.json` (Worker, no DOM) from `tsconfig.frontend.json` (WebView, DOM lib) so the frontend actually typechecks in CI -- both pass clean. **Not runtime-tested**: no GTK/WebKit system libs in this sandbox, so the Tauri app cannot actually launch here |
| 10 — MCP module host GA | `in_progress` | `registry.rs`: ModuleRegistry replaces the ad-hoc file-read in `module_list`/`module_call_tool` -- `authorize_tool_call()` rejects any tool a module doesn't declare in its manifest, and rejects write-shaped tool names on `read_only` modules (name-heuristic defense in depth; the module's own `capability` field is the primary gate), 12/12 unit tests passing ✅. `module_install`/`module_uninstall` commands + validation (non-empty name/endpoint/tools, no duplicate name) ✅. `config/modules.json` gained `capability`/`source` fields on both built-in modules ✅. Composer UI: "Install module…" control (paste-manifest flow) ✅. **Not runtime-tested** — same GTK/WebKit limitation as Phase 9 |
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
| `src-tauri/src/lib.rs` | Tauri commands: design tokens, audit score, workbook (7), layout (7), module registry/install (4) |
| `src-tauri/src/workbook.rs` | 3D cell model + grid engine: CellAddress(col,row,layer), CellValue, Volume, Workbook |
| `src-tauri/src/layout.rs` | Dashboard grid schema: DashboardLayout, PanelPlacement, add/remove/move/resize/visibility/z-order, JSON persistence |
| `src-tauri/src/mcp_client.rs` | Generic MCP JSON-RPC HTTP client (initialize/tools list/call/resources read) |
| `src-tauri/src/registry.rs` | ModuleRegistry: install/uninstall, `authorize_tool_call()` capability gating |
| `src-tauri/config/modules.json` | Module registry: procurement + maps endpoints, tools, dashboard panels, capability |
| `src-tauri/src/sqlxml_bridge.rs` | SQLXML engine bridge — put() live-wired (Phase 7); get/query stubbed pending backend support |
| `src/chrome.ts` | Applies design-tokens.json onto chrome CSS custom properties at runtime |
| `src/dashboard-composer.ts` | Layout-driven panel grid: add/remove/move/resize/hide panels, install modules |
| `src/token-inspector.ts` | Browser-side design token inspector |
| `src/index.html` | Tauri WebView shell — Dashboard/Design Tokens tabs |
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
