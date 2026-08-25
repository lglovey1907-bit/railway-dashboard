import { NextRequest, NextResponse } from 'next/server';
import { kv } from '@vercel/kv';

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as any;
    
    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }
    
    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString('base64');
    
    const id = `pdf_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    
    // Store in KV
    await kv.set(id, base64);
    
    return NextResponse.json({ id, url: `/api/pdf?id=${id}`, filename: file.name || 'document.pdf' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get('id');
    if (!id) return new NextResponse('Missing id', { status: 400 });
    
    const base64 = await kv.get<string>(id);
    if (!base64) return new NextResponse('Not found', { status: 404 });
    
    const buffer = Buffer.from(base64, 'base64');
    return new NextResponse(buffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `inline; filename="${id}.pdf"`
      }
    });
  } catch (err: any) {
    return new NextResponse(err.message, { status: 500 });
  }
}
