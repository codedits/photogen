import { clearAdminCookie } from '../../../../lib/auth';
import { noStoreJson } from '@/lib/httpCache';

export async function POST() {
  const res = noStoreJson({ ok: true });
  clearAdminCookie(res);
  return res;
}
