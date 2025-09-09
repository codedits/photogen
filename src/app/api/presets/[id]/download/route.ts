import { NextResponse } from 'next/server';
import getDatabase from '../../../../../lib/mongodb';
import { ObjectId } from 'mongodb';

export async function GET(_req: Request, { params }: { params?: { id: string } | Promise<{ id: string }> }) {
  try {
    const p = (await (params as Promise<{ id: string }> | { id: string } | undefined)) || { id: '' };
    const { id } = p;
    if (!id) return NextResponse.json({ ok: false, error: 'Missing id' }, { status: 400 });
    const db = await getDatabase();
    const coll = db.collection('presets');
    const doc = await coll.findOne({ _id: new ObjectId(id) });
    if (!doc || !doc.dng?.url) {
      return NextResponse.json({ ok: false, error: 'DNG not found for this preset' }, { status: 404 });
    }
    // Proxy the file to enforce download via Content-Disposition
    const upstream = await fetch(doc.dng.url, { cache: 'no-store' });
    if (!upstream.ok || !upstream.body) return NextResponse.json({ ok: false, error: 'Failed to fetch DNG' }, { status: 502 });
    const fileName = `preset_${id}.dng`;
    return new Response(upstream.body, {
      status: 200,
      headers: {
        'content-type': upstream.headers.get('content-type') || 'application/octet-stream',
        'content-length': upstream.headers.get('content-length') || '',
        'content-disposition': `attachment; filename="${fileName}"`,
        'cache-control': 'no-store',
      },
    });
  } catch (_err) {
    const message = _err instanceof Error ? _err.message : String(_err);
    return NextResponse.json({ ok: false, error: message }, { status: 500 });
  }
}
