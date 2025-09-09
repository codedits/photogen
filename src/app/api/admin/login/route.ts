import { NextResponse } from 'next/server';
import { setAdminCookie } from '../../../../lib/auth';

export async function POST(req: Request) {
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
  const expected = process.env.ADMIN_PASSWORD || 'kauntalha1101';
  if (password !== expected) {
    return NextResponse.json({ ok: false, error: 'Invalid password' }, { status: 401 });
  }
  const res = NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  setAdminCookie(res, remember);
  return res;
}
