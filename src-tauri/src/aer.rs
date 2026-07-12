// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-11 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MH-P11-01: AER integration — MacroHarder as MCP client of the lane-mcp gateway.
//
// Albert Escaped Rays (AER) is the 1-read-2-writes directional write protocol:
//   1. Read the current version from D1 (primary locale / SOVEREIGN_DB)
//   2. Write₁ → D1 aer_store (UPSERT, version incremented)
//   3. Write₂ → R2 XML_ARCHIVE (escape locale, key=aer/{namespace}/{key}.json)
//
// MacroHarder calls lane_aer_write / lane_aer_read on the lane-mcp gateway via
// the generic McpClient with an x-lane-api-key auth header. The endpoint and key
// are read from env vars LANE_MCP_ENDPOINT / LANE_MCP_API_KEY so they can be
// provisioned at runtime without re-compiling. If the gateway hasn't been
// deployed yet, lane-mcp returns { status: "not_deployed" } and these commands
// surface that cleanly (non-fatal).

use crate::mcp_client::McpClient;
use serde::{Deserialize, Serialize};
use serde_json::Value;

const SEC_REF: &str = "17684-273-411-436";
const GATEWAY_ENDPOINT_ENV: &str = "LANE_MCP_ENDPOINT";
const GATEWAY_ENDPOINT_DEFAULT: &str = "https://mcp.albertlane.org/rpc";
const GATEWAY_API_KEY_ENV: &str = "LANE_MCP_API_KEY";

/// Structured response from lane_aer_write.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AerWriteResponse {
    pub status: String,
    pub namespace: String,
    pub key: String,
    #[serde(default)]
    pub version: Option<u32>,
    #[serde(default)]
    pub locales_written: Option<u32>,
    #[serde(default)]
    pub sec_ref: Option<String>,
}

/// Structured response from lane_aer_read.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AerReadResponse {
    pub status: String,
    pub namespace: String,
    pub key: String,
    #[serde(default)]
    pub value: Option<String>,
    #[serde(default)]
    pub version: Option<u32>,
    #[serde(default)]
    pub source_locale: Option<String>,
    #[serde(default)]
    pub sec_ref: Option<String>,
}

fn make_aer_client() -> McpClient {
    let endpoint = std::env::var(GATEWAY_ENDPOINT_ENV)
        .unwrap_or_else(|_| GATEWAY_ENDPOINT_DEFAULT.to_string());
    let client = McpClient::new(endpoint);
    match std::env::var(GATEWAY_API_KEY_ENV) {
        Ok(key) => client.with_api_key(key),
        Err(_) => client,
    }
}

fn parse_write(v: Value) -> Result<AerWriteResponse, String> {
    serde_json::from_value(v).map_err(|e| format!("aer_write response parse error: {e}"))
}

fn parse_read(v: Value) -> Result<AerReadResponse, String> {
    serde_json::from_value(v).map_err(|e| format!("aer_read response parse error: {e}"))
}

/// Write a value to both AER locales (D1 primary + R2 escape) via the
/// lane-mcp gateway's lane_aer_write tool.  Returns { status: "not_deployed" }
/// when the gateway hasn't gone live yet — callers should treat that as a
/// non-fatal degraded-mode condition, not an error.
#[tauri::command]
pub async fn aer_write(
    namespace: String,
    key: String,
    value: String,
) -> Result<AerWriteResponse, String> {
    let client = make_aer_client();
    let args = serde_json::json!({
        "namespace": namespace,
        "key": key,
        "value": value,
        "sec_ref": SEC_REF,
    });
    let raw = client
        .call_tool("lane_aer_write", args)
        .await
        .map_err(|e| e.to_string())?;
    parse_write(raw)
}

/// Read from AER: D1 primary locale first, R2 escape locale fallback.
/// Returns { status: "not_found" } when the key has never been written.
#[tauri::command]
pub async fn aer_read(namespace: String, key: String) -> Result<AerReadResponse, String> {
    let client = make_aer_client();
    let args = serde_json::json!({
        "namespace": namespace,
        "key": key,
    });
    let raw = client
        .call_tool("lane_aer_read", args)
        .await
        .map_err(|e| e.to_string())?;
    parse_read(raw)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn parse_write_success_v1() {
        let v = serde_json::json!({
            "status": "written",
            "namespace": "workbook",
            "key": "volume-1",
            "version": 1,
            "locales_written": 2,
            "sec_ref": "17684-273-411-436"
        });
        let r: AerWriteResponse = serde_json::from_value(v).unwrap();
        assert_eq!(r.status, "written");
        assert_eq!(r.version, Some(1));
        assert_eq!(r.locales_written, Some(2));
        assert_eq!(r.sec_ref.as_deref(), Some("17684-273-411-436"));
    }

    #[test]
    fn parse_write_not_deployed() {
        let v = serde_json::json!({
            "status": "not_deployed",
            "namespace": "workbook",
            "key": "volume-1"
        });
        let r: AerWriteResponse = serde_json::from_value(v).unwrap();
        assert_eq!(r.status, "not_deployed");
        assert_eq!(r.version, None);
        assert_eq!(r.locales_written, None);
        assert_eq!(r.sec_ref, None);
    }

    #[test]
    fn parse_write_version_increment() {
        let v = serde_json::json!({
            "status": "written",
            "namespace": "ns",
            "key": "k",
            "version": 3,
            "locales_written": 2,
            "sec_ref": "17684-273-411-436"
        });
        let r: AerWriteResponse = serde_json::from_value(v).unwrap();
        assert_eq!(r.version, Some(3));
    }

    #[test]
    fn parse_read_found_primary_locale() {
        let v = serde_json::json!({
            "status": "found",
            "namespace": "workbook",
            "key": "volume-1",
            "value": "{\"cells\":[]}",
            "version": 2,
            "source_locale": "primary",
            "sec_ref": "17684-273-411-436"
        });
        let r: AerReadResponse = serde_json::from_value(v).unwrap();
        assert_eq!(r.status, "found");
        assert_eq!(r.source_locale.as_deref(), Some("primary"));
        assert_eq!(r.value.as_deref(), Some("{\"cells\":[]}"));
        assert_eq!(r.sec_ref.as_deref(), Some("17684-273-411-436"));
    }

    #[test]
    fn parse_read_found_escape_locale() {
        let v = serde_json::json!({
            "status": "found",
            "namespace": "workbook",
            "key": "volume-1",
            "value": "{\"cells\":[]}",
            "version": 1,
            "source_locale": "escape",
            "sec_ref": "17684-273-411-436"
        });
        let r: AerReadResponse = serde_json::from_value(v).unwrap();
        assert_eq!(r.source_locale.as_deref(), Some("escape"));
    }

    #[test]
    fn parse_read_not_found() {
        let v = serde_json::json!({
            "status": "not_found",
            "namespace": "workbook",
            "key": "missing-key"
        });
        let r: AerReadResponse = serde_json::from_value(v).unwrap();
        assert_eq!(r.status, "not_found");
        assert_eq!(r.value, None);
        assert_eq!(r.version, None);
        assert_eq!(r.source_locale, None);
    }
}
