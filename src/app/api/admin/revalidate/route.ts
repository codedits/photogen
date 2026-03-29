import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import { isAdminRequest } from '@/lib/auth';
import { noStoreJson } from '@/lib/httpCache';

export async function POST(req: NextRequest) {
  try {
    if (!isAdminRequest(req)) {
      return noStoreJson({ error: 'Unauthorized' }, { status: 401 });
    }

    const { pathname } = await req.json();

    if (pathname) {
      revalidatePath(pathname);
      return noStoreJson({ ok: true, message: `Revalidated ${pathname}` });
    }

    // Default: Revalidate core paths
    revalidatePath('/', 'layout');
    revalidatePath('/contact');
    revalidatePath('/gallery');
    revalidatePath('/presets');
    revalidatePath('/blog');
    revalidatePath('/');
    
    return noStoreJson({ ok: true, message: 'Revalidated core paths' });
  } catch (error) {
    console.error('Revalidation error:', error);
    return noStoreJson({ error: 'Failed to revalidate' }, { status: 500 });
  }
}
