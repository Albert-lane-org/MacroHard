// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-09
// MH-P7-01: sqlxml-engine live wire. MH-AB-001 resolved — sqlxml PR #15
// restructured backend-agent into crates/sqlxml-engine, a real Cargo
// library crate this file now depends on directly.
//
// Interface mirrors lane_sqlxml_* MCP tools so MacroHarder's UI can query
// the SQLXML pipeline directly without going through the MCP gateway.
//
// Honest scope: the sqlxml-agent dispatch() function only implements PUT,
// INCREMENT_VERTICAL_DEPTH, and DRILL server-side (see
// sqlxml/crates/sqlxml-engine/src/agent.rs). GET and QUERY are not yet
// actions the backend understands — those stay stubbed until sqlxml adds
// them, rather than faking a response this pipeline can't produce.

#[cfg(feature = "sqlxml")]
use sqlxml_engine::SqlxmlEngine;

#[derive(Debug, thiserror::Error)]
#[error("sqlxml-bridge: {0}")]
pub struct SqlxmlBridgeError(pub String);

#[cfg(feature = "sqlxml")]
async fn connect() -> Result<SqlxmlEngine, SqlxmlBridgeError> {
    let database_url = std::env::var("DATABASE_URL")
        .map_err(|_| SqlxmlBridgeError("DATABASE_URL not set".into()))?;
    SqlxmlEngine::connect(&database_url)
        .await
        .map_err(|e| SqlxmlBridgeError(format!("connect failed: {e}")))
}

/// PUT — store an XML payload via the detailed write path.
#[cfg(feature = "sqlxml")]
pub async fn put(
    source_domain: &str,
    jurisdiction: &str,
    business_type: &str,
    payload_xml: &str,
) -> Result<String, SqlxmlBridgeError> {
    let engine = connect().await?;
    let result = engine.put(source_domain, jurisdiction, business_type, payload_xml).await;
    if result.success {
        Ok(result.message)
    } else {
        Err(SqlxmlBridgeError(result.message))
    }
}

#[cfg(not(feature = "sqlxml"))]
pub fn put(
    _source_domain: &str,
    _jurisdiction: &str,
    _business_type: &str,
    _payload_xml: &str,
) -> Result<String, SqlxmlBridgeError> {
    Err(SqlxmlBridgeError(
        "sqlxml-engine not wired — build with --features sqlxml".into(),
    ))
}

/// GET — not yet an action the sqlxml-agent dispatch() implements.
/// See crates/sqlxml-engine/src/agent.rs in the sqlxml repo.
pub fn get(_entry_id: &str) -> Result<String, SqlxmlBridgeError> {
    Err(SqlxmlBridgeError(
        "sqlxml-engine has no GET action yet — only PUT/INCREMENT_VERTICAL_DEPTH/DRILL are implemented server-side".into(),
    ))
}

/// QUERY — not yet an action the sqlxml-agent dispatch() implements.
/// See crates/sqlxml-engine/src/agent.rs in the sqlxml repo.
pub fn query(_jurisdiction: &str) -> Result<Vec<String>, SqlxmlBridgeError> {
    Err(SqlxmlBridgeError(
        "sqlxml-engine has no QUERY action yet — only PUT/INCREMENT_VERTICAL_DEPTH/DRILL are implemented server-side".into(),
    ))
}
