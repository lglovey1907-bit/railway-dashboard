// ─────────────────────────────────────────────────────────────────────────────
// Small helper to send an OTP / notification email via /api/send-email.
// Falls back gracefully (returns sent:false) if SMTP isn't configured, so
// callers can still display the code on-screen for demo/intranet use.
// ─────────────────────────────────────────────────────────────────────────────

export async function sendOtpEmail(to: string, code: string, purpose: 'signup' | 'reset' = 'signup'): Promise<boolean> {
  const subject = purpose === 'reset'
    ? 'Password Reset OTP — Delhi Division Commercial Dashboard'
    : 'Verify Your Email — Delhi Division Commercial Dashboard';
  const text = purpose === 'reset'
    ? `Your password reset verification code is: ${code}\n\nThis code expires in 10 minutes. If you did not request a password reset, please ignore this email.`
    : `Your email verification code is: ${code}\n\nThis code expires in 10 minutes.`;

  try {
    const res = await fetch('/api/send-email', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ to, subject, text }),
    });
    const data = await res.json();
    return !!data?.ok;
  } catch {
    return false;
  }
}
