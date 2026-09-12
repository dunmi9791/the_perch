/** Small HTTP helpers shared by the edge functions (Deno only). */

/**
 * Origins allowed to call the functions from a browser: SITE_ORIGIN as a
 * comma-separated list, e.g. "https://the-perch.example.com,http://localhost:5173".
 * Unset means any origin, which is fine for testing and wrong for production.
 */
const ALLOWED_ORIGINS = (Deno.env.get('SITE_ORIGIN') ?? '')
  .split(',')
  .map((s) => s.trim().replace(/\/$/, ''))
  .filter(Boolean);

function allowOrigin(req: Request): string {
  const origin = req.headers.get('origin') ?? '';
  if (ALLOWED_ORIGINS.length === 0) return '*';
  return ALLOWED_ORIGINS.includes(origin) ? origin : ALLOWED_ORIGINS[0];
}

export function corsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowOrigin(req),
    // Echo whatever the browser asked for so a new supabase-js header never breaks the preflight.
    'Access-Control-Allow-Headers':
      req.headers.get('access-control-request-headers') ?? 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    Vary: 'Origin',
  };
}

export interface Http {
  /** Set when the request is a preflight or the wrong method; return it as-is. */
  early: Response | null;
  json(status: number, body: Record<string, unknown>): Response;
}

/** Per-request helpers: CORS-aware JSON replies plus preflight and method gating. */
export function http(req: Request, method: 'GET' | 'POST'): Http {
  const headers = corsHeaders(req);
  const json = (status: number, body: Record<string, unknown>) =>
    new Response(JSON.stringify(body), { status, headers: { ...headers, 'Content-Type': 'application/json' } });
  let early: Response | null = null;
  if (req.method === 'OPTIONS') early = new Response('ok', { headers });
  else if (req.method !== method) early = json(405, { error: 'Method not allowed.' });
  return { early, json };
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  try {
    const body = await req.json();
    return body && typeof body === 'object' ? (body as Record<string, unknown>) : null;
  } catch {
    return null;
  }
}
