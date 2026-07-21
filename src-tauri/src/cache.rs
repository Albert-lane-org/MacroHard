// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-21 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MH-P14-05: lane-mcp data cache — pre-fetches all lane-mcp tools on startup
// and refreshes on a configurable interval. Serves stale data on degradation
// rather than failing. D1 persistence for offline availability.

use serde::{Deserialize, Serialize};
use serde_json::Value;
use std::collections::HashMap;
use std::sync::{Arc, Mutex};
use std::time::{Duration, Instant};

/// Tools that are session-sensitive — never auto-cached.
const SKIP_CACHE: &[&str] = &["lane_identity_enroll", "lane_identity_verify", "lane_identity_revoke", "lane_aer_write", "lane_aer_read"];

pub const DEFAULT_TTL_SECS: u64 = 60;

#[derive(Debug, Clone)]
pub struct CachedValue {
    pub result: Value,
    pub fetched_at: Instant,
    pub ttl: Duration,
}

impl CachedValue {
    pub fn is_stale(&self) -> bool {
        self.fetched_at.elapsed() > self.ttl
    }

    pub fn age_seconds(&self) -> u64 {
        self.fetched_at.elapsed().as_secs()
    }
}

/// In-memory cache of lane-mcp tool results, keyed by tool name.
/// D1 persistence is handled externally (see `McpCacheEntry` for the wire format).
pub struct McpCache {
    entries: HashMap<String, CachedValue>,
    broadcast_count: u64,
    refresh_errors: u64,
    pub ttl: Duration,
}

/// Serializable entry for D1 persistence.
#[derive(Debug, Serialize, Deserialize)]
pub struct McpCacheEntry {
    pub key: String,
    pub value: Value,
    pub fetched_at_unix: u64,
    pub ttl_seconds: u64,
}

impl McpCache {
    pub fn new(ttl_secs: u64) -> Self {
        Self {
            entries: HashMap::new(),
            broadcast_count: 0,
            refresh_errors: 0,
            ttl: Duration::from_secs(ttl_secs),
        }
    }

    /// Insert or update a cache entry.
    pub fn set(&mut self, key: impl Into<String>, result: Value) {
        let ttl = self.ttl;
        self.entries.insert(
            key.into(),
            CachedValue { result, fetched_at: Instant::now(), ttl },
        );
    }

    /// Get a cached value. Returns the entry regardless of staleness so callers
    /// can decide how to handle it.
    pub fn get(&self, key: &str) -> Option<&CachedValue> {
        self.entries.get(key)
    }

    /// Returns true if the key is not present or its TTL has expired.
    pub fn needs_refresh(&self, key: &str) -> bool {
        self.entries.get(key).map_or(true, |e| e.is_stale())
    }

    pub fn entry_count(&self) -> usize {
        self.entries.len()
    }

    pub fn stale_count(&self) -> usize {
        self.entries.values().filter(|e| e.is_stale()).count()
    }

    pub fn record_refresh(&mut self) {
        self.broadcast_count += 1;
    }

    pub fn record_error(&mut self) {
        self.refresh_errors += 1;
    }

    /// Summary stats for `cache_status()` Tauri command.
    pub fn status(&self) -> Value {
        let entries: Vec<Value> = self
            .entries
            .iter()
            .map(|(k, v)| {
                serde_json::json!({
                    "tool": k,
                    "age_seconds": v.age_seconds(),
                    "stale": v.is_stale(),
                })
            })
            .collect();
        serde_json::json!({
            "entry_count": self.entry_count(),
            "stale_count": self.stale_count(),
            "refresh_count": self.broadcast_count,
            "error_count": self.refresh_errors,
            "ttl_seconds": self.ttl.as_secs(),
            "entries": entries,
        })
    }

    /// Export all entries to wire format for D1 persistence.
    pub fn export(&self) -> Vec<McpCacheEntry> {
        use std::time::{SystemTime, UNIX_EPOCH};
        let now_unix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        self.entries
            .iter()
            .map(|(k, v)| McpCacheEntry {
                key: k.clone(),
                value: v.result.clone(),
                fetched_at_unix: now_unix.saturating_sub(v.age_seconds()),
                ttl_seconds: v.ttl.as_secs(),
            })
            .collect()
    }

    /// Load entries from wire format (D1 restore on startup).
    pub fn import(&mut self, entries: Vec<McpCacheEntry>) {
        use std::time::{SystemTime, UNIX_EPOCH};
        let now_unix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        for entry in entries {
            let age_secs = now_unix.saturating_sub(entry.fetched_at_unix);
            if age_secs > 86_400 {
                continue; // discard anything older than 24h
            }
            let ttl = Duration::from_secs(entry.ttl_seconds);
            let fetched_at = Instant::now() - Duration::from_secs(age_secs);
            self.entries.insert(
                entry.key,
                CachedValue { result: entry.value, fetched_at, ttl },
            );
        }
    }

    /// Whether a tool name should be skipped for auto-caching.
    pub fn should_skip(tool: &str) -> bool {
        SKIP_CACHE.contains(&tool)
    }
}

pub type SharedMcpCache = Arc<Mutex<McpCache>>;

/// Build a stale-annotated result from a cached value for graceful degradation.
pub fn stale_result(entry: &CachedValue) -> Value {
    let mut r = entry.result.clone();
    if let Some(obj) = r.as_object_mut() {
        obj.insert(
            "_cache".to_string(),
            serde_json::json!({ "stale": true, "age_seconds": entry.age_seconds() }),
        );
    }
    r
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;

    #[test]
    fn set_and_get_cache_entry() {
        let mut cache = McpCache::new(60);
        cache.set("lane_monitoring_health", json!({"status": "ok"}));
        let entry = cache.get("lane_monitoring_health").unwrap();
        assert_eq!(entry.result["status"], "ok");
    }

    #[test]
    fn fresh_entry_is_not_stale() {
        let mut cache = McpCache::new(60);
        cache.set("tool_a", json!({"data": 1}));
        assert!(!cache.get("tool_a").unwrap().is_stale());
    }

    #[test]
    fn missing_key_needs_refresh() {
        let cache = McpCache::new(60);
        assert!(cache.needs_refresh("nonexistent"));
    }

    #[test]
    fn present_fresh_key_does_not_need_refresh() {
        let mut cache = McpCache::new(60);
        cache.set("lane_monitoring_stats", json!({"requests": 0}));
        assert!(!cache.needs_refresh("lane_monitoring_stats"));
    }

    #[test]
    fn skip_cache_blocks_session_sensitive_tools() {
        assert!(McpCache::should_skip("lane_identity_enroll"));
        assert!(McpCache::should_skip("lane_aer_write"));
        assert!(!McpCache::should_skip("lane_monitoring_health"));
    }

    #[test]
    fn status_reflects_entry_count() {
        let mut cache = McpCache::new(60);
        cache.set("t1", json!(null));
        cache.set("t2", json!(null));
        let status = cache.status();
        assert_eq!(status["entry_count"], 2);
        assert_eq!(status["stale_count"], 0);
    }

    #[test]
    fn export_and_import_roundtrip() {
        let mut cache = McpCache::new(60);
        cache.set("lane_civic_sos_query", json!({"result": "test"}));
        let exported = cache.export();
        assert_eq!(exported.len(), 1);

        let mut cache2 = McpCache::new(60);
        cache2.import(exported);
        let entry = cache2.get("lane_civic_sos_query").unwrap();
        assert_eq!(entry.result["result"], "test");
    }

    #[test]
    fn import_discards_stale_entries_over_24h() {
        use std::time::{SystemTime, UNIX_EPOCH};
        let now_unix = SystemTime::now()
            .duration_since(UNIX_EPOCH)
            .unwrap_or_default()
            .as_secs();
        let entries = vec![McpCacheEntry {
            key: "old_tool".to_string(),
            value: json!({"data": "old"}),
            fetched_at_unix: now_unix - 90_000, // 25h ago
            ttl_seconds: 60,
        }];
        let mut cache = McpCache::new(60);
        cache.import(entries);
        assert!(cache.get("old_tool").is_none());
    }

    #[test]
    fn stale_result_adds_cache_metadata() {
        let entry = CachedValue {
            result: json!({"tool": "data"}),
            fetched_at: Instant::now() - Duration::from_secs(120),
            ttl: Duration::from_secs(60),
        };
        let r = stale_result(&entry);
        assert!(r["_cache"]["stale"].as_bool().unwrap_or(false));
    }

    #[test]
    fn record_refresh_and_error_counters() {
        let mut cache = McpCache::new(60);
        cache.record_refresh();
        cache.record_refresh();
        cache.record_error();
        let status = cache.status();
        assert_eq!(status["refresh_count"], 2);
        assert_eq!(status["error_count"], 1);
    }
}
