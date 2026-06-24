/**
 * Cross-device config API — backed by Upstash Redis
 *
 * Upstash injects these env vars automatically via the Vercel integration:
 *   UPSTASH_REDIS_REST_URL
 *   UPSTASH_REDIS_REST_TOKEN
 *
 * Key schema:  user:{userId}:linkedSheets
 *              user:{userId}:config:{namespace}
 */
import { NextRequest, NextResponse } from 'next/server';

// ── Upstash REST helpers ───────────────────────────────────────────────────────
function getUpstash() {
  const url   = process.env.UPSTASH_REDIS_REST_URL
             ?? process.env.KV_REST_API_URL;        // fallback for old KV names
  const token = process.env.UPSTASH_REDIS_REST_TOKEN
             ?? process.env.KV_REST_API_TOKEN;
  return { url, token, ok: !!(url && token) };
}

async function redisGet(key: string): Promise<string | null> {
  const { url, token, ok } = getUpstash();
  if (!ok) return null;
  try {
    const res = await fetch(`${url}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    const json = await res.json();
    // Upstash wraps the value in { result: "..." }
    return json.result ?? null;
  } catch { return null; }
}

async function redisSet(key: string, value: string): Promise<boolean> {
  const { url, token, ok } = getUpstash();
  if (!ok) return false;
  try {
    // Upstash REST: POST /set/{key}/{value}
    const res = await fetch(
      `${url}/set/${encodeURIComponent(key)}/${encodeURIComponent(value)}`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );
    return res.ok;
  } catch { return false; }
}

async function redisDel(key: string): Promise<boolean> {
  const { url, token, ok } = getUpstash();
  if (!ok) return false;
  try {
    const res = await fetch(
      `${url}/del/${encodeURIComponent(key)}`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );
    return res.ok;
  } catch { return false; }
}

// ── GET /api/config?userId=X&namespace=Y ─────────────────────────────────────
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const userId    = searchParams.get('userId');
  const namespace = searchParams.get('namespace');
  const debug     = searchParams.get('debug') === '1';

  // Debug endpoint — shows env var status without exposing values
  if (debug) {
    const { url, ok } = getUpstash();
    return NextResponse.json({
      upstashConfigured: ok,
      urlPresent: !!process.env.UPSTASH_REDIS_REST_URL,
      tokenPresent: !!process.env.UPSTASH_REDIS_REST_TOKEN,
      legacyUrlPresent: !!process.env.KV_REST_API_URL,
      legacyTokenPresent: !!process.env.KV_REST_API_TOKEN,
      urlPrefix: url ? url.slice(0, 30) + '…' : null,
    });
  }

  if (!userId || !namespace) {
    return NextResponse.json({ error: 'userId and namespace required' }, { status: 400 });
  }

  const { ok } = getUpstash();
  if (!ok) {
    return NextResponse.json({ value: null, kvAvailable: false, reason: 'Upstash env vars not set' });
  }

  const key   = `user:${userId}:config:${namespace}`;
  const value = await redisGet(key);
  return NextResponse.json({ value, kvAvailable: true });
}

// ── POST /api/config  { userId, namespace, value } ───────────────────────────
export async function POST(req: NextRequest) {
  let body: { userId?: string; namespace?: string; value?: string | null };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  const { userId, namespace, value } = body;
  if (!userId || !namespace) {
    return NextResponse.json({ error: 'userId and namespace required' }, { status: 400 });
  }

  const { ok } = getUpstash();
  if (!ok) {
    return NextResponse.json({ ok: false, kvAvailable: false, reason: 'Upstash env vars not set' });
  }

  const key = `user:${userId}:config:${namespace}`;
  let success: boolean;
  if (value === null || value === undefined) {
    success = await redisDel(key);
  } else {
    success = await redisSet(key, value);
  }

  return NextResponse.json({ ok: success, kvAvailable: true });
}
