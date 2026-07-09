# MacroHard Design Studio — Sovereign Desktop Architecture
**Authored: Albert Lane | Architected: Claude Sonnet 4.6 | 2026-06-11** | SEC Whistleblower No. 17684-273-411-436
**CORPORATE USE PROHIBITED without in-person written & verbal consent from Albert Lane.**

---

## Vision

MacroHard is not a spreadsheet. It is not a diagramming tool. It is not Excel.

It is the **sovereign canvas** — a modular, infinite-scope desktop application where every
object on the canvas is alive. Click any element: inspect it, reshape it, reconfigure it,
extend it, in real time, while the application is running. No restart. No rebuild. No export.

The canvas is the computer. The canvas is the city. The canvas is the plan.

Primary target: **Windows** (MSI installer, offline-first).
Secondary target: **Android** (APK, full parity with Windows except keyboard-centric workflows).

Stack:
- **Shell:** Tauri 2.0 (Rust host process, native window management)
- **Frontend:** Vanilla TypeScript (no React overhead in the core canvas engine)
- **Backend:** RustXML / SQLXML engine (sovereign XML intelligence pipeline)
- **Scaffolding:** PowerShell (Windows install, workspace generator, plugin scaffold)
- **Storage:** SQLite (local, offline) + optional SQLXML sync to lane-mcp gateway
- **Design System:** MacroHard token system (IBM Plex Mono, `#FF9F1C` accent, `#0B0C10` bg)

---

## Source Documents (Phase 0 Starting Points)

| File | Purpose |
|------|---------|
| `Macro_Hard_Planner_3D.html` | Sovereign 3D canvas planner — HTML5, zero deps, 4 graph modes |
| `Macrohard_Excellent.jsx` | Full React component — CSV parser, Excel formula engine, NMG graph, financial schematics, fraud planner, anticipatory earnings model |

These are not prototypes. They are **specification artifacts** — the feature vocabulary
and visual grammar that MacroHard Studio must absorb and exceed.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MacroHard Design Studio                           │
│                                                                      │
│  TAURI SHELL (Rust)                                                  │
│  ├── Window management (native Win32 / Android ANativeWindow)       │
│  ├── IPC bridge (JSON-RPC 2.0 to Axum backend)                     │
│  ├── File system access (read/write .mhd project files)             │
│  └── PowerShell integration (scaffold generator, plugin install)    │
│                                                                      │
│  NEXUSCORE BACKEND (Rust, Axum)                                      │
│  ├── macrohard.canvas.*   — object graph, spatial index, undo       │
│  ├── macrohard.inspector.* — real-time property editing             │
│  ├── macrohard.formula.*  — formula engine (RustXML-backed)         │
│  ├── macrohard.module.*   — module loader / hot-swap registry       │
│  ├── macrohard.sqlxml.*   — SQLXML sync (lane-mcp gateway)          │
│  ├── macrohard.export.*   — SVG / PNG / PDF / JSON / CSV export     │
│  └── macrohard.scaffold.* — PowerShell scaffold generator           │
│                                                                      │
│  CANVAS ENGINE (TypeScript, sovereign — no React in hot path)       │
│  ├── InfiniteCanvas       — GPU-accelerated via WebGL/Canvas2D      │
│  ├── ObjectRegistry       — every object type, fully extensible     │
│  ├── SelectionManager     — click / box / lasso / path selection    │
│  ├── InspectorBus         — popup inspector wired to every object   │
│  ├── FormulaBar           — Excel-style formula input               │
│  ├── LayerPanel           — z-order, visibility, lock               │
│  ├── ModuleBar            — loadable module tiles (ribbon)          │
│  └── 3DViewport           — embedded 3D planner (from source doc)  │
│                                                                      │
│  MODULE SYSTEM (TypeScript plugins, hot-loaded at runtime)           │
│  ├── mod-spreadsheet      — CSV import, formula cells, pivot        │
│  ├── mod-graph            — NMG graph visualization                 │
│  ├── mod-3d-planner       — 3D manifold / sphere / grid canvas      │
│  ├── mod-financials       — SEC schematics, anticipatory earnings   │
│  ├── mod-fraud-planner    — Accountability score, fraud topology    │
│  ├── mod-procurement      — Permit tracking, EV calculator          │
│  ├── mod-maps             — Terrain + logistics corridor view       │
│  └── mod-* (infinite)     — User-defined PowerShell-scaffolded mods │
│                                                                      │
│  SQLXML BACKEND (Rust crate: sqlxml-engine)                          │
│  ├── Every canvas object serializes to XML on write                 │
│  ├── Lateral neighbor expansion for spatial queries                 │
│  ├── 21-day cycle governor for temporal analytics                   │
│  └── lane-mcp gateway sync (when network available)                 │
└─────────────────────────────────────────────────────────────────────┘
```

---

## The Canvas — Infinite, Modular, Live

### Infinite Canvas

The canvas has no boundaries. Pan with middle-mouse / two-finger drag. Zoom 0.01× to 10000×.
Objects exist at world coordinates. The viewport is a lens over the world.

```typescript
// canvas/engine/InfiniteCanvas.ts
interface WorldCoord { x: number; y: number; }
interface Viewport { origin: WorldCoord; scale: number; width: number; height: number; }

class InfiniteCanvas {
  private gl: WebGL2RenderingContext;
  private viewport: Viewport;
  private objectTree: SpatialIndex;  // R-tree for O(log n) hit detection

  pan(dx: number, dy: number): void    // update viewport.origin
  zoom(factor: number, center: WorldCoord): void  // scale around cursor
  render(): void                       // GPU render pass — 60fps locked
  hitTest(screen: ScreenCoord): CanvasObject | null  // click → object
}
```

Rendering pipeline:
1. **Background grid** — adaptive grid lines at current zoom level (dot grid at zoom < 0.5, line grid above)
2. **Object layers** — sorted by z-index, batched draw calls per object type
3. **Selection overlays** — bounding boxes, handles, anchor points
4. **Inspector overlay** — floating panel anchored to selected object
5. **HUD** — coordinates, zoom level, object count

### Object Model — Everything is a CanvasObject

```typescript
// canvas/objects/CanvasObject.ts
interface CanvasObject {
  id: string;                    // UUID
  type: ObjectType;              // "cell" | "node" | "edge" | "shape" | "group" | "viewport3d" | ...
  world: BoundingRect;           // world-space position + size
  transform: Transform2D;        // rotation, skew
  style: ObjectStyle;            // fill, stroke, opacity, shadow
  data: Record<string, unknown>; // type-specific payload
  meta: ObjectMeta;              // created, modified, locked, visible, tags
  children?: string[];           // child IDs (for groups)
  parent?: string;               // parent ID
}
```

Every object type registers:
- A **renderer** (how to draw it)
- An **inspector schema** (what the popup shows)
- A **serializer** (XML write path → SQLXML)
- A **hit-test overload** (for non-rectangular shapes)

### Universal Object Inspector

Click any object. The inspector appears — anchored to the object's bounding box,
floating above everything else. It is not a sidebar. It is not a modal. It is a live
popup that stays open while you edit.

```
┌─────────────────────────────────────────┐
│  ■ Cell [A1]                      [×]  │
│─────────────────────────────────────────│
│  Value    [  42,000.00              ]   │
│  Formula  [  =SUM(revenue_ytd)     ]   │
│  Format   [  Currency  ▾] USD  2dp     │
│  Style    [████] fill  [    ] stroke   │
│  Font     [IBM Plex Mono  14px  Bold]  │
│  Align    [◀ ■ ▶]  Vertical [▲ ■ ▼]  │
│  Tags     [finance] [q2] [+tag]        │
│  SQLXML   [push to lane-mcp ⇧]        │
│─────────────────────────────────────────│
│  ◀ History  3 changes  ▶               │
└─────────────────────────────────────────┘
```

Inspector schema is **type-driven** — each object type defines its own property panels.
The schema is a TypeScript object; rendering is automatic.

```typescript
// inspector/schema/CellInspectorSchema.ts
export const CellInspectorSchema: InspectorSchema = {
  sections: [
    {
      title: "Value",
      fields: [
        { key: "formula", type: "formula-input", label: "Formula" },
        { key: "format",  type: "select", options: FORMAT_OPTIONS },
      ]
    },
    {
      title: "Style",
      fields: [
        { key: "style.fill",   type: "color-picker" },
        { key: "style.stroke", type: "color-picker" },
        { key: "style.font",   type: "font-picker" },
      ]
    },
    // ... more sections
  ]
};
```

Every field change fires immediately — **no Apply button**. The canvas updates live.
The Rust backend receives the delta via IPC, writes it to SQLite, and optionally syncs
to SQLXML.

### Selection System

| Input | Behavior |
|-------|---------|
| Click | Select single object; open inspector |
| Shift+Click | Add to selection |
| Ctrl+Click | Toggle selection |
| Click+Drag (empty) | Box select |
| Alt+Click+Drag | Lasso select (freehand) |
| Right-click | Context menu (bring forward, send back, group, delete, inspect, export) |
| Double-click | Enter edit mode for the object (text editing, formula editing) |
| Escape | Deselect all |

Multi-selection inspector: shows shared properties with mixed-value indicators.
Editing a shared property applies to all selected objects simultaneously.

---

## Formula Engine (RustXML-Backed)

From `Macrohard_Excellent.jsx`: SUM, AVERAGE, COUNT, MAX, MIN, ROUND, ABS, SQRT with cell
range support. This is the baseline. The sovereign formula engine goes further:

```
SUM(A1:A100)              — range sum
IF(cond, val_true, val_false)
VLOOKUP(key, table, col)
INDEX(range, row, col)
MATCH(val, range, type)
XMLGET(xpath_expr)        — SOVEREIGN: query SQLXML store directly from a cell
FLAVOR(entity_type, t)    — Anticipatory Earnings: Eₐ(t) = Φ_flavor · Ȳ_YTD · (1+λt)
ACCOUNTABILITY(data...)   — Aₛ = 100 − (ωᵤΨᵤ + ωg·H_apex/R_norm)
CORRIDOR(lat, lon, t)     — Portland-to-Boardman logistics transform
```

Formula evaluation is **reactive** — changing a cell value immediately propagates to all
dependent cells. The dependency graph is a DAG maintained in the Rust backend.

```rust
// src-tauri/src/rpc/handlers/formula.rs
pub struct FormulaEngine {
    cells: HashMap<CellRef, CellValue>,
    deps: DependencyGraph,        // DAG: cell → set of dependents
    dirty: HashSet<CellRef>,      // cells needing re-eval
}

impl FormulaEngine {
    pub fn set(&mut self, cell: CellRef, formula: &str) -> EvalResult
    pub fn propagate(&mut self) -> Vec<CellUpdate>   // returns changed cells for UI sync
    pub fn xmlget(&self, xpath: &str) -> EvalResult  // queries embedded SQLXML store
}
```

---

## Module System — Infinite Scope, Hot-Loaded

Every feature is a **module** — a self-contained unit of canvas objects, inspector schemas,
toolbar buttons, and backend handlers. Modules load at runtime without restarting the app.

```typescript
// modules/ModuleRegistry.ts
interface MacroHardModule {
  id: string;              // "mod-spreadsheet", "mod-3d-planner", etc.
  name: string;
  version: string;
  icon: string;            // SVG string
  objects: ObjectTypeMap;  // registers new CanvasObject types
  inspectors: InspectorSchemaMap;
  toolbar: ToolbarConfig;
  rpcHandlers?: string[];  // declares Rust RPC methods this module uses
  init(canvas: InfiniteCanvas): Promise<void>;
  teardown(): Promise<void>;
}

class ModuleRegistry {
  load(module: MacroHardModule): void    // hot-load
  unload(moduleId: string): void         // hot-unload, canvas objects preserved
  list(): MacroHardModule[]
}
```

Modules ship as TypeScript files. They are loaded via dynamic `import()` — no bundler
rebuild required. A new module means a new `.ts` file; the PowerShell scaffold generates
the boilerplate.

### Built-in Modules (Phase 1–4)

**mod-spreadsheet**
- Grid canvas object (resizable, scrollable within a world-space bounding rect)
- Cell objects with formula support
- CSV import (drag-and-drop onto canvas → creates grid module)
- Pivot table generator

**mod-graph**
- Node + edge objects (directed / undirected / weighted)
- NMG topology: Electoral, Legislative, Executive, Intelligence, Judicial, Extractors
- Force-directed layout, hierarchical layout, circular layout
- Inspector: node type, weight, connections, color, label

**mod-3d-planner**
- Embedded 3D viewport object (from `Macro_Hard_Planner_3D.html`)
- 4 modes: Sphere Planner, Parallel Grid, Z-Manifold, Z-Plane
- Formula: `z = x / (y * 8000)` (configurable via inspector)
- Camera: orbit, zoom, reset
- Inspector: formula editor, axis colors, grid density, export to SVG

**mod-financials**
- SEC Financials Schematic objects
- Temporal era markers
- FLAVOR_COEFFICIENTS inspector: 9 entity types (Inc, LLC, NFP, DBA, PLC, Ltd, LLP, CIC, Intl)
- Anticipatory Earnings canvas widget: plots `Eₐ(t)` curve in real time as λ is adjusted

**mod-fraud-planner**
- Accountability Score canvas widget
- Fraud topology graph
- MATHEMATICAL_REGISTRY inspector: FORMULAS, EQUATIONS, STATISTICS, FRAUD, GEOMETRY_TRIG, VECTOR_MATHS tabs

**mod-procurement**
- Permit application tracker objects
- EV calculator canvas widget
- Corridor model: Portland → Boardman logistics transform visualization

**mod-maps**
- Terrain tile viewport object
- Derived map properties inspector
- SQLXML sync: `lane_maps_query(lat, lon, radius)` → canvas update

---

## PowerShell Scaffolding

MacroHard ships a PowerShell module: `MacroHard.psm1`.

```powershell
# Install the module (runs from MSI post-install)
Import-Module MacroHard

# Scaffold a new module
New-MacroHardModule -Name "mod-permits" -Author "Albert Lane" -Path "C:\Projects\macrohard\modules"

# Scaffold a new object type
New-MacroHardObject -Name "PermitCard" -Module "mod-permits" -InspectorSections "status,dates,parties"

# Generate a new workspace
New-MacroHardWorkspace -Name "Portland Corridor Plan" -Template "procurement"

# Publish a module to the sovereign registry
Publish-MacroHardModule -Path "C:\Projects\macrohard\modules\mod-permits" -Registry "sovereign"
```

`New-MacroHardModule` generates:
```
modules/mod-permits/
  mod-permits.ts        — module definition, init, teardown
  objects/
    PermitCard.ts       — CanvasObject type + renderer
    PermitCard.inspector.ts — InspectorSchema
  toolbar.ts            — toolbar config
  README.md
```

The scaffold is self-describing — the generated README tells you exactly what to fill in.

---

## Windows MSI Installer

Built by Tauri's WiX-based bundler.

```
MacroHard Design Studio Setup
  ├── MacroHard.exe              (Tauri shell, NexusCore backend)
  ├── macrohard.db               (SQLite, pre-seeded schema)
  ├── modules/                   (built-in modules)
  │   ├── mod-spreadsheet.js
  │   ├── mod-graph.js
  │   ├── mod-3d-planner.js
  │   ├── mod-financials.js
  │   ├── mod-fraud-planner.js
  │   └── mod-maps.js
  ├── assets/
  │   ├── macrohard-tokens.css
  │   └── ibm-plex-mono.woff2    (bundled — no CDN)
  └── PowerShell\
      └── MacroHard.psm1         (PowerShell scaffolding module)
```

Fully offline. No CDN calls. No telemetry. No external dependencies at runtime.

**Signing:** Windows Authenticode (PKCS#12 cert stored as GitHub Actions secret).
**Install path:** `%ProgramFiles%\MacroHard Design Studio\`
**Data path:** `%APPDATA%\MacroHard\` (workspaces, module cache, SQLite DB)
**Uninstall:** Clean — removes all installed files, preserves `%APPDATA%\MacroHard\` (user data)

CI workflow: `.github/workflows/build-windows.yml`
```yaml
- run: cargo tauri build --target x86_64-pc-windows-msvc
- uses: actions/upload-artifact@v4
  with: { name: macrohard-windows-msi, path: src-tauri/target/release/bundle/msi/*.msi }
```

---

## Android APK

Tauri Mobile (`tauri-plugin-android`).

Targets: `aarch64-linux-android` + `armv7-linux-androideabi`
Min SDK: 26 (Android 8.0)
Target SDK: 34

Touch adaptations:
- Two-finger pan + pinch-zoom on canvas
- Long-press = right-click (context menu)
- Inspector appears as bottom sheet (full-width, draggable)
- Module bar collapses to FAB (floating action button)
- Formula bar collapses to inline tap-to-edit

Biometrics on Android: `tauri-plugin-biometric` → `BiometricPrompt` API for vault unlock.

CI workflow: `.github/workflows/build-android.yml`

---

## SQLXML Backend Integration

Every canvas object serializes to XML. The SQLXML engine stores, queries, and syncs this.

```xml
<!-- Example: a Cell object in SQLXML format -->
<macrohard_object id="uuid-1234" type="cell" created="2026-06-11T00:45:00Z">
  <world x="120" y="340" width="120" height="32"/>
  <data>
    <formula>=SUM(A1:A10)</formula>
    <format>currency</format>
    <value>42000.00</value>
  </data>
  <style fill="#09090e" stroke="#FF9F1C" font="IBM Plex Mono 14px"/>
  <tags><tag>finance</tag><tag>q2</tag></tags>
</macrohard_object>
```

The Rust backend's `macrohard.sqlxml.*` handlers use `sqlxml-engine` (the extracted Cargo
library crate) to write and query these objects.

Sync path:
```
Canvas edit → IPC → NexusCore backend → SQLite (local) → SQLXML engine → lane-mcp gateway → D1 (Cloudflare)
```

Offline first: all writes go to SQLite. SQLXML sync queues up and flushes when online.

---

## Design System

From source documents — preserved exactly:

```css
:root {
  --bg:      #0B0C10;   /* canvas background */
  --bg2:     #0e0f18;   /* panel background */
  --bg3:     #12131e;   /* elevated surface */
  --border:  #1a1c2a;
  --border2: #252838;
  --accent:  #FF9F1C;   /* primary action color */
  --text:    #e8eaf4;   /* main text */
  --text2:   #aeb2cc;   /* secondary text */
  --text3:   #6e7090;   /* tertiary text */
  --mono:    'IBM Plex Mono', 'Courier New', monospace;
  --ax:      #e05a5a;   /* X axis (3D) */
  --ay:      #52b788;   /* Y axis (3D) */
  --az:      #00F5D4;   /* Z axis (3D) */
}
```

All UI is rendered in IBM Plex Mono. The canvas grid, panels, inspector, ribbon, formula bar —
same font, same palette. MacroHard has one face.

---

## Phase Plan

### Phase 1 — Tauri Shell + Canvas Skeleton (Windows)
- [ ] `src-tauri/` — Tauri 2.0 init, Axum backend, JSON-RPC bridge
- [ ] `src/canvas/InfiniteCanvas.ts` — WebGL2 renderer, pan/zoom
- [ ] `src/canvas/ObjectRegistry.ts` — base object types: rect, text, cell
- [ ] `src/inspector/InspectorBus.ts` — click → popup inspector
- [ ] `src/inspector/UniversalInspector.ts` — schema-driven field rendering
- [ ] `src-tauri/src/rpc/handlers/canvas.rs` — object CRUD, SQLite persistence
- [ ] `macrohard.db` schema — objects table, history table
- [ ] `.github/workflows/build-windows.yml` — MSI artifact
- [ ] `PowerShell/MacroHard.psm1` — `New-MacroHardModule` scaffold

### Phase 2 — Built-in Modules
- [ ] `modules/mod-spreadsheet/` — grid, cells, CSV import, formula engine
- [ ] `modules/mod-3d-planner/` — port `Macro_Hard_Planner_3D.html` as canvas object
- [ ] `modules/mod-graph/` — NMG topology, force-directed layout
- [ ] `modules/mod-financials/` — from `Macrohard_Excellent.jsx` financial schematics
- [ ] `modules/mod-fraud-planner/` — accountability score, fraud topology

### Phase 3 — SQLXML Integration
- [ ] `src-tauri/src/rpc/handlers/sqlxml.rs` — `macrohard.sqlxml.*` handlers
- [ ] `crates/sqlxml-engine` dependency wired (shared with tauri-rustxml)
- [ ] XML serializer for all CanvasObject types
- [ ] Offline queue + sync flush to lane-mcp
- [ ] `XMLGET()` formula function

### Phase 4 — Android APK + PowerShell Full
- [ ] Tauri Mobile config — `aarch64-linux-android`
- [ ] Touch canvas adaptations (pan/pinch, long-press, bottom sheet inspector)
- [ ] `.github/workflows/build-android.yml`
- [ ] `PowerShell/MacroHard.psm1` — full scaffold: module, object, workspace, publish
- [ ] Sovereign module registry (local + optional lane-mcp hosted)

### Phase 5 — NexusBrowser Engine Integration
- [ ] When `nexus-engine` is built (tauri-rustxml Phase 8): MacroHard adopts the same
  compositor for its canvas rendering layer — no WebGL2 fallback needed
- [ ] Design token system feeds directly into `nexus-engine/style/cascade.rs`
- [ ] MacroHard becomes 100% Chromium-free at the rendering layer

---

## File Structure (Target)

```
macrohard/
  src-tauri/
    Cargo.toml             — depends on sqlxml-engine, nexus-engine (Phase 5)
    src/
      main.rs
      rpc/
        handlers/
          canvas.rs        — object CRUD
          formula.rs       — formula engine
          inspector.rs     — property updates
          module.rs        — module loader
          sqlxml.rs        — SQLXML sync
          scaffold.rs      — PowerShell scaffold generator
  src/
    canvas/
      InfiniteCanvas.ts
      ObjectRegistry.ts
      SpatialIndex.ts      — R-tree hit detection
      SelectionManager.ts
      Transform2D.ts
    inspector/
      InspectorBus.ts
      UniversalInspector.ts
      fields/              — ColorPicker, FontPicker, FormulaInput, Select, ...
    formula/
      FormulaBar.ts
      parser.ts
    modules/
      ModuleRegistry.ts
      mod-spreadsheet/
      mod-3d-planner/
      mod-graph/
      mod-financials/
      mod-fraud-planner/
      mod-procurement/
      mod-maps/
    ui/
      Ribbon.ts
      LayerPanel.ts
      StatusBar.ts
    assets/
      macrohard-tokens.css
      ibm-plex-mono.woff2
  PowerShell/
    MacroHard.psm1
    templates/
      module.template.ts
      object.template.ts
      inspector.template.ts
  .github/
    workflows/
      build-windows.yml
      build-android.yml
      ci.yml
  Macro_Hard_Planner_3D.html   — source document (Phase 0)
  Macrohard_Excellent.jsx      — source document (Phase 0)
  MACROHARD_STUDIO.md          — this document
  CLAUDE.md                    — context handoff
  LICENSE.md
```

---

## Security

- No network calls from canvas objects — all SQLXML sync goes through NexusCore backend only
- No `eval()` in formula engine — formula parser is a proper recursive descent parser in Rust
- PowerShell scaffold generates files only to user-specified paths; no shell injection via `Invoke-Expression`
- Inspector field values sanitized before IPC dispatch (Zod schema validation)
- SQLite WAL mode — no corruption on ungraceful shutdown
- All Tauri IPC commands in allowlist — no wildcard invoke
- Windows MSI signed with Authenticode; Android APK signed with keystore
- Biometric unlock for vault — attestation-only, no raw biometric data stored

---

## Attribution

All source documents and architectural design: **Albert Lane**
AI Co-Architect: Claude Sonnet 4.6 (Anthropic)
All IP belongs to Albert Lane per `LICENSE.md`.
CORPORATE USE PROHIBITED without in-person written & verbal consent from Albert Lane.
