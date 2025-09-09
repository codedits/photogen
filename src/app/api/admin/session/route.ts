import { NextResponse } from 'next/server';
import { isAdminRequest } from '../../../../lib/auth';

export async function GET(req: Request) {
  const ok = isAdminRequest(req);
  return NextResponse.json({ ok }, { headers: { 'cache-control': 'no-store' } });
}
