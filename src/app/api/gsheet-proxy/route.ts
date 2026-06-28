import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for Google Sheets gviz/tq endpoint.
 * Works for any sheet shared as "Anyone with the link can view".
 * No publishing required — just Share → Anyone with link → Copy link.
 *
 * Usage: GET /api/gsheet-proxy?url=<encoded gviz URL>
 */
export async function GET(request: NextRequest) {
 const rawUrl = request.nextUrl.searchParams.get('url');
 if (!rawUrl) {
  return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
 }

 // Only allow Google domains for safety
 let parsedUrl: URL;
 try {
  parsedUrl = new URL(rawUrl);
 } catch {
  return NextResponse.json({ error: 'Invalid URL' }, { status: 400 });
 }

 if (!parsedUrl.hostname.endsWith('google.com')) {
  return NextResponse.json(
   { error: 'Only Google Sheets URLs are supported' },
   { status: 400 },
  );
 }

 try {
  const res = await fetch(rawUrl, {
   cache: 'no-store',
   headers: {
    'User-Agent': 'Mozilla/5.0 (compatible; RailwayDashboard/1.0)',
    'Accept': '*/*',
   },
   redirect: 'follow',
  });

  if (!res.ok) {
   const hint =
    res.status === 401 || res.status === 403
     ? 'Make sure the sheet is shared as "Anyone with the link can view". Open the sheet → Share (top-right) → change from Restricted to Anyone with the link → Done.'
     : `Google returned HTTP ${res.status}.`;
   return NextResponse.json({ error: hint }, { status: res.status });
  }

  const text = await res.text();

  // If Google redirects to a login page (sheet not shared) we get HTML
  if (text.trimStart().startsWith('<!') || text.trimStart().startsWith('<html')) {
   return NextResponse.json(
    {
     error:
      'Sheet is not shared publicly. Open the sheet → Share (top-right) → change to "Anyone with the link can view" → Done — then try again.',
    },
    { status: 403 },
   );
  }

  // gviz returns text/javascript — return as plain text
  return new NextResponse(text, {
   status: 200,
   headers: {
    'Content-Type': 'text/plain; charset=utf-8',
    'Cache-Control': 'no-store, no-cache',
   },
  });
 } catch (e: any) {
  return NextResponse.json(
   { error: e.message ?? 'Network error fetching sheet' },
   { status: 500 },
  );
 }
}
