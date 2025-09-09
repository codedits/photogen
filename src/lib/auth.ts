import crypto from 'crypto';
import { NextResponse } from 'next/server';

const COOKIE_NAME = 'pg_admin';

function getAdminPassword() {
  return process.env.ADMIN_PASSWORD || 'kauntalha1101';
}

function getSecret() {
  return process.env.APP_SECRET || process.env.NEXTAUTH_SECRET || process.env.SECRET || 'photogen-dev-secret';
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
    const val = map[COOKIE_NAME];
    if (!val) return false;
    return val === adminToken();
  } catch {
    return false;
  }
}

export function setAdminCookie(res: NextResponse, remember = true) {
  const secure = process.env.NODE_ENV === 'production';
  const base = {
    name: COOKIE_NAME,
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
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    sameSite: 'strict',
    secure,
    path: '/',
    maxAge: 0,
  });
}
