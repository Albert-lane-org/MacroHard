// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-27
// MacroHard Design Studio — Cloudflare Worker entry point

import type { D1Database, R2Bucket } from '@cloudflare/workers-types';
import { requireAuth } from './middleware/auth.js';
import { handleTokens } from './routes/tokens.js';
import { handleAudit } from './routes/audit.js';
import { handleMcp } from './routes/mcp.js';
import { jsonResponse, errorResponse } from './lib/utils.js';

export interface Env {
  DB: D1Database;
  DESIGN_ASSETS: R2Bucket;
  API_KEY: string;
}

const DASHBOARD_HTML = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>MacroHard Design Studio</title>
  <style>
    :root {
      --color-bg: #0A1628;
      --color-surface: #0D1F3C;
      --color-surface-2: #162944;
      --color-border: #1E3A5F;
      --color-accent: #00D4FF;
      --color-text: #E8F4FD;
      --color-text-dim: #7BA7CC;
      --color-success: #00C896;
      --color-warn: #FF6B35;
      --font-mono: 'JetBrains Mono', 'Fira Code', monospace;
      --font-sans: 'Inter', 'Segoe UI', system-ui, sans-serif;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--color-bg);
      color: var(--color-text);
      font-family: var(--font-sans);
      min-height: 100vh;
      padding: 40px 24px;
    }
    .header {
      border-bottom: 1px solid var(--color-border);
      padding-bottom: 24px;
      margin-bottom: 32px;
    }
    h1 {
      font-size: 32px;
      font-weight: 700;
      letter-spacing: -0.5px;
      color: var(--color-text);
    }
    h1 span { color: var(--color-accent); }
    .subtitle {
      color: var(--color-text-dim);
      font-size: 14px;
      margin-top: 6px;
      font-family: var(--font-mono);
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
      gap: 16px;
      margin-bottom: 32px;
    }
    .card {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 20px;
      box-shadow: 4px 4px 0px #040B14, 8px 8px 0px rgba(4,11,20,0.5);
    }
    .card h2 {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-dim);
      text-transform: uppercase;
      letter-spacing: 1px;
      margin-bottom: 12px;
      font-family: var(--font-mono);
    }
    .card .value {
      font-size: 26px;
      font-weight: 700;
      color: var(--color-accent);
      font-family: var(--font-mono);
    }
    .endpoints {
      background: var(--color-surface);
      border: 1px solid var(--color-border);
      border-radius: 10px;
      padding: 24px;
    }
    .endpoints h2 {
      font-size: 17px;
      font-weight: 600;
      margin-bottom: 16px;
    }
    .ep {
      display: flex;
      align-items: center;
      gap: 12px;
      padding: 10px 0;
      border-bottom: 1px solid var(--color-border);
      font-family: var(--font-mono);
      font-size: 13px;
    }
    .ep:last-child { border-bottom: none; }
    .method {
      background: var(--color-surface-2);
      border: 1px solid var(--color-border);
      border-radius: 4px;
      padding: 2px 8px;
      font-size: 11px;
      font-weight: 700;
      color: var(--color-accent);
      min-width: 48px;
      text-align: center;
    }
    .method.post { color: var(--color-warn); }
    .ep .path { color: var(--color-text); }
    .ep .desc { color: var(--color-text-dim); margin-left: auto; font-size: 11px; }
    .badge {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 11px;
      font-weight: 600;
      background: rgba(0,200,150,0.15);
      color: var(--color-success);
      font-family: var(--font-mono);
    }
    footer {
      margin-top: 40px;
      color: var(--color-text-dim);
      font-size: 12px;
      font-family: var(--font-mono);
    }
  </style>
</head>
<body>
  <div class="header">
    <h1>Macro<span>Hard</span> Design Studio</h1>
    <div class="subtitle">MacroHard 3D Design Standard v1 &nbsp;|&nbsp; Sovereign Design Authority &nbsp;|&nbsp; <span class="badge">LIVE</span></div>
  </div>
  <div class="grid">
    <div class="card">
      <h2>Standard</h2>
      <div class="value">3D-v1</div>
    </div>
    <div class="card">
      <h2>Weights</h2>
      <div class="value" style="font-size:17px;line-height:1.6">
        Colors 30% &middot; Typography 25%<br>Spacing 20% &middot; 3D Standard 25%
      </div>
    </div>
    <div class="card">
      <h2>Thresholds</h2>
      <div class="value" style="font-size:17px;line-height:1.6">
        PASS &ge;80% &middot; WARN &ge;60%<br>FAIL &lt;60%
      </div>
    </div>
  </div>
  <div class="endpoints">
    <h2>API Endpoints</h2>
    <div class="ep"><span class="method">GET</span><span class="path">/api/tokens</span><span class="desc">List all design tokens</span></div>
    <div class="ep"><span class="method">GET</span><span class="path">/api/tokens/:id</span><span class="desc">Get token by ID</span></div>
    <div class="ep"><span class="method post">POST</span><span class="path">/api/audit</span><span class="desc">Run 3D standard audit</span></div>
    <div class="ep"><span class="method">GET</span><span class="path">/api/audit/history</span><span class="desc">Audit history</span></div>
    <div class="ep"><span class="method">GET</span><span class="path">/api/audit/:id</span><span class="desc">Get audit result</span></div>
    <div class="ep"><span class="method post">POST</span><span class="path">/mcp</span><span class="desc">JSON-RPC 2.0 MCP dispatcher</span></div>
    <div class="ep"><span class="method">GET</span><span class="path">/health</span><span class="desc">Health check (unauthenticated)</span></div>
  </div>
  <footer>Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-27 | SEC Ref 17684-273-411-436</footer>
</body>
</html>`;

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS preflight
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        headers: {
          'Access-Control-Allow-Origin': 'https://macrohard.albertlane.org',
          'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type, x-lane-api-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Unauthenticated routes
    if (path === '/health') {
      return jsonResponse({ status: 'ok', service: 'macrohard', standard: '3D-v1', ts: new Date().toISOString() });
    }

    if (path === '/' && request.method === 'GET') {
      return new Response(DASHBOARD_HTML, {
        headers: {
          'Content-Type': 'text/html;charset=UTF-8',
          'Content-Security-Policy': "default-src 'self'; style-src 'unsafe-inline'; font-src 'self' https://fonts.googleapis.com; img-src 'self' data:",
          'X-Content-Type-Options': 'nosniff',
          'X-Frame-Options': 'DENY',
          'Referrer-Policy': 'no-referrer',
          'Strict-Transport-Security': 'max-age=31536000; includeSubDomains; preload',
        },
      });
    }

    // All other routes require auth
    const authErr = await requireAuth(request, env.API_KEY);
    if (authErr) return authErr;

    // Token routes
    if (path === '/api/tokens' || path.startsWith('/api/tokens/')) {
      return handleTokens(request, path);
    }

    // Audit routes
    if (path === '/api/audit' || path === '/api/audit/history' || path.match(/^\/api\/audit\/[^/]+$/)) {
      return handleAudit(request, env, path);
    }

    // MCP JSON-RPC dispatcher
    if (path === '/mcp' && request.method === 'POST') {
      return handleMcp(request, env);
    }

    return errorResponse('Not found', 'NOT_FOUND', 404);
  },
} satisfies ExportedHandler<Env>;
