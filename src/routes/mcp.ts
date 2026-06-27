// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-27
// JSON-RPC 2.0 dispatcher — lane_macrohard_* MCP tools

import type { Env } from '../worker.js';
import { DESIGN_TOKENS } from '../data/tokens.js';
import { computeScore } from '../lib/audit_engine.js';
import { insertAudit, getAudit, listAudits } from '../lib/db.js';
import { jsonResponse, sha256hex } from '../lib/utils.js';

interface JrpcRequest {
  jsonrpc: string;
  id: string | number;
  method: string;
  params?: Record<string, unknown>;
}

function rpcOk(id: string | number, result: unknown): Response {
  return jsonResponse({ jsonrpc: '2.0', id, result });
}

function rpcErr(id: string | number | null, code: number, message: string): Response {
  return jsonResponse({ jsonrpc: '2.0', id, error: { code, message } });
}

export async function handleMcp(request: Request, env: Env): Promise<Response> {
  let body: JrpcRequest;
  try {
    body = await request.json<JrpcRequest>();
  } catch {
    return rpcErr(null, -32700, 'Parse error');
  }

  if (body.jsonrpc !== '2.0' || !body.method) {
    return rpcErr(body.id ?? null, -32600, 'Invalid request');
  }

  const { id, method, params = {} } = body;

  switch (method) {
    case 'lane_macrohard_audit': {
      const tokens =
        (params['token_json'] as Record<string, unknown> | undefined) ??
        (DESIGN_TOKENS as unknown as Record<string, unknown>);
      const result = computeScore(tokens);
      const hash = await sha256hex(JSON.stringify(result));
      const row = await insertAudit(env.DB, {
        artifact_url: (params['artifact_url'] as string | undefined) ?? null,
        token_snapshot: JSON.stringify(tokens),
        standard_version: '3D-v1',
        score_total: result.total,
        score_colors: result.scores.colors,
        score_typography: result.scores.typography,
        score_spacing: result.scores.spacing,
        score_3d: result.scores['3d-standard'],
        status: result.status,
        result_sha256: hash,
        auditor: 'mcp',
      });
      return rpcOk(id, { id: row.id, ...result, result_sha256: hash, submitted_at: row.submitted_at });
    }

    case 'lane_macrohard_token': {
      const tokenId = params['token_id'] as string | undefined;
      if (!tokenId) return rpcErr(id, -32602, 'token_id required');
      const [category, name] = tokenId.split('.');
      const cat = (DESIGN_TOKENS as Record<string, unknown>)[category ?? ''];
      if (!cat || typeof cat !== 'object') return rpcErr(id, -32602, 'Token not found');
      const value = (cat as Record<string, unknown>)[name ?? ''];
      if (value === undefined) return rpcErr(id, -32602, 'Token not found');
      return rpcOk(id, { id: tokenId, category, name, value });
    }

    case 'lane_macrohard_audit_history': {
      const limit = Math.min(Number(params['limit'] ?? 10), 50);
      const audits = await listAudits(env.DB, limit);
      return rpcOk(id, { audits, count: audits.length });
    }

    case 'lane_macrohard_audit_get': {
      const auditId = params['audit_id'] as string | undefined;
      if (!auditId) return rpcErr(id, -32602, 'audit_id required');
      const audit = await getAudit(env.DB, auditId);
      if (!audit) return rpcErr(id, -32602, 'Audit not found');
      return rpcOk(id, audit);
    }

    default:
      return rpcErr(id, -32601, `Method not found: ${method}`);
  }
}
