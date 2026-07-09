// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-28
// MacroHarder Design Studio — Tauri 2.0 library crate (MH-P6-01).
// Split from main.rs so the [lib] target (macroharder_lib) declared in
// Cargo.toml actually exists — required for the mobile entry point
// (`tauri::mobile_entry_point`) ahead of the Phase 6→ Android target.
// SEC Whistleblower No. 17684-273-411-436

pub mod layout;
pub mod mcp_client;
pub mod sqlxml_bridge;
pub mod workbook;

use layout::{DashboardLayout, PanelPlacement};
use mcp_client::McpClient;
use serde_json::Value;
use std::sync::Mutex;
use workbook::{CellAddress, CellValue, Workbook};

/// Return the canonical design-tokens.json as a parsed JSON value.
/// In dev, resolved relative to the workspace root. In release, bundled as a resource.
#[tauri::command]
fn get_design_tokens() -> Result<Value, String> {
    let candidates = [
        std::path::PathBuf::from("design-tokens.json"),
        std::path::PathBuf::from("../../design-tokens.json"),
    ];
    for p in &candidates {
        if p.exists() {
            let raw = std::fs::read_to_string(p)
                .map_err(|e| format!("Read error ({p:?}): {e}"))?;
            return serde_json::from_str(&raw)
                .map_err(|e| format!("Parse error: {e}"));
        }
    }
    Err("design-tokens.json not found in workspace root".into())
}

/// Run scripts/audit_score.py and return its JSON output.
/// The script exits 1 on FAIL; we surface the score regardless.
#[tauri::command]
fn run_audit_score() -> Result<Value, String> {
    let script_candidates = [
        std::path::PathBuf::from("scripts/audit_score.py"),
        std::path::PathBuf::from("../../scripts/audit_score.py"),
    ];
    let script = script_candidates
        .iter()
        .find(|p| p.exists())
        .ok_or_else(|| "scripts/audit_score.py not found".to_string())?;

    let output = std::process::Command::new("python3")
        .arg(script)
        .output()
        .map_err(|e| format!("Failed to launch python3: {e}"))?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    if stdout.trim().is_empty() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(format!("audit_score.py produced no output. stderr: {stderr}"));
    }

    serde_json::from_str(stdout.trim())
        .map_err(|e| format!("Parse error: {e} — raw: {stdout}"))
}

// ---------------------------------------------------------------------------
// MH-P8-01: Workbook core — 3D cell model + grid engine, exposed to the
// WebView as Tauri commands over an in-process Mutex<Workbook>.
// ---------------------------------------------------------------------------

type WorkbookState = Mutex<Workbook>;

#[tauri::command]
fn workbook_create_volume(state: tauri::State<WorkbookState>, name: String) -> Result<(), String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .create_volume(&name)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn workbook_list_volumes(state: tauri::State<WorkbookState>) -> Result<Vec<String>, String> {
    Ok(state.lock().map_err(|e| e.to_string())?.list_volumes())
}

#[tauri::command]
fn workbook_set_cell(
    state: tauri::State<WorkbookState>,
    volume: String,
    col: u32,
    row: u32,
    layer: u32,
    value: CellValue,
) -> Result<(), String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .set_cell(&volume, CellAddress::new(col, row, layer), value)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn workbook_get_cell(
    state: tauri::State<WorkbookState>,
    volume: String,
    col: u32,
    row: u32,
    layer: u32,
) -> Result<CellValue, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .get_cell(&volume, CellAddress::new(col, row, layer))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn workbook_clear_cell(
    state: tauri::State<WorkbookState>,
    volume: String,
    col: u32,
    row: u32,
    layer: u32,
) -> Result<(), String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .clear_cell(&volume, CellAddress::new(col, row, layer))
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn workbook_volume_bounds(
    state: tauri::State<WorkbookState>,
    volume: String,
) -> Result<Option<(CellAddress, CellAddress)>, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .volume_bounds(&volume)
        .map_err(|e| e.to_string())
}

#[tauri::command]
fn workbook_non_empty_cells(
    state: tauri::State<WorkbookState>,
    volume: String,
) -> Result<Vec<(CellAddress, CellValue)>, String> {
    state
        .lock()
        .map_err(|e| e.to_string())?
        .non_empty_cells(&volume)
        .map_err(|e| e.to_string())
}

// ---------------------------------------------------------------------------
// MH-P9-01: Dashboard layout — panel placement is data (layout.rs), so the
// composer can rearrange it at runtime. Auto-persisted to disk on every
// mutation so the arrangement survives an app restart.
// ---------------------------------------------------------------------------

type LayoutState = Mutex<DashboardLayout>;

fn layout_path() -> std::path::PathBuf {
    std::path::PathBuf::from("dashboard-layout.json")
}

#[tauri::command]
fn layout_get(state: tauri::State<LayoutState>) -> Result<DashboardLayout, String> {
    Ok(state.lock().map_err(|e| e.to_string())?.clone())
}

fn persist_layout(layout: &DashboardLayout) -> Result<(), String> {
    layout.save_to_path(&layout_path()).map_err(|e| e.to_string())
}

#[tauri::command]
fn layout_add_panel(state: tauri::State<LayoutState>, panel: PanelPlacement) -> Result<(), String> {
    let mut layout = state.lock().map_err(|e| e.to_string())?;
    layout.add_panel(panel).map_err(|e| e.to_string())?;
    persist_layout(&layout)
}

#[tauri::command]
fn layout_remove_panel(state: tauri::State<LayoutState>, id: String) -> Result<(), String> {
    let mut layout = state.lock().map_err(|e| e.to_string())?;
    layout.remove_panel(&id).map_err(|e| e.to_string())?;
    persist_layout(&layout)
}

#[tauri::command]
fn layout_move_panel(
    state: tauri::State<LayoutState>,
    id: String,
    col: u32,
    row: u32,
) -> Result<(), String> {
    let mut layout = state.lock().map_err(|e| e.to_string())?;
    layout.move_panel(&id, col, row).map_err(|e| e.to_string())?;
    persist_layout(&layout)
}

#[tauri::command]
fn layout_resize_panel(
    state: tauri::State<LayoutState>,
    id: String,
    width: u32,
    height: u32,
) -> Result<(), String> {
    let mut layout = state.lock().map_err(|e| e.to_string())?;
    layout.resize_panel(&id, width, height).map_err(|e| e.to_string())?;
    persist_layout(&layout)
}

#[tauri::command]
fn layout_set_visibility(
    state: tauri::State<LayoutState>,
    id: String,
    visible: bool,
) -> Result<(), String> {
    let mut layout = state.lock().map_err(|e| e.to_string())?;
    layout.set_visibility(&id, visible).map_err(|e| e.to_string())?;
    persist_layout(&layout)
}

#[tauri::command]
fn layout_bring_to_front(state: tauri::State<LayoutState>, id: String) -> Result<(), String> {
    let mut layout = state.lock().map_err(|e| e.to_string())?;
    layout.bring_to_front(&id).map_err(|e| e.to_string())?;
    persist_layout(&layout)
}

// ---------------------------------------------------------------------------
// MH-P8-02/03: module registry + MCP client passthrough. MacroHarder is an
// ordinary MCP client of each module's Worker — no lane-mcp gateway here.
// ---------------------------------------------------------------------------

/// Read config/modules.json (the module registry: procurement, maps, ...).
#[tauri::command]
fn module_list() -> Result<Value, String> {
    let candidates = [
        std::path::PathBuf::from("config/modules.json"),
        std::path::PathBuf::from("../../src-tauri/config/modules.json"),
    ];
    for p in &candidates {
        if p.exists() {
            let raw = std::fs::read_to_string(p)
                .map_err(|e| format!("Read error ({p:?}): {e}"))?;
            return serde_json::from_str(&raw)
                .map_err(|e| format!("Parse error: {e}"));
        }
    }
    Err("config/modules.json not found".into())
}

/// Call a tool on a registered module by name, using its dev endpoint if
/// use_dev is true (module Workers aren't deployed yet — MAP-P7-01,
/// PRO-P7-01 — so dev is the only live option pre-Phase-7 for those repos).
#[tauri::command]
async fn module_call_tool(
    module: String,
    tool: String,
    arguments: Value,
    use_dev: bool,
) -> Result<Value, String> {
    let registry = module_list()?;
    let modules = registry
        .get("modules")
        .and_then(|m| m.as_array())
        .ok_or_else(|| "modules.json missing 'modules' array".to_string())?;

    let entry = modules
        .iter()
        .find(|m| m.get("name").and_then(|n| n.as_str()) == Some(module.as_str()))
        .ok_or_else(|| format!("module '{module}' not found in registry"))?;

    let endpoint_key = if use_dev { "endpoint_dev" } else { "endpoint" };
    let endpoint = entry
        .get(endpoint_key)
        .and_then(|e| e.as_str())
        .ok_or_else(|| format!("module '{module}' has no '{endpoint_key}'"))?;

    let client = McpClient::new(endpoint);
    client
        .call_tool(&tool, arguments)
        .await
        .map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_layout = DashboardLayout::load_or_default(&layout_path(), 12);

    tauri::Builder::default()
        .manage(Mutex::new(Workbook::new()))
        .manage(Mutex::new(initial_layout))
        .invoke_handler(tauri::generate_handler![
            get_design_tokens,
            run_audit_score,
            workbook_create_volume,
            workbook_list_volumes,
            workbook_set_cell,
            workbook_get_cell,
            workbook_clear_cell,
            workbook_volume_bounds,
            workbook_non_empty_cells,
            module_list,
            module_call_tool,
            layout_get,
            layout_add_panel,
            layout_remove_panel,
            layout_move_panel,
            layout_resize_panel,
            layout_set_visibility,
            layout_bring_to_front,
        ])
        .run(tauri::generate_context!())
        .expect("MacroHarder Design Studio failed to start");
}
