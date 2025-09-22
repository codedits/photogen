import { NextRequest } from 'next/server';

const UPSTREAM = 'https://api.paxsenix.biz.id/v1/gpt-4o/chat';

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const text = body && typeof body['text'] === 'string' ? (body['text'] as string) : null;
    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: "Missing 'text' in request body" }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    // Upstream expects the prompt as a `text` query param (GET). Use GET to match upstream API.
    const upstreamUrl = UPSTREAM + '?text=' + encodeURIComponent(text);
    const upstreamRes = await fetch(upstreamUrl, { method: 'GET', cache: 'no-store' });

    const ct = upstreamRes.headers.get('content-type') || '';
    const status = upstreamRes.status;

    if (!upstreamRes.ok) {
      const textBody = await upstreamRes.text().catch(() => '');
      return new Response(JSON.stringify({ error: `Upstream ${status}: ${textBody || upstreamRes.statusText}` }), { status: 502, headers: { 'content-type': 'application/json' } });
    }

    if (ct.includes('application/json')) {
      const json = await upstreamRes.json().catch(() => null);
      return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    // Otherwise return text
    const txt = await upstreamRes.text().catch(() => '');
    return new Response(txt, { status: 200, headers: { 'content-type': ct || 'text/plain' } });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}

export async function GET(req: NextRequest) {
  // Mirror existing client logic that used GET; allow ?text=...
  try {
    const url = new URL(req.url);
    const text = url.searchParams.get('text') || '';
    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "Missing 'text' query param" }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    const upstreamRes = await fetch(UPSTREAM + '?text=' + encodeURIComponent(text), { method: 'GET', cache: 'no-store' });
    const ct = upstreamRes.headers.get('content-type') || '';
    if (!upstreamRes.ok) {
      const body = await upstreamRes.text().catch(() => '');
      return new Response(JSON.stringify({ error: `Upstream ${upstreamRes.status}: ${body || upstreamRes.statusText}` }), { status: 502, headers: { 'content-type': 'application/json' } });
    }

    if (ct.includes('application/json')) {
      const json = await upstreamRes.json().catch(() => null);
      return new Response(JSON.stringify(json), { status: 200, headers: { 'content-type': 'application/json' } });
    }

    const txt = await upstreamRes.text().catch(() => '');
    return new Response(txt, { status: 200, headers: { 'content-type': ct || 'text/plain' } });
  } catch (err: unknown) {
    return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) }), { status: 500, headers: { 'content-type': 'application/json' } });
  }
}
