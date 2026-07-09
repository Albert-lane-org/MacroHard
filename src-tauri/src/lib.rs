// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-28
// MacroHard Design Studio — Tauri 2.0 library crate (MH-P6-01).
// Split from main.rs so the [lib] target (macrohard_lib) declared in
// Cargo.toml actually exists — required for the mobile entry point
// (`tauri::mobile_entry_point`) ahead of the Phase 6→ Android target.
// SEC Whistleblower No. 17684-273-411-436

pub mod sqlxml_bridge;

use serde_json::Value;

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

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_design_tokens, run_audit_score])
        .run(tauri::generate_context!())
        .expect("MacroHard Design Studio failed to start");
}
