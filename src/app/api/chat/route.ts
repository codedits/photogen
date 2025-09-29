import { NextRequest } from 'next/server';

// New upstream per your request
const UPSTREAM = 'https://api.bk9.dev/ai/gpt-reasoning';

const MAX_URL_LEN = 1900; // keep query URL under this size

function buildSafeUrl(base: string, q: string, bk9: string) {
  const basePrefix = base + '?q=';
  const encodedBK9 = encodeURIComponent(bk9);
  let encodedQ = encodeURIComponent(q);
  const initialUrl = `${basePrefix}${encodedQ}&BK9=${encodedBK9}`;

  if (initialUrl.length <= MAX_URL_LEN) return initialUrl;

  // If too long, iteratively trim the start of q (drop oldest context) until it fits
  let raw = q;
  // Allowed length for encodedQ
  const allowedEncodedQLen = Math.max(50, MAX_URL_LEN - (basePrefix.length + encodedBK9.length + 50));
  encodedQ = encodeURIComponent(raw);
  while (encodedQ.length > allowedEncodedQLen && raw.length > 20) {
    // Drop the oldest 30% of the raw text (keep the tail)
    const keep = Math.max(20, Math.floor(raw.length * 0.7));
    raw = raw.slice(-keep);
    encodedQ = encodeURIComponent(raw);
  }

  return `${basePrefix}${encodedQ}&BK9=${encodedBK9}`;
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => null)) as Record<string, unknown> | null;
    const text = body && typeof body['text'] === 'string' ? (body['text'] as string) : null;
    const role = body && typeof body['role'] === 'string' ? (body['role'] as string) : 'You are PhotoGen, an AI assistant for photographers. Answer concisely.';

    if (!text || typeof text !== 'string') {
      return new Response(JSON.stringify({ error: "Missing 'text' in request body" }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    const upstreamUrl = buildSafeUrl(UPSTREAM, text, role);
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
  try {
    const url = new URL(req.url);
    const text = url.searchParams.get('text') || '';
    const role = url.searchParams.get('role') || 'You are PhotoGen, an AI assistant for photographers. Answer concisely.';
    if (!text.trim()) {
      return new Response(JSON.stringify({ error: "Missing 'text' query param" }), { status: 400, headers: { 'content-type': 'application/json' } });
    }

    const upstreamRes = await fetch(buildSafeUrl(UPSTREAM, text, role), { method: 'GET', cache: 'no-store' });
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
