// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-27

import { DESIGN_TOKENS } from '../data/tokens.js';
import { jsonResponse, errorResponse } from '../lib/utils.js';

// Flatten nested token structure into a searchable list
function flattenTokens() {
  const list: Array<{ id: string; category: string; name: string; value: unknown }> = [];
  for (const [category, values] of Object.entries(DESIGN_TOKENS)) {
    if (category === '_meta') continue;
    if (typeof values === 'object' && values !== null) {
      for (const [name, value] of Object.entries(values as Record<string, unknown>)) {
        list.push({ id: `${category}.${name}`, category, name, value });
      }
    }
  }
  return list;
}

export function handleTokens(_request: Request, path: string): Response {
  const match = path.match(/^\/api\/tokens\/(.+)$/);
  if (match) {
    const id = decodeURIComponent(match[1] ?? '');
    const token = flattenTokens().find(t => t.id === id);
    if (!token) return errorResponse('Token not found', 'NOT_FOUND', 404);
    return jsonResponse(token);
  }

  const tokens = flattenTokens();
  return jsonResponse({
    tokens,
    count: tokens.length,
    meta: DESIGN_TOKENS._meta,
  });
}
