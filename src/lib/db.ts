// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-27 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use

import { generateId, nowIso } from './utils.js';

export interface AuditRow {
  id: string;
  artifact_url: string | null;
  token_snapshot: string;
  standard_version: string;
  score_total: number;
  score_colors: number;
  score_typography: number;
  score_spacing: number;
  score_3d: number;
  status: string;
  result_sha256: string;
  submitted_at: string;
  auditor: string;
}

export async function insertAudit(
  db: D1Database,
  row: Omit<AuditRow, 'id' | 'submitted_at'>,
): Promise<AuditRow> {
  const full: AuditRow = { ...row, id: generateId(), submitted_at: nowIso() };
  await db
    .prepare(
      `INSERT INTO audit_results
       (id, artifact_url, token_snapshot, standard_version,
        score_total, score_colors, score_typography, score_spacing, score_3d,
        status, result_sha256, submitted_at, auditor)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .bind(
      full.id,
      full.artifact_url,
      full.token_snapshot,
      full.standard_version,
      full.score_total,
      full.score_colors,
      full.score_typography,
      full.score_spacing,
      full.score_3d,
      full.status,
      full.result_sha256,
      full.submitted_at,
      full.auditor,
    )
    .run();
  return full;
}

export async function getAudit(db: D1Database, id: string): Promise<AuditRow | null> {
  return db
    .prepare('SELECT * FROM audit_results WHERE id = ?')
    .bind(id)
    .first<AuditRow>();
}

export async function listAudits(
  db: D1Database,
  limit = 20,
  offset = 0,
): Promise<AuditRow[]> {
  const result = await db
    .prepare(
      'SELECT * FROM audit_results ORDER BY submitted_at DESC LIMIT ? OFFSET ?',
    )
    .bind(limit, offset)
    .all<AuditRow>();
  return result.results;
}
