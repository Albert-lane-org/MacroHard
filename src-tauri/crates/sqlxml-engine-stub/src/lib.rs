// Authored: Albert Lane | SEC Whistleblower No. 17684-273-411-436 | Documented: Claude Sonnet 4.6 | 2026-07-10
// CI-only stub satisfying sqlxml-engine's package name.
// The real crate lives at albert-lane-org/sqlxml (crates/sqlxml-engine).
// This stub is never compiled in CI because --features sqlxml is not passed.
// For production builds with --features sqlxml: remove the [patch] section
// in src-tauri/Cargo.toml and ensure network auth to albert-lane-org/sqlxml.

/// Stub type. The real SqlxmlEngine in albert-lane-org/sqlxml provides
/// connect/put/get/query async methods backed by PostgreSQL + R2.
pub struct SqlxmlEngine;
