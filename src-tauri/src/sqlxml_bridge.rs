// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-10 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MH-P7-01: sqlxml-engine live wire. MH-AB-001 resolved — sqlxml PR #15
// restructured backend-agent into crates/sqlxml-engine, a real Cargo
// library crate this file now depends on directly.
//
// Interface mirrors lane_sqlxml_* MCP tools so MacroHarder's UI can query
// the SQLXML pipeline directly without going through the MCP gateway.
//
// GET and QUERY are now live: sqlxml#19 merged, adding both actions to
// the backend dispatch(). engine.get() / engine.query() call them.

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
    let result = engine
        .put(source_domain, jurisdiction, business_type, payload_xml)
        .await;
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

/// GET — fetch a single xml_knowledge_set row by UUID.
/// Returns the JSON-serialized AgentResult data (entry_id, domain, metadata,
/// recursion_index). Backed by the GET action added in sqlxml#19.
#[cfg(feature = "sqlxml")]
pub async fn get(entry_id: &str, jurisdiction: &str) -> Result<String, SqlxmlBridgeError> {
    let engine = connect().await?;
    let result = engine.get(jurisdiction, entry_id).await;
    if result.success {
        if let Some(data) = result.data {
            Ok(data.to_string())
        } else {
            Ok(result.message)
        }
    } else {
        Err(SqlxmlBridgeError(result.message))
    }
}

#[cfg(not(feature = "sqlxml"))]
pub fn get(_entry_id: &str, _jurisdiction: &str) -> Result<String, SqlxmlBridgeError> {
    Err(SqlxmlBridgeError(
        "sqlxml-engine not wired — build with --features sqlxml".into(),
    ))
}

/// QUERY — filtered SELECT against business_intelligence.
/// Returns a JSON array of matching rows. source_domain and limit are optional.
/// Backed by the QUERY action added in sqlxml#19.
#[cfg(feature = "sqlxml")]
pub async fn query(
    jurisdiction: &str,
    source_domain: Option<&str>,
    limit: Option<u32>,
) -> Result<String, SqlxmlBridgeError> {
    let engine = connect().await?;
    let result = engine.query(jurisdiction, source_domain, limit).await;
    if result.success {
        if let Some(data) = result.data {
            Ok(data.to_string())
        } else {
            Ok(result.message)
        }
    } else {
        Err(SqlxmlBridgeError(result.message))
    }
}

#[cfg(not(feature = "sqlxml"))]
pub fn query(
    _jurisdiction: &str,
    _source_domain: Option<&str>,
    _limit: Option<u32>,
) -> Result<String, SqlxmlBridgeError> {
    Err(SqlxmlBridgeError(
        "sqlxml-engine not wired — build with --features sqlxml".into(),
    ))
}
