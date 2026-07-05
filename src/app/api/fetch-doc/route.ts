import { NextRequest, NextResponse } from 'next/server';

/**
 * Server-side proxy to fetch a Google Doc (or any public URL) as HTML/text.
 * Used by the Handout widget's "Fetch & Fill from Google Doc" feature.
 *
 * Usage: GET /api/fetch-doc?url=<encoded-export-url>
 */
export async function GET(req: NextRequest) {
  const url = req.nextUrl.searchParams.get('url');
  if (!url) {
    return NextResponse.json({ error: 'Missing ?url= parameter' }, { status: 400 });
  }

  // Only allow Google Docs/Drive export URLs for safety
  const allowed =
    url.startsWith('https://docs.google.com/document/') ||
    url.startsWith('https://docs.google.com/spreadsheets/') ||
    url.startsWith('https://drive.google.com/');

  if (!allowed) {
    return NextResponse.json(
      { error: 'Only Google Docs / Drive URLs are supported.' },
      { status: 403 }
    );
  }

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (compatible; RailwayDashboard/1.0)',
        'Accept': 'text/html,application/xhtml+xml',
      },
      // 10-second timeout
      signal: AbortSignal.timeout(10_000),
    });

    if (!res.ok) {
      return NextResponse.json(
        { error: `Google returned HTTP ${res.status}. Make sure the document is shared as "Anyone with the link can view".` },
        { status: 400 }
      );
    }

    const contentType = res.headers.get('content-type') ?? '';
    const text = await res.text();

    return NextResponse.json({ content: text, contentType });
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: `Fetch failed: ${msg}` }, { status: 500 });
  }
}
