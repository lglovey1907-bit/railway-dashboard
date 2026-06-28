import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy for Google Sheets CSV export.
 * Avoids browser CORS restrictions — all fetches happen on the server.
 *
 * Usage: GET /api/gsheet-proxy?url=<encoded CSV URL>
 */
export async function GET(request: NextRequest) {
 const rawUrl = request.nextUrl.searchParams.get('url');
 if (!rawUrl) {
  return NextResponse.json({ error: 'Missing url parameter' }, { status: 400 });
 }

 // Only allow Google Sheets domains for safety
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
   },
  });

  if (!res.ok) {
   return NextResponse.json(
    { error: `Google returned HTTP ${res.status}. Make sure the sheet is published as CSV.` },
    { status: res.status },
   );
  }

  const text = await res.text();

  // Detect HTML response — means sheet is not publicly published
  if (text.trimStart().startsWith('<!')) {
   return NextResponse.json(
    { error: 'Sheet is not published publicly. Go to File → Share → Publish to web → CSV format, then click Publish.' },
    { status: 403 },
   );
  }

  return new NextResponse(text, {
   status: 200,
   headers: {
    'Content-Type': 'text/csv; charset=utf-8',
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
