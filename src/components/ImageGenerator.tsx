"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";

// Style selection removed — backend accepts text-only prompts and returns multiple images

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  // style state removed
  const [ratio, setRatio] = useState<string>("1:1");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);

  // loading helpers
  const LOADING_MESSAGES = [
    "Connecting to server…",
    "Creating variations…",
    "Composing the scene…",
    "Refining details…",
    "Applying style…",
    "Optimizing colors…",
    "Rendering at high quality…",
    "Preparing final touches…",
    "Packaging image…",
    "Bringing you the final product…",
  ];
  const [loadingMessage, setLoadingMessage] = useState<string>(LOADING_MESSAGES[0]);
  const [progress, setProgress] = useState<number>(0);
  const messageTimerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const [pollAttempts, setPollAttempts] = useState<number>(0);

  // Revoke previous object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
      // cleanup any running timers when component unmounts
      if (messageTimerRef.current) clearInterval(messageTimerRef.current as any);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current as any);
    };
  }, []);

  const canGenerate = useMemo(() => prompt.trim().length > 0 && !loading, [prompt, loading]);

  // Download helper that works for cross-origin URLs
  async function downloadImage(srcUrl: string) {
    try {
      // mark this URL as downloading to avoid duplicate clicks and provide visual feedback
      setDownloading((prev) => {
        const s = new Set(prev);
        s.add(srcUrl);
        return s;
      });

      const safe = (prompt || "photogen").trim().slice(0, 40).replace(/[^a-z0-9-_]+/gi, "_") || "photogen";
      const baseName = `${safe}-${ratio.replace(":", "x")}-${Date.now()}`;
      // If it's a blob URL, just anchor-download it
      if (srcUrl.startsWith("blob:")) {
        const a = document.createElement("a");
        a.href = srcUrl;
        a.download = `${baseName}.png`;
        document.body.appendChild(a);
        a.click();
        a.remove();
        return; // will fall to finally which clears downloading state after a short delay
      }

      // Use same-origin proxy to avoid cross-origin download limitations
      const proxyUrl = `/api/ai-image?image_url=${encodeURIComponent(srcUrl)}&filename=${encodeURIComponent(baseName)}`;
      const a = document.createElement("a");
      a.href = proxyUrl;
      a.download = `${baseName}.png`;
      document.body.appendChild(a);
      a.click();
      a.remove();
    } catch (e) {
      setError((e as Error)?.message || "Failed to download image");
    } finally {
      // keep the button in a downloading state briefly so users see feedback
      setTimeout(() => {
        setDownloading((prev) => {
          const s = new Set(prev);
          s.delete(srcUrl);
          return s;
        });
      }, 1200);
    }
  }

  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setProgress(6);
    setPollAttempts(0);
    // start rotating messages every 1.5s
    if (messageTimerRef.current) clearInterval(messageTimerRef.current as any);
    messageTimerRef.current = window.setInterval(() => {
      const next = LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)];
      setLoadingMessage(next);
    }, 1500);
    // gentle automatic progress until server-driven updates take place
    if (progressTimerRef.current) clearInterval(progressTimerRef.current as any);
    progressTimerRef.current = window.setInterval(() => {
      setProgress((p) => Math.min(94, Math.round(p + Math.random() * 6 + 2)));
    }, 700);

    try {
      const q = new URLSearchParams({ text: prompt });
      if (ratio) q.set("ratio", ratio);
      const res = await fetch(`/api/ai-image?${q.toString()}`);
      const contentType = res.headers.get("content-type") || "";

  if (res.status === 202) {
        // queued: backend returns job/task info
        const data = await res.json().catch(() => null);
        const taskUrl = data?.task_url || data?.taskUrl || data?.task;
        if (!taskUrl) {
          throw new Error("Task queued but no task_url returned");
        }

        // Poll the server-side proxy for task completion
        const pollMax = 30; // ~30s
        const pollInterval = 1000;
        let attempt = 0;
        while (attempt < pollMax) {
          attempt++;
          setPollAttempts(attempt);
          // update progress based on attempts (visual only)
          setProgress(Math.min(92, 10 + Math.round((attempt / pollMax) * 80)));
          const statusRes = await fetch(`/api/ai-image?task_url=${encodeURIComponent(taskUrl)}`);
          const sc = statusRes.status;
          const sct = statusRes.headers.get("content-type") || "";
          if (sc === 200 && !sct.includes("application/json")) {
            // final image bytes
            const blob = await statusRes.blob();
            const objUrl = URL.createObjectURL(blob);
            if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
            lastObjectUrlRef.current = objUrl;
            setProgress(100);
            setLoadingMessage("Finalizing...");
            // clear timers and allow the progress fill to show briefly
            if (messageTimerRef.current) clearInterval(messageTimerRef.current as any);
            if (progressTimerRef.current) clearInterval(progressTimerRef.current as any);
            await new Promise((r) => setTimeout(r, 300));
            setImageUrl(objUrl);
            setLoading(false);
            return;
          }

          if (sct.includes("application/json")) {
            const data = await statusRes.json().catch(() => null);
            if (data?.status === "done" && data?.url) {
              // fetch image
              const imgRes = await fetch(data.url);
              if (!imgRes.ok) throw new Error(`Failed to fetch image: ${imgRes.status}`);
              const blob = await imgRes.blob();
              const objUrl = URL.createObjectURL(blob);
              if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
              lastObjectUrlRef.current = objUrl;
              setProgress(100);
              setLoadingMessage("Finalizing...");
              if (messageTimerRef.current) clearInterval(messageTimerRef.current as any);
              if (progressTimerRef.current) clearInterval(progressTimerRef.current as any);
              await new Promise((r) => setTimeout(r, 300));
              setImageUrl(objUrl);
              setLoading(false);
              return;
            }
            if (data?.ok === false && data?.message) {
              throw new Error(data.message || "Task queued");
            }
          }

          await new Promise((r) => setTimeout(r, pollInterval));
        }

        throw new Error("Timed out waiting for image generation (server-side)");
      }

      if (!res.ok) {
        let message = `Request failed (${res.status})`;
        if (contentType.includes("application/json")) {
          const data = await res.json().catch(() => null);
          if (data?.error) message = `${message}: ${data.error}`;
        }
        throw new Error(message);
      }

      if (contentType.includes("application/json")) {
        const data = await res.json().catch(() => null) as any;
        // API now returns { ok: true, url, urls: [...] }
        const urls: string[] = Array.isArray(data?.urls) ? data.urls : (typeof data?.url === 'string' ? [data.url] : []);
        if (urls.length === 0) throw new Error('No image URLs returned from API');

        // Clear timers
        if (messageTimerRef.current) clearInterval(messageTimerRef.current as any);
        if (progressTimerRef.current) clearInterval(progressTimerRef.current as any);
        setProgress(100);
        await new Promise((r) => setTimeout(r, 200));
        // Show the first image as main; store the array in state via imageUrl (reuse as first) and a new urls state
        if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
        setImageUrl(urls[0]);
        // Save extra URLs into a new local state via setUrls
        setUrls(urls);
        setLoading(false);
        return;
      }

      // Fallback: treat body as image bytes
      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = objUrl;
      setProgress(100);
      if (messageTimerRef.current) clearInterval(messageTimerRef.current as any);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current as any);
      await new Promise((r) => setTimeout(r, 200));
      setImageUrl(objUrl);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
      setImageUrl(null);
    } finally {
  // ensure timers are cleared on finish or error
  if (messageTimerRef.current) clearInterval(messageTimerRef.current as any);
  if (progressTimerRef.current) clearInterval(progressTimerRef.current as any);
  setTimeout(() => setLoading(false), 0);
    }
  }

  function handleClear() {
    setPrompt("");
    setImageUrl(null);
    setError(null);
  }

  // Track which image URLs are currently downloading (for UX + duplicate click prevention)
  const [downloading, setDownloading] = useState<Set<string>>(new Set());

  return (
    <section id="ai-studio" className="py-8 sm:py-12">
      <div className="w-full max-w-7xl px-4">
        {/* Header */}
        <div className="max-w-2xl">
          <h1 className="text-white text-glow drop-shadow-lg leading-tight md:leading-snug" style={{ fontWeight: 600, fontSize: "clamp(1.75rem, 3.5vw, 2.5rem)" }}>
            PhotoGen Ai Studio
          </h1>
          <p className="mt-2 text-zinc-300" style={{ fontSize: "clamp(0.95rem, 2vw, 1.05rem)" }}>
            Generate images from text prompts. Create multiple variations and download.
          </p>
        </div>

        {/* Content */}
        <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Left: form and actions */}
          <div className="order-1">
            <form onSubmit={handleGenerate} className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-5 backdrop-blur">
              <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your image (e.g., a vintage car parked under neon lights)" className="w-full sm:flex-1 rounded-xl px-3 py-2 sm:px-4 sm:py-3 bg-black/30 border border-white/10 text-white placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400" />

                {/* Aspect ratio selection */}
                <select
                  value={ratio}
                  onChange={(e) => setRatio(e.target.value)}
                  className="rounded-xl px-3 py-2 sm:px-4 sm:py-3 border border-white/10 bg-black/30 text-white sm:w-40"
                  title="Aspect Ratio"
                >
                  <option value="1:1">1:1 · Square</option>
                  <option value="16:9">16:9 · Landscape</option>
                  <option value="9:16">9:16 · Portrait</option>
                  <option value="4:3">4:3</option>
                  <option value="3:4">3:4</option>
                  <option value="3:2">3:2</option>
                  <option value="2:3">2:3</option>
                </select>

                <button type="submit" disabled={!canGenerate} className={`w-full sm:w-auto rounded-xl px-4 py-2 sm:px-5 sm:py-3 font-medium shadow ${!canGenerate ? 'opacity-50 cursor-not-allowed' : 'btn-violet glow-violet'}`}>
                  {loading ? "Generating…" : "Generate"}
                </button>
              </div>

              <div className="mt-2 text-sm text-zinc-300">{error ? <span className="text-red-300">{error}</span> : loading ? <span>Queued / generating…</span> : <span>Tip: pick a ratio (e.g., 9:16 for phone wallpapers) and try cinematic prompts.</span>}</div>
            </form>

            {/* Secondary actions when an image exists */}
            {imageUrl && (
              <div className="mt-4 flex flex-row flex-wrap gap-3 items-center">
                <a href={imageUrl} download={`photogen-${Date.now()}.png`} className="inline-flex items-center justify-center rounded-xl px-4 py-2 bg-white text-black font-medium shadow hover:brightness-95">Download</a>
                <button type="button" onClick={() => window.open(imageUrl || undefined, '_blank', 'noopener')} className="inline-flex items-center justify-center rounded-xl px-4 py-2 border border-white/10 text-white hover:bg-white/5">Open</button>
                <button type="button" onClick={() => handleGenerate()} className="inline-flex items-center justify-center rounded-xl px-4 py-2 border border-white/10 text-white hover:bg-white/5">Regenerate</button>
                <button type="button" onClick={handleClear} className="inline-flex items-center justify-center rounded-xl px-4 py-2 border border-white/10 text-white hover:bg-white/5">Clear</button>
              </div>
            )}
          </div>

          {/* Right: preview or loader */}
          <div className="order-2">
            <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
              {imageUrl ? (
                <div className="w-full overflow-hidden rounded-lg bg-black/40 flex items-center justify-center relative">
                  <a href={urls?.[selectedIndex] || imageUrl!} target="_blank" rel="noopener noreferrer" className="w-full">
                    <img src={urls?.[selectedIndex] || imageUrl} alt="Generated" className="w-full h-auto max-h-[70vh] object-contain" />
                  </a>
                  {/* Download overlay for main image */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const u = urls?.[selectedIndex] || imageUrl!;
                      if (!downloading.has(u)) downloadImage(u);
                    }}
                    title="Download image"
                    aria-label="Download image"
                    aria-busy={downloading.has((urls?.[selectedIndex] || imageUrl!) as string)}
                    disabled={downloading.has((urls?.[selectedIndex] || imageUrl!) as string)}
                    className={`absolute top-2 right-2 z-10 p-2 rounded-full border text-white shadow backdrop-blur-sm ${downloading.has((urls?.[selectedIndex] || imageUrl!) as string) ? 'bg-black/70 border-white/20 cursor-wait opacity-80' : 'bg-black/60 hover:bg-black/80 border-white/10'}`}
                  >
                    {downloading.has((urls?.[selectedIndex] || imageUrl!) as string) ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
                        <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
                        <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2" fill="none" />
                      </svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                      </svg>
                    )}
                  </button>
                </div>
              ) : (
                <div className="mt-2 text-sm text-zinc-300">
                  {error ? (
                    <span className="text-red-300">{error}</span>
                  ) : loading ? (
                    <div className="pg-loading" aria-live="polite">
                      <div className="pg-bar-wrap" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={progress}>
                        <div className="pg-bar" style={{ width: `${progress}%` }} />
                      </div>
                      <div className="pg-msg">
                        <div className="pg-left">{loadingMessage}</div>
                        <div className="pg-right">{progress}% · {pollAttempts > 0 ? `${pollAttempts} attempt${pollAttempts > 1 ? 's' : ''}` : 'connecting'}</div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-lg border border-white/10 bg-black/30/40 flex items-center justify-center text-zinc-300">
                      <span>Generated image will appear here.</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {/* Thumbnails */}
            {urls && urls.length > 1 && (
              <div className="mt-3 flex gap-2 overflow-x-auto">
                {urls.map((u, i) => (
                  <div
                    key={u}
                    onClick={() => setSelectedIndex(i)}
                    className={`relative h-16 w-24 flex-shrink-0 rounded-md overflow-hidden border cursor-pointer ${i === selectedIndex ? 'border-white/80' : 'border-white/10 hover:border-white/30'}`}
                  >
                    <img src={u} alt={`thumb-${i+1}`} className="w-full h-full object-cover" />
                    {/* subtle hover gradient */}
                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 transition-opacity duration-150 hover:opacity-100" />
                    {/* Download overlay on each thumbnail */}
                    <button
                      type="button"
                      onClick={(e) => { e.stopPropagation(); if (!downloading.has(u)) downloadImage(u); }}
                      title="Download thumbnail"
                      aria-label="Download thumbnail"
                      aria-busy={downloading.has(u)}
                      disabled={downloading.has(u)}
                      className={`absolute bottom-1 right-1 z-10 p-1.5 rounded-full border text-white shadow ${downloading.has(u) ? 'bg-black/70 border-white/20 cursor-wait opacity-80' : 'bg-black/60 hover:bg-black/80 border-white/10'}`}
                    >
                      {downloading.has(u) ? (
                        <svg width="14" height="14" viewBox="0 0 24 24" className="animate-spin" aria-hidden="true">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" />
                          <path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2" fill="none" />
                        </svg>
                      ) : (
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                          <polyline points="7 10 12 15 17 10" />
                          <line x1="12" y1="15" x2="12" y2="3" />
                        </svg>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
