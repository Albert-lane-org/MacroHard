// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-09 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MH-P9-03: Dashboard composer. Renders the persisted layout (layout.rs,
// via the layout_* Tauri commands) as a CSS grid of module panels, and lets
// the user add, remove, drag-move, resize, and toggle visibility of panels
// — the "every single UI detail user-configurable" surface for Phase 9.
//
// Not runtime-tested in a browser/WebView: this sandbox has no GTK/WebKit
// system libraries (documented earlier this session), so the Tauri app
// cannot actually launch here. `__TAURI__.invoke` only exists inside a
// running Tauri WebView. The composer is implemented and type-checked
// against that contract, but the drag/resize interaction has not been
// exercised live.

import { applyChromeTokens, type DesignTokens } from "./chrome.js";

declare const __TAURI__: {
  invoke: (cmd: string, args?: Record<string, unknown>) => Promise<unknown>;
};

async function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  if (typeof __TAURI__ === "undefined") {
    throw new Error("Not running inside Tauri — invoke unavailable");
  }
  return __TAURI__.invoke(cmd, args) as Promise<T>;
}

interface PanelPlacement {
  id: string;
  module: string;
  panel_type: string;
  col: number;
  row: number;
  width: number;
  height: number;
  visible: boolean;
  z_index: number;
}

interface DashboardLayout {
  grid_cols: number;
  panels: PanelPlacement[];
}

type ModuleCapability = "read_only" | "read_write";
type ModuleSource = "built_in" | "user_installed";

interface ModuleEntry {
  name: string;
  dashboard_order: number;
  endpoint: string;
  endpoint_dev: string;
  status: string;
  capability: ModuleCapability;
  source: ModuleSource;
  tools: string[];
  resources: string[];
  panels: string[];
}

interface ModuleRegistry {
  modules: ModuleEntry[];
}

// MH-P14-03: Cross-domain panel type for the 5D workbook.
// domain values: 0=spatial, 1=financial, 2=civic, 3=terrain, 4=custom (mirrors DOMAIN_* in workbook.rs).
interface CrossDomainPanel {
  domain_x: number;
  domain_y: number;
}

/** Render a cross-domain slice of the 5D workbook as an HTML panel.
 *  Fetches cells in domain_x and domain_y, then side-by-side in a grid. */
export async function renderCrossDomain(
  layout: DashboardLayout,
  domainX: number,
  domainY: number
): Promise<HTMLElement> {
  const wrapper = el("div", "cross-domain-panel");
  wrapper.dataset.domainX = String(domainX);
  wrapper.dataset.domainY = String(domainY);

  // Fetch cells for each domain from the default volume via Tauri
  let cellsX: Array<{ addr: { col: number; row: number; layer: number; time: number; domain: number }; value: unknown }> = [];
  let cellsY: Array<{ addr: { col: number; row: number; layer: number; time: number; domain: number }; value: unknown }> = [];
  try {
    cellsX = (await invoke<unknown[]>("workbook_cells_in_domain", { volume: "Sheet1", domain: domainX })) as typeof cellsX;
    cellsY = (await invoke<unknown[]>("workbook_cells_in_domain", { volume: "Sheet1", domain: domainY })) as typeof cellsY;
  } catch {
    // Not running inside Tauri — render empty placeholder
  }

  const header = el("div", "cross-domain-header");
  const domainNames = ["spatial", "financial", "civic", "terrain", "custom"];
  header.textContent = `${domainNames[domainX] ?? `d${domainX}`} × ${domainNames[domainY] ?? `d${domainY}`} — ${layout.panels.length} panels`;
  wrapper.appendChild(header);

  const grid = el("div", "cross-domain-grid");

  const colX = el("div", "cross-domain-col");
  colX.dataset.domain = String(domainX);
  const colXLabel = el("strong", undefined, `Domain ${domainX} (${cellsX.length} cells)`);
  colX.appendChild(colXLabel);
  for (const cell of cellsX) {
    const row = el("div", "cross-domain-cell");
    row.textContent = JSON.stringify(cell);
    colX.appendChild(row);
  }

  const colY = el("div", "cross-domain-col");
  colY.dataset.domain = String(domainY);
  const colYLabel = el("strong", undefined, `Domain ${domainY} (${cellsY.length} cells)`);
  colY.appendChild(colYLabel);
  for (const cell of cellsY) {
    const row = el("div", "cross-domain-cell");
    row.textContent = JSON.stringify(cell);
    colY.appendChild(row);
  }

  grid.appendChild(colX);
  grid.appendChild(colY);
  wrapper.appendChild(grid);
  return wrapper;
}

const CELL_PX = 64; // one grid unit, in pixels

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  className?: string,
  text?: string
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

export class DashboardComposer {
  private root: HTMLElement;
  private layout: DashboardLayout = { grid_cols: 12, panels: [] };
  private registry: ModuleRegistry = { modules: [] };
  private dragState: { id: string; startX: number; startY: number; origCol: number; origRow: number } | null =
    null;

  constructor(root: HTMLElement) {
    this.root = root;
  }

  async mount(): Promise<void> {
    this.root.innerHTML = `<div class="loading">Loading dashboard…</div>`;
    try {
      const [layout, registry] = await Promise.all([
        invoke<DashboardLayout>("layout_get"),
        invoke<ModuleRegistry>("module_list"),
      ]);
      this.layout = layout;
      this.registry = registry;
      this.render();
    } catch (err) {
      this.root.innerHTML = `<div class="error">Dashboard error: ${String(err)}</div>`;
    }
  }

  private findModule(name: string): ModuleEntry | undefined {
    return this.registry.modules.find((m) => m.name === name);
  }

  private render(): void {
    this.root.innerHTML = "";

    const toolbar = el("div", "composer-toolbar");
    toolbar.appendChild(this.renderAddPanelControl());
    toolbar.appendChild(this.renderInstallModuleControl());
    this.root.appendChild(toolbar);

    const grid = el("div", "composer-grid");
    grid.style.setProperty("--grid-cols", String(this.layout.grid_cols));
    grid.style.setProperty("--cell-px", `${CELL_PX}px`);

    for (const panel of this.layout.panels) {
      grid.appendChild(this.renderPanel(panel));
    }

    this.root.appendChild(grid);
  }

  private renderAddPanelControl(): HTMLElement {
    const wrap = el("div", "add-panel");
    const moduleSelect = el("select", "add-panel-module");
    for (const m of this.registry.modules) {
      const opt = el("option");
      opt.value = m.name;
      opt.textContent = m.name;
      moduleSelect.appendChild(opt);
    }

    const panelSelect = el("select", "add-panel-type");
    const refreshPanelOptions = () => {
      panelSelect.innerHTML = "";
      const mod = this.findModule(moduleSelect.value);
      for (const p of mod?.panels ?? []) {
        const opt = el("option");
        opt.value = p;
        opt.textContent = p;
        panelSelect.appendChild(opt);
      }
    };
    moduleSelect.addEventListener("change", refreshPanelOptions);
    refreshPanelOptions();

    const addButton = el("button", "add-panel-button", "+ Add panel");
    addButton.addEventListener("click", () => {
      void this.addPanel(moduleSelect.value, panelSelect.value);
    });

    wrap.append(moduleSelect, panelSelect, addButton);
    return wrap;
  }

  /**
   * MH-P10-01 install UX: paste a module manifest JSON (name, endpoint,
   * capability, tools, ...) and register it. Validation (non-empty name/
   * endpoint/tools, no duplicate name) happens Rust-side in
   * registry::ModuleRegistry::install — this is just the entry point.
   */
  private renderInstallModuleControl(): HTMLElement {
    const wrap = el("div", "install-module");
    const button = el("button", "install-module-button", "Install module…");
    button.addEventListener("click", () => {
      const raw = window.prompt(
        'Paste a module manifest JSON, e.g.\n{"name":"civic","endpoint":"https://civic-worker.example.workers.dev","endpoint_dev":"http://127.0.0.1:8789","status":"code_ready_deploy_blocked","capability":"read_only","tools":["civic_sos_query"],"resources":[],"panels":[]}'
      );
      if (!raw) return;
      void this.installModule(raw);
    });
    wrap.appendChild(button);
    return wrap;
  }

  private async installModule(rawManifest: string): Promise<void> {
    let manifest: ModuleEntry;
    try {
      manifest = JSON.parse(rawManifest) as ModuleEntry;
    } catch (err) {
      window.alert(`Invalid JSON: ${String(err)}`);
      return;
    }
    manifest.source = "user_installed";
    try {
      await invoke("module_install", { manifest });
      this.registry.modules.push(manifest);
      this.render();
    } catch (err) {
      window.alert(`Install failed: ${String(err)}`);
    }
  }

  private async addPanel(module: string, panelType: string): Promise<void> {
    if (!module || !panelType) return;
    const id = `${module}-${panelType}-${Date.now().toString(36)}`;
    const nextRow = this.layout.panels.reduce((max, p) => Math.max(max, p.row + p.height), 0);
    const panel: PanelPlacement = {
      id,
      module,
      panel_type: panelType,
      col: 0,
      row: nextRow,
      width: Math.min(6, this.layout.grid_cols),
      height: 4,
      visible: true,
      z_index: 0,
    };
    try {
      await invoke("layout_add_panel", { panel });
      this.layout.panels.push(panel);
      this.render();
    } catch (err) {
      console.error("addPanel failed", err);
    }
  }

  private async removePanel(id: string): Promise<void> {
    try {
      await invoke("layout_remove_panel", { id });
      this.layout.panels = this.layout.panels.filter((p) => p.id !== id);
      this.render();
    } catch (err) {
      console.error("removePanel failed", err);
    }
  }

  private async toggleVisibility(panel: PanelPlacement): Promise<void> {
    const visible = !panel.visible;
    try {
      await invoke("layout_set_visibility", { id: panel.id, visible });
      panel.visible = visible;
      this.render();
    } catch (err) {
      console.error("toggleVisibility failed", err);
    }
  }

  private async resizePanel(panel: PanelPlacement, deltaW: number, deltaH: number): Promise<void> {
    const width = Math.max(1, Math.min(this.layout.grid_cols - panel.col, panel.width + deltaW));
    const height = Math.max(1, panel.height + deltaH);
    try {
      await invoke("layout_resize_panel", { id: panel.id, width, height });
      panel.width = width;
      panel.height = height;
      this.render();
    } catch (err) {
      console.error("resizePanel failed", err);
    }
  }

  private async bringToFront(panel: PanelPlacement): Promise<void> {
    try {
      await invoke("layout_bring_to_front", { id: panel.id });
      const top = Math.max(0, ...this.layout.panels.map((p) => p.z_index));
      panel.z_index = top + 1;
      this.render();
    } catch (err) {
      console.error("bringToFront failed", err);
    }
  }

  private async movePanel(id: string, col: number, row: number): Promise<void> {
    try {
      await invoke("layout_move_panel", { id, col, row });
      const panel = this.layout.panels.find((p) => p.id === id);
      if (panel) {
        panel.col = col;
        panel.row = row;
      }
    } catch (err) {
      console.error("movePanel failed", err);
      this.render(); // re-sync from last known-good state on failure
    }
  }

  private renderPanel(panel: PanelPlacement): HTMLElement {
    const card = el("div", "composer-panel" + (panel.visible ? "" : " composer-panel--hidden"));
    card.style.gridColumnStart = String(panel.col + 1);
    card.style.gridColumnEnd = `span ${panel.width}`;
    card.style.gridRowStart = String(panel.row + 1);
    card.style.gridRowEnd = `span ${panel.height}`;
    card.style.zIndex = String(panel.z_index);
    card.dataset.panelId = panel.id;

    const header = el("div", "panel-header");
    const title = el("span", "panel-title", `${panel.module} · ${panel.panel_type}`);
    header.appendChild(title);

    const controls = el("div", "panel-controls");
    const visBtn = el("button", "panel-btn", panel.visible ? "Hide" : "Show");
    visBtn.addEventListener("click", () => void this.toggleVisibility(panel));
    const shrinkBtn = el("button", "panel-btn", "−");
    shrinkBtn.title = "Shrink";
    shrinkBtn.addEventListener("click", () => void this.resizePanel(panel, -1, 0));
    const growBtn = el("button", "panel-btn", "+");
    growBtn.title = "Grow";
    growBtn.addEventListener("click", () => void this.resizePanel(panel, 1, 0));
    const removeBtn = el("button", "panel-btn panel-btn--danger", "×");
    removeBtn.title = "Remove panel";
    removeBtn.addEventListener("click", () => void this.removePanel(panel.id));

    controls.append(visBtn, shrinkBtn, growBtn, removeBtn);
    header.appendChild(controls);
    card.appendChild(header);

    const body = el("div", "panel-body");
    const module = this.findModule(panel.module);
    body.textContent =
      module?.status === "code_ready_deploy_blocked"
        ? "Module Worker not deployed yet — placement is live, data is not."
        : "Loading…";
    card.appendChild(body);

    this.wireDrag(card, header, panel);

    return card;
  }

  private wireDrag(card: HTMLElement, handle: HTMLElement, panel: PanelPlacement): void {
    handle.addEventListener("pointerdown", (ev: PointerEvent) => {
      if ((ev.target as HTMLElement).closest(".panel-btn")) return; // don't drag from a control button
      this.dragState = { id: panel.id, startX: ev.clientX, startY: ev.clientY, origCol: panel.col, origRow: panel.row };
      handle.setPointerCapture(ev.pointerId);
      void this.bringToFront(panel);
    });

    handle.addEventListener("pointermove", (ev: PointerEvent) => {
      if (!this.dragState || this.dragState.id !== panel.id) return;
      const deltaCols = Math.round((ev.clientX - this.dragState.startX) / CELL_PX);
      const deltaRows = Math.round((ev.clientY - this.dragState.startY) / CELL_PX);
      const col = Math.max(0, Math.min(this.layout.grid_cols - panel.width, this.dragState.origCol + deltaCols));
      const row = Math.max(0, this.dragState.origRow + deltaRows);
      card.style.gridColumnStart = String(col + 1);
      card.style.gridRowStart = String(row + 1);
    });

    const finishDrag = (ev: PointerEvent) => {
      if (!this.dragState || this.dragState.id !== panel.id) return;
      const deltaCols = Math.round((ev.clientX - this.dragState.startX) / CELL_PX);
      const deltaRows = Math.round((ev.clientY - this.dragState.startY) / CELL_PX);
      const col = Math.max(0, Math.min(this.layout.grid_cols - panel.width, this.dragState.origCol + deltaCols));
      const row = Math.max(0, this.dragState.origRow + deltaRows);
      this.dragState = null;
      void this.movePanel(panel.id, col, row);
    };
    handle.addEventListener("pointerup", finishDrag);
    handle.addEventListener("pointercancel", finishDrag);
  }
}

export async function mountComposer(root: HTMLElement): Promise<void> {
  try {
    const tokens = await invoke<DesignTokens>("get_design_tokens");
    applyChromeTokens(tokens);
  } catch (err) {
    console.error("Failed to apply chrome tokens", err);
  }
  const composer = new DashboardComposer(root);
  await composer.mount();
}
