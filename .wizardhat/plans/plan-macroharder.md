# PLAN-MACROHARDER — Master Plan & Full Dependency Tree

Authored: Albert Lane | 2026-07-08 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
Supersedes the Phase-12 Firestick HD ladder in `plan-a.md`.

---

## 1. The Pivot

**MacroHard → MacroHarder™.** The MacroHard mark is off the table (xAI /
Elon Musk trademark filing), so the product ships as **MacroHarder**. The
FireStick deployment plan is **out**. The new deliverable:

> **MacroHarder** — the one-stop-shop configurable **excellent workbook**:
> standard Excel taken to a third-dimensional level, with every single
> detail user-configurable, and an analytics dashboard that is fully
> customizable end to end.

Rename mechanics (in dependency order):

1. GitHub repo rename `albert-lane-org/macrohard` → `macroharder`
   (admin action; GitHub auto-redirects old clones).
2. lane-mcp estate roster: one-line edit in `config/estate.json`
   (already externalized — no code change; done 2026-07-08).
3. In-repo identity: `tauri.conf.json` product name + bundle identifier
   `org.albertlane.macroharder-studio`, `package.json`, doc headers.
4. Trademark hygiene: keep `MACROHARD_STUDIO.md` heritage docs, add
   MacroHarder™ naming note; no binary ships under the old mark.

## 2. Product Spec — the Excellent Workbook

- **Workbook core:** grid engine with a third axis — sheets are volumes,
  not pages. Cell = (col, row, layer). 2D projection for the classic
  view; isometric 3D render for the volume view (heritage:
  `Macro_Hard_Planner_3D.html`, `Macrohard_Excellent.jsx`).
- **Fully adjustable UI:** every visual detail is data-driven — design
  tokens (`design-tokens.json` lineage) for color/type/spacing/3D
  standard, plus a layout schema for panels, toolbars, keybinds, and
  chart surfaces. No hardcoded chrome. The audit scorer
  (`scripts/audit_score.py`) gates any bundled preset.
- **Modules via MCP:** a module IS an MCP server. MacroHarder embeds an
  MCP client host; installing a module = registering a server in the
  module registry (stdio for local, HTTP/SSE for remote). Modules
  contribute data sources, workbook functions, and dashboard panels.
  First-party modules at launch: **procurement** and **maps** (their
  Cloudflare Workers already speak MCP — Phase 8 build-out below).
  lane-mcp is one *optional* upstream among many and stays standalone.
- **Analytics dashboard:** the one-stop shop — dashboards are workbook
  views wired to module data, fully customizable via the same token +
  layout schema. No second rendering system.
- **Filesystem integrity:** app-owned data directory with a BLAKE3
  content-hash manifest (ip-forensics fingerprint lineage); verify on
  boot, refuse tampered module registries; SQLXML store journaled with
  archive snapshots.

## 3. Architecture & Stack

```
MacroHarder desktop (Tauri 2.0 shell — src-tauri/, exists today)
  ├─ Rust core: workbook engine, module host, integrity manifest
  │    ├─ C/C++ compute kernels via FFI (cc/cxx): 3D mesh transforms,
  │    │   large-grid recalc, kriging/interp hot paths
  │    └─ SQLXML engine (sqlxml repo as Cargo lib crate — MH-AB-001)
  │         └─ SQLite embedded (device) / D1 (cloud sync, later)
  ├─ MCP module host (Rust MCP SDK): stdio + HTTP/SSE clients,
  │    module registry JSON, capability gating per module
  └─ WebView UI (TypeScript): token-driven adjustable chrome,
       2D grid + isometric 3D volume renderer, dashboard composer
```

## 4. Full Dependency Tree

**Rust core**
| Dependency | Purpose | Status |
|---|---|---|
| `tauri` 2.x + `wry`/`tao` | app shell, WebView, IPC | in repo (src-tauri/) |
| Rust MCP SDK (`rmcp`) | MCP client host for modules | add |
| `sqlxml-engine` (git dep → `albert-lane-org/sqlxml`) | XML-native data manipulation | **blocked: MH-AB-001** — sqlxml backend-agent must restructure as a library crate |
| `rusqlite`/`sqlx` | embedded store under SQLXML | add |
| `quick-xml`, `serde`, `tokio` | parsing, types, async | ecosystem standard |
| `blake3` | filesystem integrity manifest | add |
| `cc` / `cxx` (+ CMake on CI) | C/C++ kernel FFI | add |

**UI**
| Dependency | Purpose | Status |
|---|---|---|
| TypeScript + esbuild/vite | WebView bundle | package.json exists |
| `design-tokens.json` + layout schema | fully adjustable UI | tokens exist; layout schema is new |
| token inspector (`src/token-inspector.ts`) | live UI adjustment surface | exists, extend |

**Packaging / CI**
| Dependency | Purpose | Status |
|---|---|---|
| Tauri bundler, **NSIS target** | Windows **self-extracting .exe installer** (self-unzip + install) | add to tauri.conf.json |
| WiX (MSI) | optional enterprise MSI alongside NSIS | optional |
| WebView2 bootstrapper | embedded in installer for clean Windows installs | NSIS-embedded |
| `windows-latest` GH runner | Windows build lane | add workflow |
| Code signing cert | installer trust | Phase-12 gate, acquire |
| Tauri 2 mobile (Android) | second target | after Windows ship |
| macOS bundle + notarization | third target | after Android |

**Sibling-repo dependencies**
| Repo | Provides | Needed by |
|---|---|---|
| `sqlxml` | library crate (MH-AB-001) | workbook persistence |
| `procurement` | MCP module: permits/contracts/EV ledger data | dashboard module #1 (Phase 8) |
| `maps` | MCP module: derived terrain + 3D isometric tiles | dashboard module #2 (Phase 8) — the third-dimension showcase |
| `lane-mcp` | optional upstream gateway (standalone; client-only integration) | power users |
| `roadmaps` | phase governance | trajectory |

## 5. Re-scored Ladder (replaces Firestick Phase 12)

| Phase | Deliverable | Notes |
|---|---|---|
| 6 (now) | Tauri shell + rename prep | MH-P6-02 sqlxml dep stub; MacroHarder identity swap |
| 7 | sqlxml-engine live wire | unblock MH-AB-001; persistence real |
| **8** | **Workbook core + first modules** | 3D cell model, grid engine; **procurement + maps Phase 8 MCP modules feed the dashboard** |
| 9 | Fully adjustable UI | layout schema, token-driven chrome, dashboard composer |
| 10 | MCP module host GA | registry, capability gating, module install UX |
| 11 | AER integration | unchanged from RoadMaps Phase 11 |
| **12** | **Windows ship** | NSIS self-extracting .exe, integrity manifest on boot, signed release — *replaces Firestick HD* |
| 13+ | Android, then macOS | Tauri 2 mobile; notarized mac bundle |

## 6a. Grokllama Studio Presents — planned dashboard module (owner decision, 2026-08-09)

Owner instruction 2026-08-09: **Grokllama Studio Presents** is designated
a future **MacroHarder interface** — i.e. it plugs into the workbook as an
MCP module, the same pattern as `procurement`, `maps`, `government`, and
`procurement_engine` (§4, "Modules via MCP").

**What the uploaded material actually is, stated plainly:** the "Grokllama
Studio Presents" packages (Phase 1–10 "canonical zip" manifests) are
*document title indexes* — each phase lists filenames like "Model Gateway
Service Source Tree v1.0" or "Builder Engine Service Source Tree v1.0" as
table entries. None of the zips, source trees, scripts, or workers they
name are included or accessible in this session — there is no code to
import, port, or wire up yet. Recording it here as a real, working
MacroHarder module today would misrepresent a table of contents as a
delivered integration. This section instead records what Grokllama Studio
*is* (per its own manifest) and how it maps onto MacroHarder's existing
module architecture once it exists as real, buildable source.

**What Grokllama Studio Presents describes itself as:** a standalone AI
app-builder platform — Android client + Rust backend, a Model Gateway
routing between hosted Grok and local Llama/vLLM inference, a Builder
Engine that generates and previews applications from a spec (including a
Lane-VM/pybind11 sandboxed execution path — the same LaneVM ISA lineage
lane-mcp's Phase 15 `lanevm` module already implements natively in
TypeScript, see lane-mcp's `packages/modules/lanevm/`), a Deployment
Runtime that provisions ephemeral preview containers, and billing/
entitlement/security-compliance layers. It is its own product, not part of
this estate's existing repos.

**Planned integration shape (future phase, not started):**

| MacroHarder side | Grokllama Studio side | Notes |
|---|---|---|
| New `config/modules.json` entry: `"grokllama_studio"` | Model Gateway's `/v1/*` REST/WebSocket API | Same `ModuleRegistry`/`authorize_tool_call()` capability-gating pattern already live (§10, `registry.rs`) — no new trust model needed |
| Dashboard panel: AI build/inference activity | Run Logging & Telemetry Ingestion Engine (Phase 8 of the Grokllama manifest) | Feeds the workbook's analytics dashboard the same way procurement/maps panels do today |
| `cache.rs` (`McpCache`, Phase 14) | Model Gateway tool-call results | Same TTL/stale-serving pattern already built for the other modules |

**What this is not:** this is not a claim that MacroHarder now talks to
Grokllama Studio, that a `grokllama_studio` module exists in
`config/modules.json` yet, or that any of the Lane-VM/pybind11/Android/
billing source described in the manifest has been built, ported, or
verified in this estate. A real integration is a separate, substantial
build (a whole second product's backend, standing up its own
infrastructure) gated on that source actually existing and being provided
to a session that can read and test it — tracked here as a named future
phase (**GRK-P1**, reserved) rather than left undocumented.

## 6. Reconciliation Record (2026-07-08)

- **Branch sweep (MacroHard, lane-mcp, Procurement, maps):** every branch
  is fully merged or superseded by main. `feat/ledger-query` (1 ahead) is
  obsolete — main carries a 185-line-newer `ledger_query.py` and the
  workflow; `claude/audit-malicious-deployments-omgep2` (1 ahead) is
  redundant — its setup-node v4.4.0 pin already landed on main. Nothing
  passed the "current" bar, so nothing was folded; both are safe to
  delete at the owner's discretion. keen-newton / laughing-wozniak are
  0-ahead in all repos.
- **Security sniff finding:** `.github/workflows/ledger-sync.yml` (on
  main) pushes directly to `main` using the `_ROADMAPS` PAT embedded in
  the git remote URL (persisted in the runner's `.git/config`). Works,
  but bypasses branch protection and widens token exposure — queue a
  hardening pass (deploy key or fine-grained token + PR-based sync).
- **lane-mcp:** standalone boundary enforced — estate roster
  externalized to `config/estate.json`; `lane_macrohard_score`
  (MHARD-003) relocated to MacroHarder's own MCP surface. lane-mcp
  carries no project-specific code.
