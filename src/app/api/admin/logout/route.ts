import { NextResponse } from 'next/server';
import { clearAdminCookie } from '../../../../lib/auth';

export async function POST() {
  const res = NextResponse.json({ ok: true }, { headers: { 'cache-control': 'no-store' } });
  clearAdminCookie(res);
  return res;
}
