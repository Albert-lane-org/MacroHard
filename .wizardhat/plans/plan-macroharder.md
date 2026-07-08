# PLAN-MACROHARDER — Master Plan & Full Dependency Tree

Authored: Albert Lane | 2026-07-08
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
