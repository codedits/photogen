import crypto from 'crypto';
import { NextResponse } from 'next/server';

export const ADMIN_COOKIE_NAME = 'pg_admin';

function getAdminPassword() {
  const value = process.env.ADMIN_PASSWORD;
  if (!value || !value.trim()) {
    throw new Error('Missing ADMIN_PASSWORD environment variable');
  }
  return value;
}

function getSecret() {
  const value = process.env.APP_SECRET || process.env.NEXTAUTH_SECRET || process.env.SECRET;
  if (!value || !value.trim()) {
    throw new Error('Missing APP_SECRET (or NEXTAUTH_SECRET/SECRET) environment variable');
  }
  return value;
}

function timingSafeEqualStrings(a: string, b: string): boolean {
  const aBuf = Buffer.from(a);
  const bBuf = Buffer.from(b);
  if (aBuf.length !== bBuf.length) return false;
  return crypto.timingSafeEqual(aBuf, bBuf);
}

export function hasAdminAuthConfig(): boolean {
  try {
    getAdminPassword();
    getSecret();
    return true;
  } catch {
    return false;
  }
}

export function verifyAdminPassword(password: string): boolean {
  try {
    return timingSafeEqualStrings(password, getAdminPassword());
  } catch {
    return false;
  }
}

export function adminToken(): string {
  const str = `admin:${getAdminPassword()}:${getSecret()}`;
  return crypto.createHash('sha256').update(str).digest('hex');
}

function parseCookieHeader(header: string | null | undefined): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  const parts = header.split(';');
  for (const p of parts) {
    const idx = p.indexOf('=');
    if (idx === -1) continue;
    const k = p.slice(0, idx).trim();
    const v = decodeURIComponent(p.slice(idx + 1).trim());
    if (!k) continue;
    if (!(k in out)) out[k] = v;
  }
  return out;
}

export function isAdminRequest(req: Request): boolean {
  try {
    const cookie = req.headers.get('cookie');
    const map = parseCookieHeader(cookie);
    const val = map[ADMIN_COOKIE_NAME];
    if (!val) return false;
    return timingSafeEqualStrings(val, adminToken());
  } catch {
    return false;
  }
}

export function setAdminCookie(res: NextResponse, remember = true) {
  const secure = process.env.NODE_ENV === 'production';
  const base = {
    name: ADMIN_COOKIE_NAME,
    value: adminToken(),
    httpOnly: true,
    sameSite: 'strict' as const,
    secure,
    path: '/',
  };
  if (remember) {
    res.cookies.set({ ...base, maxAge: 60 * 60 * 24 * 7 }); // 7 days
  } else {
    // session cookie: omit maxAge so it expires on browser session end
    res.cookies.set(base);
  }
}

export function clearAdminCookie(res: NextResponse) {
  const secure = process.env.NODE_ENV === 'production';
  res.cookies.set({
    name: ADMIN_COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
    maxAge: 0,
  });
}
