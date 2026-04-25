import { hasAdminAuthConfig, setAdminCookie, verifyAdminPassword } from '../../../../lib/auth';
import { noStoreJson } from '@/lib/httpCache';

const MAX_ATTEMPTS = 5;
const WINDOW_MS = 10 * 60 * 1000;
const BLOCK_MS = 15 * 60 * 1000;
const loginAttemptStore = new Map<string, { count: number; firstAttemptAt: number; blockedUntil?: number }>();

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    const [first] = forwarded.split(',');
    if (first) return first.trim();
  }
  return req.headers.get('x-real-ip') || 'unknown';
}

function getRateLimitState(ip: string, now = Date.now()) {
  const state = loginAttemptStore.get(ip);
  if (!state) return { blocked: false };

  if (state.blockedUntil && state.blockedUntil > now) {
    return { blocked: true, retryAfterSeconds: Math.ceil((state.blockedUntil - now) / 1000) };
  }

  if (state.firstAttemptAt + WINDOW_MS <= now) {
    loginAttemptStore.delete(ip);
    return { blocked: false };
  }

  return { blocked: false, state };
}

function recordFailedAttempt(ip: string, now = Date.now()) {
  const current = loginAttemptStore.get(ip);
  if (!current || current.firstAttemptAt + WINDOW_MS <= now) {
    loginAttemptStore.set(ip, { count: 1, firstAttemptAt: now });
    return;
  }

  const nextCount = current.count + 1;
  if (nextCount >= MAX_ATTEMPTS) {
    loginAttemptStore.set(ip, {
      count: nextCount,
      firstAttemptAt: current.firstAttemptAt,
      blockedUntil: now + BLOCK_MS,
    });
    return;
  }

  current.count = nextCount;
  loginAttemptStore.set(ip, current);
}

function clearFailedAttempts(ip: string) {
  loginAttemptStore.delete(ip);
}

export async function POST(req: Request) {
  if (!hasAdminAuthConfig()) {
    return noStoreJson({ ok: false, error: 'Admin auth is not configured on the server' }, { status: 503 });
  }

  const clientIp = getClientIp(req);
  const limit = getRateLimitState(clientIp);
  if (limit.blocked) {
    return noStoreJson(
      { ok: false, error: 'Too many failed login attempts. Please try again later.' },
      {
        status: 429,
        headers: limit.retryAfterSeconds ? { 'Retry-After': String(limit.retryAfterSeconds) } : undefined,
      },
    );
  }

  const contentType = req.headers.get('content-type') || '';
  let password = '';
  let remember = true;
  if (contentType.includes('application/json')) {
    const body = await req.json().catch(() => ({}));
    password = typeof body?.password === 'string' ? body.password : '';
    if (typeof body?.remember === 'boolean') remember = body.remember;
  } else if (contentType.includes('application/x-www-form-urlencoded')) {
    const text = await req.text();
    const params = new URLSearchParams(text);
    password = params.get('password') || '';
    const r = params.get('remember');
    if (r !== null) remember = r === 'true' || r === '1' || r === 'on';
  } else if (contentType.includes('multipart/form-data')) {
    const form = await req.formData();
    const p = form.get('password');
    if (typeof p === 'string') password = p;
    const r = form.get('remember');
    if (typeof r === 'string') remember = r === 'true' || r === '1' || r === 'on';
    if (typeof r === 'boolean') remember = r;
  }
  if (!verifyAdminPassword(password)) {
    recordFailedAttempt(clientIp);
    return noStoreJson({ ok: false, error: 'Invalid password' }, { status: 401 });
  }
  clearFailedAttempts(clientIp);

  const res = noStoreJson({ ok: true });
  setAdminCookie(res, remember);
  return res;
}
