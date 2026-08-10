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

## 6a. Grokllama Studios Presents MacroHarder™ — planned dual-system module (owner decision 2026-08-09, revised/renamed 2026-08-10)

**Renamed 2026-08-10** from "Grokllama Studio Presents" to **"Grokllama
Studios Presents MacroHarder™"** — owner instruction, explicit dual-system
framing: **Grokllama Studios** is the front-of-house AI app-builder product
(Android client, Model Gateway, Builder Engine — everything below); the
name says out loud that it runs on **MacroHarder™** as its workbook/module
backend, the same MCP-module pattern already live for `procurement`,
`maps`, `government`, and `procurement_engine` (§4, "Modules via MCP").
Full brand/design direction (naming rationale, model roster, "Coke
Studio"-inspired visual language and why it's built trademark-safe, the
"Sessions" content pillar, South Asian music-culture integration point) is
in `grokllama/BRAND.md`; a first-pass token set implementing that
direction is in `grokllama/design-tokens.json` (sibling theme to the
canonical `/design-tokens.json` sovereign palette — MacroHarder's own
chrome is unaffected). Read both before touching anything under
`grokllama/`.

**What the uploaded material actually is, stated plainly (unchanged
finding, now against the actual page content instead of a paraphrase):**
the manifest is 10 numbered "Steps," each a table of category → title
lists — e.g. Step 1 lists "Rust Runtime Dependency Manifest v1.0," "Model
Gateway Service Source Tree v1.0," "JWT Key Management Specification
v1.0" as row entries, not attachments. Confirmed by reading all 10 pages
directly (2026-08-10): every page follows the same shape — Dependencies /
Security Files / Source Code / Supporting Docs / Scripts / Workers /
Workflows, each a list of *titles*. None of the zips, source trees,
scripts, or workers they name are included or accessible in this estate —
there is no code to import, port, or wire up yet. This section records
what the manifest describes and how it maps onto MacroHarder's existing
module architecture once it exists as real, buildable source; it is not a
claim that any of it has been built.

**The 10 steps, mapped (source: the actual manifest pages, read in full
2026-08-10):**

| Step | Title | Covers |
|---|---|---|
| 1 | Code Posture & System Overview | Rust/Android/Node/vLLM/Grok/Postgres+Redis/observability dependency manifests; JWT/TLS/env/audit/canary/CRC-32 security docs; the 8 backend service source trees; Lane-VM host/guest source; proprietary license file |
| 2 | System Architecture Overview | Service mesh + mTLS, cross-service RPC (protobuf), zero-trust gateway boundary, global architecture blueprint |
| 3 | Android Application Structure | Jetpack/Compose + Coroutines, OkHttp SSE/WebSocket, Keystore/biometric auth, TLS pinning; app/core-network/core-design/playground/builder/projects/settings module source trees; Lane-VM Android protobuf client |
| 4 | Backend API Surface | Axum/Actix-Web, OpenAPI 3.1, JWT verification + authz matrix; `/v1/auth`, `/v1/billing`, `/v1/projects`, `/v1/playground`, `/v1/builder`, `/v1/deploy`, `/v1/inspector` endpoint trees |
| 5 | Model Gateway Specification | vLLM/Ollama local adapter + Grok Build API adapter, unified request/response schema mapper, token accounting/metering, streaming normalizer, **"Local Open-Source Model Priority & Filtering Policy"** (the natural slot DeepSeek drops into, GRK-P2) |
| 6 | Builder Engine & Lane-VM Execution | Spec ingestion/schema parser, Grok+Llama code synthesis adapter, virtual file tree + patch/diff engine, local WebView preview sandbox, **Lane-VM host kernel (`host_main.cpp`) + Python guest (`guest_lib.py`) + `lane_compiler.py`** — the ISA lineage reconciled against lane-mcp's Phase 15 `lanevm` precedent, see BRAND.md §5 |
| 7 | Deployment Runtime & Ephemeral Provisioning | Docker/OCI + Kubernetes/Helm, Nginx ingress + cert-manager, ephemeral preview subdomains, seccomp isolation, Prometheus/Vector telemetry |
| 8 | Data, Logging, and Evaluation | Run logging/telemetry ingestion, autorater evaluation + rubric scoring, PII anonymization, project analytics — **this is the panel that feeds MacroHarder's dashboard, reframed as "Sessions" per BRAND.md §4** |
| 9 | Billing and Subscription Integration | Google Play Billing + Stripe, entitlement enforcement middleware, per-user/per-project usage limits |
| 10 | Security, Compliance, and IP Controls | Audit logging + chain-of-custody, canary tokens, key rotation, compliance evidence export, IP posture alignment doc |

**Model roster:** Grok Build (open source) and Llama (open source) per the
manifest's own Model Gateway (Step 5). **DeepSeek** — open-weight, not in
the original manifest — is a planned addition into that same adapter
pattern, tracked as **GRK-P2** below.

**Planned integration shape (future phase, not started):**

| MacroHarder side | Grokllama Studios side | Notes |
|---|---|---|
| New `config/modules.json` entry: `"grokllama_studio"` | Model Gateway's `/v1/*` REST/WebSocket API (Step 4/5) | Same `ModuleRegistry`/`authorize_tool_call()` capability-gating pattern already live (§10, `registry.rs`) — no new trust model needed |
| Dashboard panel: **Sessions** (not "Run History" — see BRAND.md §4) | Run Logging & Telemetry Ingestion Engine (Step 8) | Feeds the workbook's analytics dashboard the same way procurement/maps panels do today |
| `cache.rs` (`McpCache`, Phase 14) | Model Gateway tool-call results | Same TTL/stale-serving pattern already built for the other modules |
| `grokllama/design-tokens.json` (this session) | Android client + Builder Engine WebView preview chrome | Brand/visual layer only — no functional dependency; can be swapped without touching the integration above |

**What this is not:** this is not a claim that MacroHarder now talks to
Grokllama Studios, that a `grokllama_studio` module exists in
`config/modules.json` yet, that any of the Lane-VM/pybind11/Android/
billing source described in the manifest has been built, ported, or
verified in this estate, or that the brand direction in `grokllama/` is
more than a documented intention for whenever real source lands. A real
integration is a separate, substantial build (a whole second product's
backend, standing up its own infrastructure) gated on that source
actually existing and being provided to a session that can read and test
it — tracked as two named future phases:

- **GRK-P1** (reserved) — the platform build-out itself, once real source
  for any of the 10 steps above is provided.
- **GRK-P2** (reserved) — DeepSeek added to the Model Gateway's adapter
  roster alongside Grok Build and Llama, gated on GRK-P1's Model Gateway
  (Step 5) existing first.

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
