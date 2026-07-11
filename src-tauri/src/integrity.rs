// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-07-11 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use
// MH-P12-01: BLAKE3 content-hash manifest — filesystem integrity verified on boot.
//
// generate() walks a directory tree and computes a BLAKE3 hex digest for every
// regular file. verify() re-hashes and compares against a stored manifest.
// Manifests are JSON-serialized for human readability and R2-archive compatibility.
// Hidden directories and the manifest file itself are excluded from the walk.

use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io;
use std::path::Path;

/// A content-hash manifest: relative path → BLAKE3 hex digest.
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct Manifest {
    pub version: u8,
    pub root: String,
    pub entries: HashMap<String, String>,
}

/// Result of a manifest verification pass.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct VerifyResult {
    pub passed: bool,
    pub checked: usize,
    pub failed: Vec<String>,
    pub missing: Vec<String>,
}

fn hash_file(path: &Path) -> io::Result<String> {
    let bytes = std::fs::read(path)?;
    Ok(blake3::hash(&bytes).to_string())
}

fn walk(root: &Path, dir: &Path, entries: &mut HashMap<String, String>) -> io::Result<()> {
    for entry in std::fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let name = entry.file_name();
        let name_str = name.to_string_lossy();

        // Skip hidden dirs/files and the manifest itself.
        if name_str.starts_with('.') || name_str == "integrity.blake3.json" {
            continue;
        }
        if path.is_dir() {
            walk(root, &path, entries)?;
        } else if path.is_file() {
            let rel = path
                .strip_prefix(root)
                .map_err(|e| io::Error::other(e))?
                .to_string_lossy()
                .into_owned();
            entries.insert(rel, hash_file(&path)?);
        }
    }
    Ok(())
}

/// Walk `root` and compute a BLAKE3 manifest for all regular files.
pub fn generate(root: &Path) -> io::Result<Manifest> {
    let root = root.canonicalize()?;
    let mut entries = HashMap::new();
    walk(&root, &root, &mut entries)?;
    Ok(Manifest {
        version: 1,
        root: root.to_string_lossy().into_owned(),
        entries,
    })
}

/// Verify the files under `root` against an existing manifest.
pub fn verify(root: &Path, manifest: &Manifest) -> io::Result<VerifyResult> {
    let mut failed = Vec::new();
    let mut missing = Vec::new();
    let mut checked = 0;

    for (rel, expected) in &manifest.entries {
        let full = root.join(rel);
        if !full.exists() {
            missing.push(rel.clone());
            continue;
        }
        let actual = hash_file(&full)?;
        checked += 1;
        if actual != *expected {
            failed.push(rel.clone());
        }
    }

    Ok(VerifyResult {
        passed: failed.is_empty() && missing.is_empty(),
        checked,
        failed,
        missing,
    })
}

pub fn save_manifest(manifest: &Manifest, path: &Path) -> io::Result<()> {
    let json = serde_json::to_string_pretty(manifest).map_err(|e| io::Error::other(e))?;
    std::fs::write(path, json)
}

pub fn load_manifest(path: &Path) -> io::Result<Manifest> {
    let raw = std::fs::read_to_string(path)?;
    serde_json::from_str(&raw).map_err(|e| io::Error::other(e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write as _;

    fn tmp_dir(tag: &str) -> PathBuf {
        let pid = std::process::id();
        let dir = std::env::temp_dir().join(format!("mh_integrity_{tag}_{pid}"));
        let _ = std::fs::remove_dir_all(&dir);
        std::fs::create_dir_all(&dir).unwrap();
        dir
    }

    fn write_file(dir: &Path, name: &str, contents: &[u8]) {
        let path = dir.join(name);
        if let Some(p) = path.parent() {
            std::fs::create_dir_all(p).unwrap();
        }
        let mut f = std::fs::File::create(path).unwrap();
        f.write_all(contents).unwrap();
    }

    #[test]
    fn generate_and_verify_clean() {
        let dir = tmp_dir("clean");
        write_file(&dir, "a.txt", b"hello");
        write_file(&dir, "b.txt", b"world");
        let manifest = generate(&dir).unwrap();
        assert_eq!(manifest.entries.len(), 2);
        assert_eq!(manifest.version, 1);
        let result = verify(&dir, &manifest).unwrap();
        assert!(result.passed);
        assert_eq!(result.checked, 2);
        assert!(result.failed.is_empty());
        assert!(result.missing.is_empty());
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn verify_detects_tamper() {
        let dir = tmp_dir("tamper");
        write_file(&dir, "secret.txt", b"original");
        let manifest = generate(&dir).unwrap();
        write_file(&dir, "secret.txt", b"tampered!");
        let result = verify(&dir, &manifest).unwrap();
        assert!(!result.passed);
        assert_eq!(result.failed.len(), 1);
        assert!(result.missing.is_empty());
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn verify_detects_missing() {
        let dir = tmp_dir("missing");
        write_file(&dir, "keep.txt", b"kept");
        write_file(&dir, "gone.txt", b"gone");
        let manifest = generate(&dir).unwrap();
        std::fs::remove_file(dir.join("gone.txt")).unwrap();
        let result = verify(&dir, &manifest).unwrap();
        assert!(!result.passed);
        assert_eq!(result.missing.len(), 1);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn manifest_json_roundtrip() {
        let dir = tmp_dir("roundtrip");
        write_file(&dir, "data.xml", b"<root/>");
        let manifest = generate(&dir).unwrap();
        let manifest_path = dir.join("integrity.blake3.json");
        save_manifest(&manifest, &manifest_path).unwrap();
        let loaded = load_manifest(&manifest_path).unwrap();
        assert_eq!(loaded.entries, manifest.entries);
        assert_eq!(loaded.version, 1);
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn skips_hidden_dirs_and_manifest_file() {
        let dir = tmp_dir("hidden");
        std::fs::create_dir(dir.join(".git")).unwrap();
        write_file(&dir.join(".git"), "HEAD", b"ref: refs/heads/main");
        write_file(&dir, "visible.txt", b"visible");
        // The manifest file itself must also be excluded.
        write_file(&dir, "integrity.blake3.json", b"{}");
        let manifest = generate(&dir).unwrap();
        assert_eq!(manifest.entries.len(), 1);
        assert!(manifest.entries.contains_key("visible.txt"));
        std::fs::remove_dir_all(dir).unwrap();
    }

    #[test]
    fn same_content_same_hash() {
        let dir = tmp_dir("deterministic");
        write_file(&dir, "a.txt", b"hello");
        let m1 = generate(&dir).unwrap();
        let m2 = generate(&dir).unwrap();
        assert_eq!(m1.entries["a.txt"], m2.entries["a.txt"]);
        std::fs::remove_dir_all(dir).unwrap();
    }
}
