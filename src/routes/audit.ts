// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-27 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use

import type { Env } from '../worker.js';
import { DESIGN_TOKENS } from '../data/tokens.js';
import { computeScore } from '../lib/audit_engine.js';
import { insertAudit, getAudit, listAudits } from '../lib/db.js';
import { jsonResponse, errorResponse, sha256hex } from '../lib/utils.js';

export async function handleAudit(request: Request, env: Env, path: string): Promise<Response> {
  const method = request.method;

  // GET /api/audit/history
  if (path === '/api/audit/history' && method === 'GET') {
    const url = new URL(request.url);
    const limit = Math.min(parseInt(url.searchParams.get('limit') ?? '20'), 100);
    const offset = parseInt(url.searchParams.get('offset') ?? '0');
    const audits = await listAudits(env.DB, limit, offset);
    return jsonResponse({ audits, limit, offset, count: audits.length });
  }

  // GET /api/audit/:id
  const match = path.match(/^\/api\/audit\/([^/]+)$/);
  if (match && method === 'GET') {
    const audit = await getAudit(env.DB, match[1] ?? '');
    if (!audit) return errorResponse('Audit not found', 'NOT_FOUND', 404);
    return jsonResponse(audit);
  }

  // POST /api/audit
  if (path === '/api/audit' && method === 'POST') {
    let body: { token_json?: Record<string, unknown>; artifact_url?: string } = {};
    try {
      const text = await request.text();
      if (text) body = JSON.parse(text);
    } catch {
      return errorResponse('Invalid JSON body', 'BAD_REQUEST', 400);
    }

    const tokens = body.token_json ?? (DESIGN_TOKENS as unknown as Record<string, unknown>);
    const result = computeScore(tokens);
    const hash = await sha256hex(JSON.stringify(result));

    const row = await insertAudit(env.DB, {
      artifact_url: body.artifact_url ?? null,
      token_snapshot: JSON.stringify(tokens),
      standard_version: '3D-v1',
      score_total: result.total,
      score_colors: result.scores.colors,
      score_typography: result.scores.typography,
      score_spacing: result.scores.spacing,
      score_3d: result.scores['3d-standard'],
      status: result.status,
      result_sha256: hash,
      auditor: 'auto',
    });

    return jsonResponse({ id: row.id, ...result, result_sha256: hash, submitted_at: row.submitted_at }, 201);
  }

  return errorResponse('Method not allowed', 'METHOD_NOT_ALLOWED', 405);
}
