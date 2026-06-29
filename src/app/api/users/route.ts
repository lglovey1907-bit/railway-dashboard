// ─────────────────────────────────────────────────────────────────────────────
// /api/users — server-side user storage for cross-device access
//
// Backed by Vercel KV (Redis). Requires one-time setup:
//   Vercel Dashboard → Storage → Create Database → KV
//   Environment variables are automatically added to the project.
//
// Falls back gracefully if KV is not configured (localStorage-only mode).
// ─────────────────────────────────────────────────────────────────────────────

import { NextRequest, NextResponse } from 'next/server';

// Lazy import so the module doesn't crash when KV env vars are absent
async function getKV() {
  if (!process.env.KV_REST_API_URL && !process.env.KV_URL) return null;
  try {
    const { kv } = await import('@vercel/kv');
    return kv;
  } catch {
    return null;
  }
}

const KEY = (email: string) => `rly:user:${email.toLowerCase().trim()}`;

export interface ServerUserRecord {
  email:        string;
  staffRecord?: Record<string, unknown>;  // mirrors rly_staff_master entry
  password?:    string;                   // hashed? no — same as localStorage (plain text for now)
  mustChange?:  boolean;
  status?:      string;                   // active | pending | inactive | …
  updatedAt?:   string;
}

// ── GET /api/users?email=xxx  — single user lookup ───────────────────────────
// ── GET /api/users?all=true   — list ALL users (for admin User Management) ───
export async function GET(req: NextRequest) {
  const kv = await getKV();
  if (!kv) return NextResponse.json(null, { status: 503 });

  const all = req.nextUrl.searchParams.get('all');
  if (all === 'true') {
    // Return every user record stored in KV
    try {
      const keys: string[] = await kv.keys('rly:user:*');
      if (!keys.length) return NextResponse.json([]);
      const records: (ServerUserRecord | null)[] = await kv.mget(...keys);
      return NextResponse.json(records.filter(Boolean));
    } catch {
      return NextResponse.json([], { status: 503 });
    }
  }

  const email = req.nextUrl.searchParams.get('email');
  if (!email) return NextResponse.json({ error: 'email or all param required' }, { status: 400 });

  try {
    const data = await kv.get<ServerUserRecord>(KEY(email));
    return NextResponse.json(data ?? null);
  } catch {
    return NextResponse.json(null, { status: 503 });
  }
}

// ── POST /api/users — upsert fields (only supplied fields are overwritten) ────
export async function POST(req: NextRequest) {
  const kv = await getKV();
  if (!kv) return NextResponse.json({ ok: false, reason: 'kv_unavailable' });

  let body: Partial<ServerUserRecord>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const email = body.email?.toLowerCase().trim();
  if (!email) return NextResponse.json({ error: 'email required' }, { status: 400 });

  try {
    const key = KEY(email);
    const existing: ServerUserRecord = (await kv.get<ServerUserRecord>(key)) ?? { email };

    // Deep-merge only defined fields
    const merged: ServerUserRecord = { ...existing };
    if (body.staffRecord !== undefined) merged.staffRecord = body.staffRecord;
    if (body.password    !== undefined) merged.password    = body.password;
    if (body.mustChange  !== undefined) merged.mustChange  = body.mustChange;
    if (body.status      !== undefined) merged.status      = body.status;
    merged.email     = email;
    merged.updatedAt = new Date().toISOString();

    await kv.set(key, merged);
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false, reason: 'kv_error' });
  }
}
