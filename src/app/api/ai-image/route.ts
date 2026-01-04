import { NextRequest, NextResponse } from "next/server";

// Simple in-memory cache for recent image generations (expires after 5 minutes)
const generationCache = new Map<string, { data: Record<string, unknown>; expires: number }>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

function getCached(key: string): Record<string, unknown> | null {
  const entry = generationCache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expires) {
    generationCache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, data: Record<string, unknown>): void {
  // Limit cache size to prevent memory issues
  if (generationCache.size > 100) {
    const firstKey = generationCache.keys().next().value;
    if (firstKey) generationCache.delete(firstKey);
  }
  generationCache.set(key, { data, expires: Date.now() + CACHE_TTL_MS });
}

// Simple server-side proxy to avoid CORS and keep the client domain constant
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text") || searchParams.get("prompt") || "";
  const model = searchParams.get("model") || "midjourney";
  const taskUrlParam = searchParams.get("task_url") || searchParams.get("taskUrl") || "";
  const ratioRaw = searchParams.get("ratio") || ""; // e.g., "1:1", "16:9", "9:16"
  const imageUrlParam = searchParams.get("image_url") || searchParams.get("imageUrl") || "";
  const filenameParam = searchParams.get("filename") || "";

  // Read API key from environment (server-side). Do not expose this to clients.
  const PAXSENIX_API_KEY = process.env.PAXSENIX_API_KEY || process.env.NEXT_PUBLIC_PAXSENIX_API_KEY;
  
  function paxsenixHeadersFor(u?: string | URL | null): HeadersInit | undefined {
    try {
      if (!u) return undefined;
      const host = typeof u === "string" ? new URL(u).hostname : new URL(u.toString()).hostname;
      if (host && host.endsWith("paxsenix.org") && PAXSENIX_API_KEY) {
        return { Authorization: `Bearer ${PAXSENIX_API_KEY}` } as Record<string, string>;
      }
    } catch (e) {
      // ignore
    }
    return undefined;
  }

  // 1. Direct image download proxy
  if (imageUrlParam) {
    try {
      const u = new URL(imageUrlParam);
      if (u.protocol !== "https:") {
        return NextResponse.json({ ok: false, error: "Only https URLs are allowed" }, { status: 400 });
      }
      const upstreamRes = await fetch(u.toString(), { 
        cache: "no-store",
      });
      if (!upstreamRes.ok) {
        return NextResponse.json({ ok: false, error: `Failed to fetch image (${upstreamRes.status})` }, { status: 502 });
      }
      const ct = upstreamRes.headers.get("content-type") || "application/octet-stream";
      const buf = await upstreamRes.arrayBuffer();
      const safeName = (filenameParam || "photogen-image").replace(/[^A-Za-z0-9._-]+/g, "_");
      const ext = ct.includes("/") ? ct.split("/")[1].split(";")[0] : "bin";
      const fname = safeName.includes(".") ? safeName : `${safeName}.${ext}`;
      return new NextResponse(buf, {
        status: 200,
        headers: {
          "content-type": ct,
          "cache-control": "public, max-age=31536000, immutable",
          "content-disposition": `attachment; filename="${fname}"`,
        },
      });
    } catch (e: unknown) {
      return NextResponse.json({ ok: false, error: e instanceof Error ? e.message : "Invalid image_url" }, { status: 400 });
    }
  }

  // 2. Polling logic (if task_url is provided, we don't need 'text')
  if (taskUrlParam) {
    try {
      const taskRes = await fetch(taskUrlParam, { 
        cache: "no-store",
        headers: paxsenixHeadersFor(taskUrlParam),
      });
      const taskCt = taskRes.headers.get("content-type") || "";

      if (!taskRes.ok) {
        if (taskCt.includes("application/json")) {
          const data = await taskRes.json().catch(() => null);
          return NextResponse.json(data || { ok: false, error: `Upstream error ${taskRes.status}` }, { status: taskRes.status });
        }
        return NextResponse.json({ ok: false, error: `Upstream error ${taskRes.status}` }, { status: taskRes.status });
      }

      if (taskCt.includes("application/json")) {
        const data = await taskRes.json().catch(() => null) as unknown;
        return NextResponse.json(data, { status: taskRes.status });
      }
      const buf = await taskRes.arrayBuffer();
      return new NextResponse(buf, { status: 200, headers: { "content-type": taskCt || "image/png" } });
    } catch (err: unknown) {
      return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) || "Polling request failed" }, { status: 500 });
    }
  }

  // 3. Generation logic (requires 'text')
  if (!text.trim()) {
    return NextResponse.json({ ok: false, error: "Missing 'text' query param" }, { status: 400 });
  }

  // Build upstream URL with prompt and optional ratio
  // Supported models: midjourney, nano-banana, nano-banana-pro
  let upstream: string;
  const ratio = ratioRaw.trim();
  
  if (model === "nano-banana" || model === "nano-banana-pro") {
    const url = new URL("https://api.paxsenix.org/ai-image/nano-banana");
    url.searchParams.set("prompt", text);
    url.searchParams.set("model", model);
    if (ratio) url.searchParams.set("ratio", ratio);
    upstream = url.toString();
  } else {
    const url = new URL("https://api.paxsenix.org/ai-image/midjourney");
    url.searchParams.set("text", text);
    if (ratio) url.searchParams.set("ratio", ratio);
    upstream = url.toString();
  }

  // Check cache for this exact request
  const cacheKey = `gen:${model}:${text}:${ratio}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return NextResponse.json(cached, { 
      status: 200, 
      headers: { 
        "x-cache": "HIT"
      } 
    });
  }

  try {
    // Ensure API key present for paxsenix upstream requests
    if (!PAXSENIX_API_KEY) {
      return NextResponse.json({ ok: false, error: "Server missing PAXSENIX_API_KEY environment variable" }, { status: 500 });
    }

    const res = await fetch(upstream, { 
      cache: "no-store",
      headers: paxsenixHeadersFor(upstream),
    });

    // If upstream returns JSON error, forward as JSON
    const contentType = res.headers.get("content-type") || "";
      if (!res.ok) {
        if (contentType.includes("application/json")) {
         const data = await res.json().catch(() => null) as unknown;
         if (typeof data === "object" && data !== null) {
           const d = data as Record<string, unknown>;
           const errMsg = typeof d["error"] === "string" ? d["error"] : `Upstream error ${res.status}`;
           return NextResponse.json({ ok: false, error: errMsg }, { status: res.status });
         }
         return NextResponse.json({ ok: false, error: `Upstream error ${res.status}` }, { status: res.status });
        }
        // Otherwise forward status with a generic message
        return NextResponse.json({ ok: false, error: `Upstream error ${res.status}` }, { status: res.status });
      }

    // Handle possible JSON success payloads (single url, multiple urls, base64, or job/task reference)
    if (contentType.includes("application/json")) {
      const data = await res.json().catch(() => null) as unknown;

      // Normalize parsed JSON before property access
      if (typeof data === "object" && data !== null) {
        const d = data as Record<string, unknown>;

        // If upstream already returned an array of urls, forward them as JSON to the client
        if (Array.isArray(d["urls"]) && (d["urls"] as unknown[]).every((v) => typeof v === "string")) {
          const response = { ok: true, urls: d["urls"] };
          setCache(cacheKey, response);
          return NextResponse.json(response, { status: 200, headers: { "x-cache": "MISS" } });
        }

        // If upstream returned 'images' or similar arrays, try common alternatives
        if (Array.isArray(d["images"]) && (d["images"] as unknown[]).every((v) => typeof v === "string")) {
          const response = { ok: true, urls: d["images"] };
          setCache(cacheKey, response);
          return NextResponse.json(response, { status: 200, headers: { "x-cache": "MISS" } });
        }

        // If upstream returned a task/job reference, return it immediately to the client
        let taskUrl: string | undefined;
        const jobId = d["jobId"];
        if (typeof d["task_url"] === "string") taskUrl = d["task_url"] as string;
        else if (typeof d["taskUrl"] === "string") taskUrl = d["taskUrl"] as string;
        else if (typeof d["task"] === "string") taskUrl = d["task"] as string;
        else if (typeof d["url"] === "string" && (d["url"] as string).startsWith("https://api.paxsenix.org/task/")) taskUrl = d["url"] as string;

        if (taskUrl) {
          // Return job info so client can poll the task_url
          const message = typeof d["message"] === "string" ? d["message"] : "Task queued";
          return NextResponse.json({ ok: true, message, jobId, task_url: taskUrl }, { status: 200 });
        }

        // Try common shapes for immediate image URL/base64 and normalize into JSON
        // Prefer returning JSON with urls array so frontend can handle multiple images uniformly
        if (typeof d["url"] === "string") {
          return NextResponse.json({ ok: true, urls: [d["url"]] }, { status: 200 });
        }
        if (typeof d["image_url"] === "string") {
          return NextResponse.json({ ok: true, urls: [d["image_url"]] }, { status: 200 });
        }
        if (typeof d["image"] === "string") {
          return NextResponse.json({ ok: true, urls: [d["image"]] }, { status: 200 });
        }
        if (typeof d["result"] === "string") {
          return NextResponse.json({ ok: true, urls: [d["result"]] }, { status: 200 });
        }

        // If base64 image payload is present, return it in JSON so frontend can construct a data URL
        if (typeof d["image_base64"] === "string") {
          return NextResponse.json({ ok: true, b64: d["image_base64"] }, { status: 200 });
        }
        if (typeof d["base64"] === "string") {
          return NextResponse.json({ ok: true, b64: d["base64"] }, { status: 200 });
        }
        if (typeof d["data"] === "string") {
          return NextResponse.json({ ok: true, b64: d["data"] }, { status: 200 });
        }
      }

      // If JSON but unknown structure
      return NextResponse.json({ ok: false, error: "Unexpected JSON response from upstream", data }, { status: 502 });
    }

    // For image/binary, stream it through as-is
    const body = await res.arrayBuffer();
    const ct = contentType || "image/png";
    return new NextResponse(body, {
      status: 200,
      headers: {
        "content-type": ct,
        // Cache binary images for a reasonable time (1 hour) since they're unique per generation
        "cache-control": "public, max-age=3600",
        // Enable compression if supported
        "content-encoding": res.headers.get("content-encoding") || "",
      },
    });
  } catch (err: unknown) {
     return NextResponse.json({ ok: false, error: err instanceof Error ? err.message : String(err) || "Proxy request failed" }, { status: 500 });
  }
}
