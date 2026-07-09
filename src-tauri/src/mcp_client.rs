// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-09
// MH-P8-02/03: generic MCP JSON-RPC 2.0 HTTP client.
// MacroHarder is an ordinary MCP client of each module's Cloudflare Worker
// (procurement, maps) — no lane-mcp gateway in this path (standalone
// boundary; see lane-mcp CLAUDE.md).

use serde::{Deserialize, Serialize};
use serde_json::Value;

#[derive(Debug, thiserror::Error)]
pub enum McpClientError {
    #[error("request failed: {0}")]
    Request(String),
    #[error("module returned an error: {code} {message}")]
    Rpc { code: i64, message: String },
    #[error("malformed response: {0}")]
    Malformed(String),
}

#[derive(Debug, Serialize)]
struct JsonRpcRequest<'a> {
    jsonrpc: &'static str,
    id: u32,
    method: &'a str,
    #[serde(skip_serializing_if = "Option::is_none")]
    params: Option<Value>,
}

#[derive(Debug, Deserialize)]
struct JsonRpcResponse {
    #[serde(default)]
    result: Option<Value>,
    #[serde(default)]
    error: Option<JsonRpcErrorBody>,
}

#[derive(Debug, Deserialize)]
struct JsonRpcErrorBody {
    code: i64,
    message: String,
}

/// A thin MCP client bound to one module's Worker URL.
pub struct McpClient {
    endpoint: String,
    http: reqwest::Client,
}

impl McpClient {
    pub fn new(endpoint: impl Into<String>) -> Self {
        Self {
            endpoint: endpoint.into(),
            http: reqwest::Client::new(),
        }
    }

    async fn call(&self, method: &str, params: Option<Value>) -> Result<Value, McpClientError> {
        let req = JsonRpcRequest {
            jsonrpc: "2.0",
            id: 1,
            method,
            params,
        };

        let resp = self
            .http
            .post(&self.endpoint)
            .json(&req)
            .send()
            .await
            .map_err(|e| McpClientError::Request(e.to_string()))?;

        let body: JsonRpcResponse = resp
            .json()
            .await
            .map_err(|e| McpClientError::Malformed(e.to_string()))?;

        if let Some(err) = body.error {
            return Err(McpClientError::Rpc {
                code: err.code,
                message: err.message,
            });
        }

        body.result
            .ok_or_else(|| McpClientError::Malformed("response had neither result nor error".into()))
    }

    /// MCP `initialize` — returns serverInfo/capabilities.
    pub async fn initialize(&self) -> Result<Value, McpClientError> {
        self.call("initialize", None).await
    }

    /// MCP `tools/list` — returns the module's tool manifest.
    pub async fn list_tools(&self) -> Result<Value, McpClientError> {
        self.call("tools/list", None).await
    }

    /// MCP `tools/call` — invoke a named tool with JSON arguments.
    pub async fn call_tool(&self, name: &str, arguments: Value) -> Result<Value, McpClientError> {
        let params = serde_json::json!({ "name": name, "arguments": arguments });
        self.call("tools/call", Some(params)).await
    }

    /// MCP `resources/read` — fetch a named resource.
    pub async fn read_resource(&self, uri: &str) -> Result<Value, McpClientError> {
        let params = serde_json::json!({ "uri": uri });
        self.call("resources/read", Some(params)).await
    }
}
