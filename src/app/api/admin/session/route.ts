import { isAdminRequest } from '../../../../lib/auth';
import { noStoreJson } from '@/lib/httpCache';

export async function GET(req: Request) {
  const ok = isAdminRequest(req);
  return noStoreJson({ ok });
}
