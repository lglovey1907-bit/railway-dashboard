import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';
const pdfParse = require('pdf-parse');

export const runtime = 'nodejs';

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    let buffer: Buffer;
    
    if (id) {
      const base64 = await kv.get<string>(id);
      if (!base64) return NextResponse.json({ error: 'PDF not found' }, { status: 404 });
      buffer = Buffer.from(base64, 'base64');
    } else {
      return NextResponse.json({ error: 'Missing id parameter' }, { status: 400 });
    }
    
    const data = await pdfParse(buffer);
    const text = data.text;
    
    // Attempt to extract revenue data from the text
    const result: Record<string, any> = {};
    
    // Example: Passenger Revenue 7285.63 7505.47 640.67 2428.00 7883.32 609.96 638.90
    // We want the last two or the ones corresponding to JUL'25 and JUL'26 (CY and PY)
    // The exact columns depend on the table, but typically it's the last few numbers.
    // Let's just return the raw text to the frontend and let the frontend parse it, OR we parse it here.
    // For now, let's just return the text and let the frontend parser handle it!
    return NextResponse.json({ text, info: data.info });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
