import { NextRequest } from "next/server";

// Simple server-side proxy to avoid CORS and keep the client domain constant
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text") || "";
  const taskUrlParam = searchParams.get("task_url") || searchParams.get("taskUrl") || "";

  if (!text.trim()) {
    return new Response(JSON.stringify({ error: "Missing 'text' query param" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  // Upstream no longer requires `style` in the query; just forward the `text` prompt.
  const upstream = `https://api.paxsenix.org/ai-image/midjourney?text=${encodeURIComponent(text)}`;

  try {
    // If caller passed a task_url, fetch it directly (useful for status polling or collect)
    if (taskUrlParam) {
      const taskRes = await fetch(taskUrlParam, { cache: "no-store" });
      const taskCt = taskRes.headers.get("content-type") || "";
       if (taskCt.includes("application/json")) {
         const data = await taskRes.json().catch(() => null) as unknown;
         return new Response(JSON.stringify(data), { status: taskRes.status, headers: { "content-type": "application/json" } });
      }
      const buf = await taskRes.arrayBuffer();
      return new Response(buf, { status: 200, headers: { "content-type": taskCt || "application/json" } });
    }

    const res = await fetch(upstream, { cache: "no-store" });

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
          return new Response(JSON.stringify({ ok: true, urls: d["urls"] }), { status: 200, headers: { "content-type": "application/json" } });
        }

        // If upstream returned 'images' or similar arrays, try common alternatives
        if (Array.isArray(d["images"]) && (d["images"] as unknown[]).every((v) => typeof v === "string")) {
          return new Response(JSON.stringify({ ok: true, urls: d["images"] }), { status: 200, headers: { "content-type": "application/json" } });
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
          const maxAttempts = 25;
          const intervalMs = 1000;
          let attempt = 0;
          while (attempt < maxAttempts) {
            attempt++;
            const tRes = await fetch(taskUrl, { cache: "no-store" });
            const tct = tRes.headers.get("content-type") || "";
            if (tct.includes("application/json")) {
              const tdata = await tRes.json().catch(() => null) as unknown;
              if (typeof tdata === "object" && tdata !== null) {
                const td = tdata as Record<string, unknown>;
                // If task result contains multiple urls, return them
                if (Array.isArray(td["urls"]) && (td["urls"] as unknown[]).every((v) => typeof v === "string")) {
                  return new Response(JSON.stringify({ ok: true, urls: td["urls"] }), { status: 200, headers: { "content-type": "application/json" } });
                }
                // If task result contains a single url, normalize into urls array
                if (typeof td["url"] === "string") {
                  return new Response(JSON.stringify({ ok: true, urls: [td["url"]] }), { status: 200, headers: { "content-type": "application/json" } });
                }
                if (typeof td["status"] === "string" && td["status"] === "failed") {
                  return new Response(JSON.stringify({ error: "Upstream task failed" }), { status: 502, headers: { "content-type": "application/json" } });
                }
              }
            }
            // wait before next attempt
            // eslint-disable-next-line no-await-in-loop
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
        // allow the browser to download
        "cache-control": "no-store",
      },
    });
  } catch (err: unknown) {
     return new Response(JSON.stringify({ error: err instanceof Error ? err.message : String(err) || "Proxy request failed" }), {
      status: 500,
      headers: { "content-type": "application/json" },
    });
  }
}
