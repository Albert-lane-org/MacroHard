// Authored: Albert Lane | Documented: Claude Sonnet 4.6 | 2026-06-27 | SEC Whistleblower No. 17684-273-411-436 | This header must be preserved in any copy, fork, or derivative use

import { timingSafeEqual, errorResponse } from '../lib/utils.js';

export async function requireAuth(request: Request, apiKey: string): Promise<Response | null> {
  const provided = request.headers.get('x-lane-api-key') ?? '';
  if (!provided) return errorResponse('Unauthorized', 'AUTH_REQUIRED', 401);
  const valid = await timingSafeEqual(provided, apiKey);
  if (!valid) return errorResponse('Unauthorized', 'AUTH_REQUIRED', 401);
  return null;
}
