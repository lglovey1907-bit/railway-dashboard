// ─────────────────────────────────────────────────────────────────────────────
// /api/send-email — sends real email via SMTP (nodemailer)
//
// Configure via environment variables:
//   SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM
//   (SMTP_SECURE = 'true' for port 465)
//
// If SMTP is not configured, the email is not actually sent — the caller
// receives { ok: false, reason: 'smtp_not_configured' } so the UI can fall
// back to on-screen OTP display (used for local/demo deployments).
// ─────────────────────────────────────────────────────────────────────────────
import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  let body: { to?: string; subject?: string; text?: string; html?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: 'invalid json' }, { status: 400 });
  }

  const { to, subject, text, html } = body;
  if (!to || !subject || (!text && !html)) {
    return NextResponse.json({ error: 'to, subject and text/html are required' }, { status: 400 });
  }

  // ── Input validation / header-injection defense ───────────────────────────
  // These fields land directly in SMTP headers — reject anything malformed or
  // containing CR/LF (which could otherwise be used to inject extra headers).
  const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!EMAIL_RE.test(to) || /[\r\n]/.test(to)) {
    return NextResponse.json({ error: 'invalid "to" address' }, { status: 400 });
  }
  if (/[\r\n]/.test(subject) || subject.length > 200) {
    return NextResponse.json({ error: 'invalid subject' }, { status: 400 });
  }
  if ((text && text.length > 5000) || (html && html.length > 20000)) {
    return NextResponse.json({ error: 'message body too long' }, { status: 400 });
  }

  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM, SMTP_SECURE } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    // Not configured — caller should fall back to on-screen display.
    return NextResponse.json({ ok: false, reason: 'smtp_not_configured' });
  }

  try {
    const nodemailer = await import('nodemailer');
    const transporter = nodemailer.createTransport({
      host: SMTP_HOST,
      port: SMTP_PORT ? parseInt(SMTP_PORT, 10) : 587,
      secure: SMTP_SECURE === 'true',
      auth: { user: SMTP_USER, pass: SMTP_PASS },
    });

    await transporter.sendMail({
      from: SMTP_FROM || SMTP_USER,
      to,
      subject,
      text,
      html,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ ok: false, reason: 'smtp_error', message: err?.message }, { status: 502 });
  }
}
