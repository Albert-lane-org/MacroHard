// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-09 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MH-P10-01: MCP module host — registry, capability gating, install UX.
//
// Phase 8/9's module_list/module_call_tool read config/modules.json ad hoc
// and forwarded any (module, tool) pair to that module's endpoint with no
// validation at all — a module Worker returning a tool name MacroHarder
// never declared would still get dispatched. This module makes the
// registry a real data structure with two enforced invariants:
//   1. A tool call is only dispatched if the target module actually
//      declares that tool in its manifest.
//   2. A module marked `read_only` cannot be used to call anything that
//      looks like a write operation (name-based heuristic; modules declare
//      their own capability, this is defense in depth, not the only gate).
// It also adds install/uninstall so a module doesn't have to be hand-edited
// into modules.json to be usable.

use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ModuleCapability {
    ReadOnly,
    ReadWrite,
}

#[derive(Debug, Clone, Copy, PartialEq, Eq, Serialize, Deserialize, Default)]
#[serde(rename_all = "snake_case")]
pub enum ModuleSource {
    #[default]
    BuiltIn,
    UserInstalled,
}

#[derive(Debug, Clone, PartialEq, Serialize, Deserialize)]
pub struct ModuleManifest {
    pub name: String,
    #[serde(default)]
    pub dashboard_order: u32,
    pub endpoint: String,
    #[serde(default)]
    pub endpoint_dev: String,
    #[serde(default)]
    pub status: String,
    pub capability: ModuleCapability,
    pub tools: Vec<String>,
    #[serde(default)]
    pub resources: Vec<String>,
    #[serde(default)]
    pub panels: Vec<String>,
    #[serde(default)]
    pub source: ModuleSource,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct ModuleRegistry {
    pub modules: Vec<ModuleManifest>,
}

#[derive(Debug, thiserror::Error)]
pub enum RegistryError {
    #[error("module '{0}' not found")]
    NotFound(String),
    #[error("module '{0}' already installed")]
    AlreadyInstalled(String),
    #[error("invalid module manifest: {0}")]
    InvalidManifest(String),
    #[error("tool '{tool}' is not declared by module '{module}'")]
    ToolNotDeclared { module: String, tool: String },
    #[error("module '{module}' is read_only; '{tool}' looks like a write operation")]
    WriteNotPermitted { module: String, tool: String },
    #[error("io error: {0}")]
    Io(String),
    #[error("serde error: {0}")]
    Serde(String),
}

/// Tool names containing any of these look like mutations. Heuristic, not
/// authoritative — the module's own `capability` field is the real gate;
/// this catches the case where a read_only module's manifest is wrong.
const WRITE_LIKE: &[&str] = &["submit", "create", "update", "delete", "write", "publish", "subscribe", "revoke"];

fn looks_like_write(tool: &str) -> bool {
    let lower = tool.to_lowercase();
    WRITE_LIKE.iter().any(|p| lower.contains(p))
}

impl ModuleRegistry {
    pub fn load_from_path(path: &Path) -> Result<Self, RegistryError> {
        let raw = std::fs::read_to_string(path).map_err(|e| RegistryError::Io(e.to_string()))?;
        serde_json::from_str(&raw).map_err(|e| RegistryError::Serde(e.to_string()))
    }

    pub fn save_to_path(&self, path: &Path) -> Result<(), RegistryError> {
        let json = serde_json::to_string_pretty(self).map_err(|e| RegistryError::Serde(e.to_string()))?;
        std::fs::write(path, json).map_err(|e| RegistryError::Io(e.to_string()))
    }

    pub fn get(&self, name: &str) -> Result<&ModuleManifest, RegistryError> {
        self.modules
            .iter()
            .find(|m| m.name == name)
            .ok_or_else(|| RegistryError::NotFound(name.to_string()))
    }

    fn validate(manifest: &ModuleManifest) -> Result<(), RegistryError> {
        if manifest.name.trim().is_empty() {
            return Err(RegistryError::InvalidManifest("name is empty".into()));
        }
        if manifest.endpoint.trim().is_empty() {
            return Err(RegistryError::InvalidManifest("endpoint is empty".into()));
        }
        if manifest.tools.is_empty() {
            return Err(RegistryError::InvalidManifest("tools list is empty".into()));
        }
        Ok(())
    }

    pub fn install(&mut self, manifest: ModuleManifest) -> Result<(), RegistryError> {
        Self::validate(&manifest)?;
        if self.modules.iter().any(|m| m.name == manifest.name) {
            return Err(RegistryError::AlreadyInstalled(manifest.name));
        }
        self.modules.push(manifest);
        Ok(())
    }

    pub fn uninstall(&mut self, name: &str) -> Result<(), RegistryError> {
        let idx = self
            .modules
            .iter()
            .position(|m| m.name == name)
            .ok_or_else(|| RegistryError::NotFound(name.to_string()))?;
        self.modules.remove(idx);
        Ok(())
    }

    /// Capability gate: may `module` be dispatched a call to `tool`?
    /// Returns the manifest (so the caller can read its endpoint) on success.
    pub fn authorize_tool_call(&self, module: &str, tool: &str) -> Result<&ModuleManifest, RegistryError> {
        let entry = self.get(module)?;
        if !entry.tools.iter().any(|t| t == tool) {
            return Err(RegistryError::ToolNotDeclared {
                module: module.to_string(),
                tool: tool.to_string(),
            });
        }
        if entry.capability == ModuleCapability::ReadOnly && looks_like_write(tool) {
            return Err(RegistryError::WriteNotPermitted {
                module: module.to_string(),
                tool: tool.to_string(),
            });
        }
        Ok(entry)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn manifest(name: &str, capability: ModuleCapability, tools: &[&str]) -> ModuleManifest {
        ModuleManifest {
            name: name.to_string(),
            dashboard_order: 1,
            endpoint: format!("https://{name}.example.workers.dev"),
            endpoint_dev: format!("http://127.0.0.1:8787"),
            status: "code_ready_deploy_blocked".to_string(),
            capability,
            tools: tools.iter().map(|t| t.to_string()).collect(),
            resources: vec![],
            panels: vec![],
            source: ModuleSource::BuiltIn,
        }
    }

    #[test]
    fn install_valid_manifest_succeeds() {
        let mut reg = ModuleRegistry::default();
        assert!(reg
            .install(manifest("procurement", ModuleCapability::ReadOnly, &["procurement_query"]))
            .is_ok());
        assert_eq!(reg.modules.len(), 1);
    }

    #[test]
    fn install_empty_name_fails() {
        let mut reg = ModuleRegistry::default();
        let err = reg
            .install(manifest("", ModuleCapability::ReadOnly, &["x"]))
            .unwrap_err();
        assert!(matches!(err, RegistryError::InvalidManifest(_)));
    }

    #[test]
    fn install_no_tools_fails() {
        let mut reg = ModuleRegistry::default();
        let err = reg
            .install(manifest("m", ModuleCapability::ReadOnly, &[]))
            .unwrap_err();
        assert!(matches!(err, RegistryError::InvalidManifest(_)));
    }

    #[test]
    fn install_duplicate_name_fails() {
        let mut reg = ModuleRegistry::default();
        reg.install(manifest("m", ModuleCapability::ReadOnly, &["a"])).unwrap();
        let err = reg
            .install(manifest("m", ModuleCapability::ReadOnly, &["b"]))
            .unwrap_err();
        assert!(matches!(err, RegistryError::AlreadyInstalled(_)));
    }

    #[test]
    fn uninstall_removes_module() {
        let mut reg = ModuleRegistry::default();
        reg.install(manifest("m", ModuleCapability::ReadOnly, &["a"])).unwrap();
        reg.uninstall("m").unwrap();
        assert!(reg.modules.is_empty());
    }

    #[test]
    fn uninstall_missing_module_fails() {
        let mut reg = ModuleRegistry::default();
        let err = reg.uninstall("nope").unwrap_err();
        assert!(matches!(err, RegistryError::NotFound(_)));
    }

    #[test]
    fn authorize_declared_read_tool_succeeds() {
        let mut reg = ModuleRegistry::default();
        reg.install(manifest("procurement", ModuleCapability::ReadOnly, &["procurement_query"]))
            .unwrap();
        assert!(reg.authorize_tool_call("procurement", "procurement_query").is_ok());
    }

    #[test]
    fn authorize_undeclared_tool_fails() {
        let mut reg = ModuleRegistry::default();
        reg.install(manifest("procurement", ModuleCapability::ReadOnly, &["procurement_query"]))
            .unwrap();
        let err = reg.authorize_tool_call("procurement", "procurement_delete_all").unwrap_err();
        assert!(matches!(err, RegistryError::ToolNotDeclared { .. }));
    }

    #[test]
    fn authorize_write_like_tool_on_read_only_module_fails() {
        let mut reg = ModuleRegistry::default();
        // Manifest claims read_only but (incorrectly) declares a write-shaped tool.
        reg.install(manifest("procurement", ModuleCapability::ReadOnly, &["procurement_submit_permit"]))
            .unwrap();
        let err = reg.authorize_tool_call("procurement", "procurement_submit_permit").unwrap_err();
        assert!(matches!(err, RegistryError::WriteNotPermitted { .. }));
    }

    #[test]
    fn authorize_write_like_tool_on_read_write_module_succeeds() {
        let mut reg = ModuleRegistry::default();
        reg.install(manifest("civic", ModuleCapability::ReadWrite, &["civic_submit_filing"]))
            .unwrap();
        assert!(reg.authorize_tool_call("civic", "civic_submit_filing").is_ok());
    }

    #[test]
    fn authorize_unknown_module_fails() {
        let reg = ModuleRegistry::default();
        let err = reg.authorize_tool_call("ghost", "ghost_tool").unwrap_err();
        assert!(matches!(err, RegistryError::NotFound(_)));
    }

    #[test]
    fn save_and_load_roundtrip() {
        let mut reg = ModuleRegistry::default();
        reg.install(manifest("maps", ModuleCapability::ReadOnly, &["maps_query", "maps_tile"]))
            .unwrap();
        let tmp = std::env::temp_dir().join(format!("mh-registry-test-{}.json", std::process::id()));
        reg.save_to_path(&tmp).unwrap();
        let loaded = ModuleRegistry::load_from_path(&tmp).unwrap();
        std::fs::remove_file(&tmp).ok();
        assert_eq!(loaded.modules.len(), 1);
        assert_eq!(loaded.modules[0].name, "maps");
        assert_eq!(loaded.modules[0].tools.len(), 2);
    }
}
