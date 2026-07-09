-- MacroHard Design Studio — D1 Schema
-- Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-27 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use

CREATE TABLE IF NOT EXISTS audit_results (
  id TEXT PRIMARY KEY,
  artifact_url TEXT,
  token_snapshot TEXT NOT NULL,
  standard_version TEXT NOT NULL DEFAULT '3D-v1',
  score_total REAL NOT NULL,
  score_colors REAL NOT NULL,
  score_typography REAL NOT NULL,
  score_spacing REAL NOT NULL,
  score_3d REAL NOT NULL,
  status TEXT NOT NULL,
  result_sha256 TEXT NOT NULL,
  submitted_at TEXT NOT NULL,
  auditor TEXT NOT NULL DEFAULT 'auto'
);

CREATE INDEX IF NOT EXISTS idx_audit_submitted ON audit_results(submitted_at DESC);
CREATE INDEX IF NOT EXISTS idx_audit_status ON audit_results(status);
