import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Missing sheet id parameter' }, { status: 400 });
  }

  try {
    const url = `https://docs.google.com/spreadsheets/d/${id}/htmlview`;
    const res = await fetch(url, {
      cache: 'no-store',
      headers: {
        'User-Agent': 'Mozilla/5.0',
        'Accept': 'text/html',
      },
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'Failed to fetch htmlview' }, { status: res.status });
    }

    const html = await res.text();
    const regex = /items\.push\(\{name: "([^"]+)",/g;
    
    let match;
    const sheets = [];
    while ((match = regex.exec(html)) !== null) {
      sheets.push(match[1]);
    }

    if (sheets.length === 0) {
      return NextResponse.json({ error: 'No sheets found or parsing failed' }, { status: 404 });
    }

    return NextResponse.json({ sheets });
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
