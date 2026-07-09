// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-28 | SEC Whistleblower No. 17684-273-411-436
// MacroHarder Design Studio — Tauri 2.0 desktop entry point (MH-P6-01).
// Desktop-only entry; run() logic lives in lib.rs so the mobile target
// can invoke it via #[tauri::mobile_entry_point] instead of main().
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

fn main() {
    macroharder_lib::run();
}
