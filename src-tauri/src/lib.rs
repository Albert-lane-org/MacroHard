// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-28 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MacroHarder Design Studio — Tauri 2.0 library crate (MH-P6-01).
// Split from main.rs so the [lib] target (macroharder_lib) declared in
// Cargo.toml actually exists — required for the mobile entry point
// (`tauri::mobile_entry_point`) ahead of the Phase 6→ Android target.
// Phase 11: AER integration (aer.rs) — MacroHarder as MCP client of lane-mcp gateway.
// Phase 12: Filesystem integrity (integrity.rs) — BLAKE3 content-hash manifest.

pub mod aer;
pub mod integrity;
pub mod layout;
pub mod mcp_client;
pub mod registry;
pub mod sqlxml_bridge;
pub mod workbook;

use integrity::{Manifest as IntegrityManifest, VerifyResult};
use layout::{DashboardLayout, PanelPlacement};
use mcp_client::McpClient;
use registry::{ModuleManifest, ModuleRegistry};
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
            let raw = std::fs::read_to_string(p).map_err(|e| format!("Read error ({p:?}): {e}"))?;
            return serde_json::from_str(&raw).map_err(|e| format!("Parse error: {e}"));
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
        return Err(format!(
            "audit_score.py produced no output. stderr: {stderr}"
        ));
    }

    serde_json::from_str(stdout.trim()).map_err(|e| format!("Parse error: {e} — raw: {stdout}"))
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
    layout
        .save_to_path(&layout_path())
        .map_err(|e| e.to_string())
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
    layout
        .move_panel(&id, col, row)
        .map_err(|e| e.to_string())?;
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
    layout
        .resize_panel(&id, width, height)
        .map_err(|e| e.to_string())?;
    persist_layout(&layout)
}

#[tauri::command]
fn layout_set_visibility(
    state: tauri::State<LayoutState>,
    id: String,
    visible: bool,
) -> Result<(), String> {
    let mut layout = state.lock().map_err(|e| e.to_string())?;
    layout
        .set_visibility(&id, visible)
        .map_err(|e| e.to_string())?;
    persist_layout(&layout)
}

#[tauri::command]
fn layout_bring_to_front(state: tauri::State<LayoutState>, id: String) -> Result<(), String> {
    let mut layout = state.lock().map_err(|e| e.to_string())?;
    layout.bring_to_front(&id).map_err(|e| e.to_string())?;
    persist_layout(&layout)
}

// ---------------------------------------------------------------------------
// MH-P10-01: MCP module host — registry, capability gating, install UX.
// MacroHarder is an ordinary MCP client of each module's Worker — no
// lane-mcp gateway here. Every tool call is gated through
// registry::authorize_tool_call() so a module can only be dispatched calls
// it actually declares, and a read_only module can't be used for anything
// that looks like a write.
// ---------------------------------------------------------------------------

fn module_registry_path() -> std::path::PathBuf {
    let candidates = [
        std::path::PathBuf::from("config/modules.json"),
        std::path::PathBuf::from("../../src-tauri/config/modules.json"),
    ];
    candidates
        .into_iter()
        .find(|p| p.exists())
        .unwrap_or_else(|| std::path::PathBuf::from("config/modules.json"))
}

fn load_registry() -> Result<ModuleRegistry, String> {
    ModuleRegistry::load_from_path(&module_registry_path()).map_err(|e| e.to_string())
}

fn persist_registry(registry: &ModuleRegistry) -> Result<(), String> {
    registry
        .save_to_path(&module_registry_path())
        .map_err(|e| e.to_string())
}

/// Read config/modules.json (the module registry: procurement, maps, ...).
#[tauri::command]
fn module_list() -> Result<ModuleRegistry, String> {
    load_registry()
}

/// Call a tool on a registered module by name, using its dev endpoint if
/// use_dev is true (module Workers aren't deployed yet — MAP-P7-01,
/// PRO-P7-01 — so dev is the only live option pre-Phase-7 for those repos).
/// Gated through ModuleRegistry::authorize_tool_call: the tool must be
/// declared by the module, and read_only modules reject write-shaped tools.
#[tauri::command]
async fn module_call_tool(
    module: String,
    tool: String,
    arguments: Value,
    use_dev: bool,
) -> Result<Value, String> {
    let registry = load_registry()?;
    let entry = registry
        .authorize_tool_call(&module, &tool)
        .map_err(|e| e.to_string())?;

    let endpoint = if use_dev {
        &entry.endpoint_dev
    } else {
        &entry.endpoint
    };
    if endpoint.is_empty() {
        return Err(format!(
            "module '{module}' has no {} endpoint",
            if use_dev { "dev" } else { "production" }
        ));
    }

    let client = McpClient::new(endpoint.as_str());
    client
        .call_tool(&tool, arguments)
        .await
        .map_err(|e| e.to_string())
}

/// Install a new module manifest into the registry — the "module install
/// UX" backend. Validates the manifest (non-empty name/endpoint/tools,
/// no duplicate name) before persisting.
#[tauri::command]
fn module_install(manifest: ModuleManifest) -> Result<(), String> {
    let mut registry = load_registry()?;
    registry.install(manifest).map_err(|e| e.to_string())?;
    persist_registry(&registry)
}

#[tauri::command]
fn module_uninstall(name: String) -> Result<(), String> {
    let mut registry = load_registry()?;
    registry.uninstall(&name).map_err(|e| e.to_string())?;
    persist_registry(&registry)
}

// ---------------------------------------------------------------------------
// MH-P11-01: AER integration — proxy to lane-mcp gateway's lane_aer_write /
// lane_aer_read tools via MCP JSON-RPC 2.0. Auth via x-lane-api-key header
// from LANE_MCP_API_KEY env var. Endpoint from LANE_MCP_ENDPOINT env var
// (default: https://mcp.albertlane.org/rpc).
//
// These are re-exported from aer.rs as top-level Tauri commands.
// ---------------------------------------------------------------------------

// ---------------------------------------------------------------------------
// MH-P12-01: Filesystem integrity — BLAKE3 content-hash manifest.
// Non-fatal boot check; commands to generate/verify from the WebView.
// ---------------------------------------------------------------------------

fn integrity_manifest_path() -> std::path::PathBuf {
    std::path::PathBuf::from("integrity-manifest.json")
}

/// Generate (or re-baseline) the BLAKE3 content-hash manifest for tracked files.
#[tauri::command]
fn generate_integrity_manifest() -> Result<IntegrityManifest, String> {
    let root = std::path::Path::new(".");
    let manifest = integrity::generate(root).map_err(|e| e.to_string())?;
    let path = integrity_manifest_path();
    integrity::save_manifest(&manifest, &path).map_err(|e| e.to_string())?;
    Ok(manifest)
}

/// Verify the tracked files against the stored manifest; returns a VerifyResult
/// with passed/failed/missing counts. Never panics — verification failures are
/// surfaced, not fatal.
#[tauri::command]
fn verify_integrity() -> Result<VerifyResult, String> {
    let path = integrity_manifest_path();
    let root = std::path::Path::new(".");
    if !path.exists() {
        // No manifest yet — generate one then verify (always clean on first run).
        let manifest = integrity::generate(root).map_err(|e| e.to_string())?;
        integrity::save_manifest(&manifest, &path).map_err(|e| e.to_string())?;
        return integrity::verify(root, &manifest).map_err(|e| e.to_string());
    }
    let manifest = integrity::load_manifest(&path).map_err(|e| e.to_string())?;
    integrity::verify(root, &manifest).map_err(|e| e.to_string())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let initial_layout = DashboardLayout::load_or_default(&layout_path(), 12);

    // MH-P12-01: non-fatal boot integrity check.
    let integrity_path = integrity_manifest_path();
    if integrity_path.exists() {
        let root = std::path::Path::new(".");
        if let Ok(manifest) = integrity::load_manifest(&integrity_path) {
            if let Ok(result) = integrity::verify(root, &manifest) {
                if !result.passed {
                    eprintln!(
                        "[MacroHarder] integrity warning: {} failure(s), {} missing — {:?}",
                        result.failed.len(),
                        result.missing.len(),
                        result.failed
                    );
                }
            }
        }
    }

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
            module_install,
            module_uninstall,
            layout_get,
            layout_add_panel,
            layout_remove_panel,
            layout_move_panel,
            layout_resize_panel,
            layout_set_visibility,
            layout_bring_to_front,
            aer::aer_write,
            aer::aer_read,
            generate_integrity_manifest,
            verify_integrity,
        ])
        .run(tauri::generate_context!())
        .expect("MacroHarder Design Studio failed to start");
}
