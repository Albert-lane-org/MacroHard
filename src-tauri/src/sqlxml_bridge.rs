// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-28
// MH-P6-02: sqlxml-engine bridge stub.
// Phase 7: activate when albert-lane-org/sqlxml backend-agent is
// restructured as a Cargo library crate and the git dep above is uncommented.
//
// Interface mirrors lane_sqlxml_* MCP tools so the MacroHard UI can query
// the SQLXML pipeline directly without going through the MCP gateway.

#[derive(Debug, thiserror::Error)]
#[error("sqlxml-bridge: {0}")]
pub struct SqlxmlBridgeError(pub String);

/// Phase 7: replace with real sqlxml_engine::put().
pub fn put(
    _source_domain: &str,
    _jurisdiction: &str,
    _payload_xml: &str,
) -> Result<String, SqlxmlBridgeError> {
    Err(SqlxmlBridgeError(
        "sqlxml-engine not wired — activate Phase 7 feature flag".into(),
    ))
}

/// Phase 7: replace with real sqlxml_engine::get().
pub fn get(_entry_id: &str) -> Result<String, SqlxmlBridgeError> {
    Err(SqlxmlBridgeError(
        "sqlxml-engine not wired — activate Phase 7 feature flag".into(),
    ))
}

/// Phase 7: replace with real sqlxml_engine::query().
pub fn query(_jurisdiction: &str) -> Result<Vec<String>, SqlxmlBridgeError> {
    Err(SqlxmlBridgeError(
        "sqlxml-engine not wired — activate Phase 7 feature flag".into(),
    ))
}
