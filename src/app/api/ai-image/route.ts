import { NextRequest } from "next/server";

// Simple server-side proxy to avoid CORS and keep the client domain constant
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const text = searchParams.get("text") || "";
  const style = searchParams.get("style") || "cinematic";
  const taskUrlParam = searchParams.get("task_url") || searchParams.get("taskUrl") || "";

  if (!text.trim()) {
    return new Response(JSON.stringify({ error: "Missing 'text' query param" }), {
      status: 400,
      headers: { "content-type": "application/json" },
    });
  }

  const upstream = `https://api.paxsenix.org/ai-image/midjourney?text=${encodeURIComponent(
    text
  )}&style=${encodeURIComponent(style)}`;

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

    // Handle possible JSON success payloads (URL or base64), otherwise pass binary through
    if (contentType.includes("application/json")) {
       const data = await res.json().catch(() => null) as unknown;

      // If upstream returned a job/task reference, attempt to poll the task until completion (short timeout)
        // Normalize parsed JSON before property access
        let taskUrl: string | undefined;
        let jobId: unknown;
        let hasUrl = false;
        if (typeof data === "object" && data !== null) {
          const d = data as Record<string, unknown>;
          if (typeof d["task_url"] === "string") taskUrl = d["task_url"] as string;
          else if (typeof d["taskUrl"] === "string") taskUrl = d["taskUrl"] as string;
          else if (typeof d["task"] === "string") taskUrl = d["task"] as string;
          else if (typeof d["url"] === "string" && (d["url"] as string).startsWith("https://api.paxsenix.dpdns.org/task/")) taskUrl = d["url"] as string;
          jobId = d["jobId"];
          hasUrl = typeof d["url"] === "string";
        }

        if (taskUrl && !hasUrl) {
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
               if (typeof td["status"] === "string" && td["status"] === "done" && typeof td["url"] === "string") {
                 const imgUrl = td["url"] as string;
                 const imgRes = await fetch(imgUrl, { cache: "no-store" });
                 if (!imgRes.ok) {
                   return new Response(JSON.stringify({ error: `Failed to fetch image URL (${imgRes.status})` }), {
                     status: 502,
                     headers: { "content-type": "application/json" },
                   });
                 }
                 const imgCT = imgRes.headers.get("content-type") || "image/png";
                 const buf = await imgRes.arrayBuffer();
                 return new Response(buf, { status: 200, headers: { "content-type": imgCT, "cache-control": "no-store" } });
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

        // Try common shapes for immediate image URL/base64
        let url: string | undefined;
        let b64: string | undefined;
        if (typeof data === "object" && data !== null) {
          const d = data as Record<string, unknown>;
          if (typeof d["url"] === "string") url = d["url"] as string;
          else if (typeof d["image_url"] === "string") url = d["image_url"] as string;
          else if (typeof d["image"] === "string") url = d["image"] as string;
          else if (typeof d["result"] === "string") url = d["result"] as string;

          if (typeof d["image_base64"] === "string") b64 = d["image_base64"] as string;
          else if (typeof d["base64"] === "string") b64 = d["base64"] as string;
          else if (typeof d["data"] === "string") b64 = d["data"] as string;
        }

        if (typeof url === "string" && /^https?:\/\//i.test(url)) {
        const imgRes = await fetch(url, { cache: "no-store" });
        if (!imgRes.ok) {
          return new Response(JSON.stringify({ error: `Failed to fetch image URL (${imgRes.status})` }), {
            status: 502,
            headers: { "content-type": "application/json" },
          });
        }
        const imgCT = imgRes.headers.get("content-type") || "image/png";
        const buf = await imgRes.arrayBuffer();
        return new Response(buf, {
          status: 200,
          headers: { "content-type": imgCT, "cache-control": "no-store" },
        });
      }

      if (typeof b64 === "string") {
        // Strip data URL prefix if present
        const cleaned = b64.replace(/^data:[^;]+;base64,/, "");
        try {
          const bytes = Buffer.from(cleaned, "base64");
          return new Response(bytes, {
            status: 200,
            headers: { "content-type": "image/png", "cache-control": "no-store" },
          });
        } catch {
          return new Response(JSON.stringify({ error: "Invalid base64 image data" }), {
            status: 502,
            headers: { "content-type": "application/json" },
          });
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
