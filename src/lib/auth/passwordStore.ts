// ─────────────────────────────────────────────────────────────────────────────
// Password Store
// Manages user passwords in localStorage.
// Default password = CellCode + Designation + 123
// e.g. cell"UTS PRS"+ designation"CMI"→ UTSPRSCMI123
// cell"Planning"+ designation"COS"→ PLANNINGCOS123
//
// No real email server — OTP is simulated (displayed on screen for this
// demo/intranet deployment).
// ─────────────────────────────────────────────────────────────────────────────

const PWD_KEY = 'rly_user_passwords'; // { email: hashedPwd }
const OTP_KEY = 'rly_pending_otps'; // { email: { code, expiresAt, verified } }
const VER_KEY = 'rly_email_verified'; // Set<email> — verified emails
const CHNG_KEY = 'rly_must_change_pwd'; // Set<email> — must change on next login

function safeGet<T>(key: string, fallback: T): T {
 if (typeof window === 'undefined') return fallback;
 try { return JSON.parse(localStorage.getItem(key) ?? 'null') ?? fallback; } catch { return fallback; }
}

// ── Default password generation ───────────────────────────────────────────────
/** Strip spaces and special chars, uppercase */
function normalise(s: string) {
 return s.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
}

export function generateDefaultPassword(cell: string, designation: string): string {
 return `${normalise(cell)}${normalise(designation)}123`;
}

// ── Password storage ──────────────────────────────────────────────────────────
export function getStoredPasswords(): Record<string, string> {
 return safeGet<Record<string, string>>(PWD_KEY, {});
}

export function setUserPassword(email: string, password: string): void {
 if (typeof window === 'undefined') return;
 const all = getStoredPasswords();
 all[email.toLowerCase()] = password;
 localStorage.setItem(PWD_KEY, JSON.stringify(all));
}

export function getUserPassword(email: string): string | null {
 return getStoredPasswords()[email.toLowerCase()] ?? null;
}

export function hasCustomPassword(email: string): boolean {
 return getUserPassword(email) !== null;
}

// ── OTP system ────────────────────────────────────────────────────────────────
export interface OTPRecord {
 code: string;
 generatedAt: string;
 expiresAt: string; // ISO — 10 minutes
 verified: boolean;
}

export function generateOTP(email: string): OTPRecord {
 const code = String(Math.floor(100000 + Math.random() * 900000));
 const now = new Date();
 const expires = new Date(now.getTime() + 10 * 60 * 1000);
 const record: OTPRecord = {
 code,
 generatedAt: now.toISOString(),
 expiresAt: expires.toISOString(),
 verified: false,
 };
 if (typeof window !== 'undefined') {
 const all = safeGet<Record<string, OTPRecord>>(OTP_KEY, {});
 all[email.toLowerCase()] = record;
 localStorage.setItem(OTP_KEY, JSON.stringify(all));
 }
 return record;
}

export function getOTP(email: string): OTPRecord | null {
 const all = safeGet<Record<string, OTPRecord>>(OTP_KEY, {});
 return all[email.toLowerCase()] ?? null;
}

export function verifyOTP(email: string, code: string): boolean {
 const all = safeGet<Record<string, OTPRecord>>(OTP_KEY, {});
 const record = all[email.toLowerCase()];
 if (!record) return false;
 if (new Date(record.expiresAt) < new Date()) return false;
 if (record.code !== code.trim()) return false;
 record.verified = true;
 all[email.toLowerCase()] = record;
 if (typeof window !== 'undefined') localStorage.setItem(OTP_KEY, JSON.stringify(all));
 return true;
}

export function clearOTP(email: string): void {
 if (typeof window === 'undefined') return;
 const all = safeGet<Record<string, OTPRecord>>(OTP_KEY, {});
 delete all[email.toLowerCase()];
 localStorage.setItem(OTP_KEY, JSON.stringify(all));
}

// ── Email verified flag ───────────────────────────────────────────────────────
export function isEmailVerified(email: string): boolean {
 const set: string[] = safeGet<string[]>(VER_KEY, []);
 return set.includes(email.toLowerCase());
}

export function markEmailVerified(email: string): void {
 if (typeof window === 'undefined') return;
 const set: string[] = safeGet<string[]>(VER_KEY, []);
 if (!set.includes(email.toLowerCase())) {
 set.push(email.toLowerCase());
 localStorage.setItem(VER_KEY, JSON.stringify(set));
 }
}

// ── Must-change-password flag ─────────────────────────────────────────────────
export function mustChangePassword(email: string): boolean {
 const set: string[] = safeGet<string[]>(CHNG_KEY, []);
 return set.includes(email.toLowerCase());
}

export function setMustChangePassword(email: string): void {
 if (typeof window === 'undefined') return;
 const set: string[] = safeGet<string[]>(CHNG_KEY, []);
 if (!set.includes(email.toLowerCase())) {
 set.push(email.toLowerCase());
 localStorage.setItem(CHNG_KEY, JSON.stringify(set));
 }
}

export function clearMustChangePassword(email: string): void {
 if (typeof window === 'undefined') return;
 const set: string[] = safeGet<string[]>(CHNG_KEY, []);
 localStorage.setItem(CHNG_KEY, JSON.stringify(set.filter(e => e !== email.toLowerCase())));
}

// ── Register a new user with default password ────────────────────────────────
export function registerUserPassword(email: string, cell: string, designation: string): string {
 const defaultPwd = generateDefaultPassword(cell, designation);
 setUserPassword(email, defaultPwd);
 setMustChangePassword(email); // force change on first login
 return defaultPwd;
}
