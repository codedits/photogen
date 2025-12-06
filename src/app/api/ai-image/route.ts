import { NextRequest } from "next/server";

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
  const text = searchParams.get("text") || "";
  const taskUrlParam = searchParams.get("task_url") || searchParams.get("taskUrl") || "";
  const ratioRaw = searchParams.get("ratio") || ""; // e.g., "1:1", "16:9", "9:16"
  const imageUrlParam = searchParams.get("image_url") || searchParams.get("imageUrl") || "";
  const filenameParam = searchParams.get("filename") || "";

  // Direct image download proxy (for cross-origin safe downloads)
  if (imageUrlParam) {
    try {
      const u = new URL(imageUrlParam);
      if (u.protocol !== "https:") {
        return new Response(JSON.stringify({ error: "Only https URLs are allowed" }), { status: 400, headers: { "content-type": "application/json" } });
      }
      const upstreamRes = await fetch(u.toString(), { 
        cache: "no-store",
      });
      if (!upstreamRes.ok) {
        return new Response(JSON.stringify({ error: `Failed to fetch image (${upstreamRes.status})` }), { status: 502, headers: { "content-type": "application/json" } });
      }
      const ct = upstreamRes.headers.get("content-type") || "application/octet-stream";
      const buf = await upstreamRes.arrayBuffer();
      const safeName = (filenameParam || "photogen-image").replace(/[^A-Za-z0-9._-]+/g, "_");
      // best-effort extension inference
      const ext = ct.includes("/") ? ct.split("/")[1].split(";")[0] : "bin";
      const fname = safeName.includes(".") ? safeName : `${safeName}.${ext}`;
      return new Response(buf, {
        status: 200,
        headers: {
          "content-type": ct,
          "cache-control": "public, max-age=31536000, immutable", // Cache downloaded images for 1 year
          "content-disposition": `attachment; filename="${fname}"`,
        },
      });
    } catch (e: unknown) {
      return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Invalid image_url" }), {
        status: 400,
        headers: { "content-type": "application/json" },
      });
    }
  }

  if (!text.trim()) {
    return new Response(JSON.stringify({ error: "Missing 'text' query param" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Build upstream URL with prompt and optional ratio
  const url = new URL("https://api.paxsenix.org/ai-image/midjourney");
  url.searchParams.set("text", text);
  const ratio = ratioRaw.trim();
  if (ratio) url.searchParams.set("ratio", ratio);
  const upstream = url.toString();

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

  // Check cache for this exact request
  const cacheKey = `gen:${text}:${ratio}`;
  const cached = getCached(cacheKey);
  if (cached) {
    return new Response(JSON.stringify(cached), { 
      status: 200, 
      headers: { 
        "content-type": "application/json",
        "x-cache": "HIT"
      } 
    });
  }

  try {
    // If caller passed a task_url, fetch it directly (useful for status polling or collect)
    if (taskUrlParam) {
      const taskRes = await fetch(taskUrlParam, { 
        cache: "no-store",
        headers: paxsenixHeadersFor(taskUrlParam),
      });
      const taskCt = taskRes.headers.get("content-type") || "";
       if (taskCt.includes("application/json")) {
         const data = await taskRes.json().catch(() => null) as unknown;
         return new Response(JSON.stringify(data), { status: taskRes.status, headers: { "content-type": "application/json" } });
      }
      const buf = await taskRes.arrayBuffer();
      return new Response(buf, { status: 200, headers: { "content-type": taskCt || "application/json" } });
    }

    // Ensure API key present for paxsenix upstream requests
    if (!PAXSENIX_API_KEY) {
      return new Response(JSON.stringify({ error: "Server missing PAXSENIX_API_KEY environment variable" }), {
        status: 500,
        headers: { "content-type": "application/json" },
      });
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
           return new Response(JSON.stringify({ error: errMsg }), {
             status: res.status,
             headers: { "content-type": "application/json" },
           });
         }
         return new Response(JSON.stringify({ error: `Upstream error ${res.status}` }), {
            status: res.status,
            headers: { "content-type": "application/json" },
          });
        }
        // Otherwise forward status with a generic message
        return new Response(JSON.stringify({ error: `Upstream error ${res.status}` }), {
          status: res.status,
          headers: { "content-type": "application/json" },
        });
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
          return new Response(JSON.stringify(response), { status: 200, headers: { "content-type": "application/json", "x-cache": "MISS" } });
        }

        // If upstream returned 'images' or similar arrays, try common alternatives
        if (Array.isArray(d["images"]) && (d["images"] as unknown[]).every((v) => typeof v === "string")) {
          const response = { ok: true, urls: d["images"] };
          setCache(cacheKey, response);
          return new Response(JSON.stringify(response), { status: 200, headers: { "content-type": "application/json", "x-cache": "MISS" } });
        }

  // If upstream returned a task/job reference, attempt to poll the task until completion (short timeout)
  let taskUrl: string | undefined;
  const jobId = d["jobId"];
        if (typeof d["task_url"] === "string") taskUrl = d["task_url"] as string;
        else if (typeof d["taskUrl"] === "string") taskUrl = d["taskUrl"] as string;
        else if (typeof d["task"] === "string") taskUrl = d["task"] as string;
        else if (typeof d["url"] === "string" && (d["url"] as string).startsWith("https://api.paxsenix.org/task/")) taskUrl = d["url"] as string;

        if (taskUrl) {
          // Poll task endpoint (server-side) for up to ~25 seconds
          const maxAttempts = 40;
          const intervalMs = 1000;
          let attempt = 0;
          while (attempt < maxAttempts) {
            attempt++;
            const tRes = await fetch(taskUrl, { 
              cache: "no-store",
              headers: paxsenixHeadersFor(taskUrl),
            });
            const tct = tRes.headers.get("content-type") || "";
            if (tct.includes("application/json")) {
              const tdata = await tRes.json().catch(() => null) as unknown;
              if (typeof tdata === "object" && tdata !== null) {
                const td = tdata as Record<string, unknown>;
                // If task result contains multiple urls, return them
                if (Array.isArray(td["urls"]) && (td["urls"] as unknown[]).every((v) => typeof v === "string")) {
                  const response = { ok: true, urls: td["urls"] };
                  setCache(cacheKey, response);
                  return new Response(JSON.stringify(response), { status: 200, headers: { "content-type": "application/json", "x-cache": "MISS" } });
                }
                // If task result contains a single url, normalize into urls array
                if (typeof td["url"] === "string") {
                  const response = { ok: true, urls: [td["url"]] };
                  setCache(cacheKey, response);
                  return new Response(JSON.stringify(response), { status: 200, headers: { "content-type": "application/json", "x-cache": "MISS" } });
                }
                if (typeof td["status"] === "string" && td["status"] === "failed") {
                  return new Response(JSON.stringify({ error: "Upstream task failed" }), { status: 502, headers: { "content-type": "application/json" } });
                }
              }
            }
            // wait before next attempt
            await new Promise((r) => setTimeout(r, intervalMs));
          }

          // Timed out waiting. Return job info so client can poll the task_url if desired.
          return new Response(JSON.stringify({ ok: false, message: "Task queued", jobId, task_url: taskUrl }), { status: 202, headers: { "content-type": "application/json" } });
        }

        // Try common shapes for immediate image URL/base64 and normalize into JSON
        // Prefer returning JSON with urls array so frontend can handle multiple images uniformly
        if (typeof d["url"] === "string") {
          return new Response(JSON.stringify({ ok: true, urls: [d["url"]] }), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (typeof d["image_url"] === "string") {
          return new Response(JSON.stringify({ ok: true, urls: [d["image_url"]] }), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (typeof d["image"] === "string") {
          return new Response(JSON.stringify({ ok: true, urls: [d["image"]] }), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (typeof d["result"] === "string") {
          return new Response(JSON.stringify({ ok: true, urls: [d["result"]] }), { status: 200, headers: { "content-type": "application/json" } });
        }

        // If base64 image payload is present, return it in JSON so frontend can construct a data URL
        if (typeof d["image_base64"] === "string") {
          return new Response(JSON.stringify({ ok: true, b64: d["image_base64"] }), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (typeof d["base64"] === "string") {
          return new Response(JSON.stringify({ ok: true, b64: d["base64"] }), { status: 200, headers: { "content-type": "application/json" } });
        }
        if (typeof d["data"] === "string") {
          return new Response(JSON.stringify({ ok: true, b64: d["data"] }), { status: 200, headers: { "content-type": "application/json" } });
        }
      }

      // If JSON but unknown structure
      return new Response(JSON.stringify({ error: "Unexpected JSON response from upstream", data }), {
        status: 502,
        headers: { "content-type": "application/json" },
      });
    }

    // For image/binary, stream it through as-is
    const body = await res.arrayBuffer();
    const ct = contentType || "image/png";
    return new Response(body, {
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
     return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) || "Proxy request failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
