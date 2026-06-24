/**
 * Test endpoint — verifies end-to-end Upstash read/write
 * GET /api/config/test → writes a test key, reads it back, reports result
 */
import { NextResponse } from 'next/server';

function getUpstash() {
  const url   = process.env.UPSTASH_REDIS_REST_URL ?? process.env.KV_REST_API_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN ?? process.env.KV_REST_API_TOKEN;
  return { url, token, ok: !!(url && token) };
}

export async function GET() {
  const { url, token, ok } = getUpstash();

  if (!ok) {
    return NextResponse.json({
      status: 'NOT_CONFIGURED',
      message: 'Upstash env vars missing. Set UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN in Vercel project settings.',
      env: {
        UPSTASH_REDIS_REST_URL: !!process.env.UPSTASH_REDIS_REST_URL,
        UPSTASH_REDIS_REST_TOKEN: !!process.env.UPSTASH_REDIS_REST_TOKEN,
        KV_REST_API_URL: !!process.env.KV_REST_API_URL,
        KV_REST_API_TOKEN: !!process.env.KV_REST_API_TOKEN,
      },
    });
  }

  const testKey   = 'railway_test_key';
  const testValue = `ok_${Date.now()}`;

  try {
    // Write
    const setRes = await fetch(
      `${url}/set/${encodeURIComponent(testKey)}/${encodeURIComponent(testValue)}`,
      { method: 'POST', headers: { Authorization: `Bearer ${token}` } }
    );
    const setJson = await setRes.json();

    // Read back
    const getRes = await fetch(
      `${url}/get/${encodeURIComponent(testKey)}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    );
    const getJson = await getRes.json();

    const readBack = getJson.result;
    const success  = readBack === testValue;

    return NextResponse.json({
      status: success ? 'OK' : 'WRITE_READ_MISMATCH',
      message: success
        ? '✅ Upstash is working. Cross-device sync is active.'
        : '❌ Write succeeded but read returned wrong value.',
      wrote:  testValue,
      read:   readBack,
      setResponse: setJson,
    });
  } catch (err: any) {
    return NextResponse.json({
      status: 'ERROR',
      message: err?.message ?? 'Unknown error calling Upstash',
    });
  }
}
