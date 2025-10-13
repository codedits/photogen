"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";

// Style selection removed — backend accepts text-only prompts and returns multiple images

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  // style state removed
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
      const res = await fetch(`/api/ai-image?text=${encodeURIComponent(prompt)}`);
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

                {/* style selection removed (backend uses text-only prompts) */}

                <button type="submit" disabled={!canGenerate} className={`w-full sm:w-auto rounded-xl px-4 py-2 sm:px-5 sm:py-3 font-medium shadow ${!canGenerate ? 'opacity-50 cursor-not-allowed' : 'btn-violet glow-violet'}`}>
                  {loading ? "Generating…" : "Generate"}
                </button>
              </div>

              <div className="mt-2 text-sm text-zinc-300">{error ? <span className="text-red-300">{error}</span> : loading ? <span>Queued / generating…</span> : <span>Tip: try &quot;cinematic&quot; or &quot;photo-realistic&quot; prompts.</span>}</div>
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
                <div className="w-full overflow-hidden rounded-lg bg-black/40 flex items-center justify-center">
                  <a href={urls?.[selectedIndex] || imageUrl!} target="_blank" rel="noopener noreferrer" className="w-full">
                    <img src={urls?.[selectedIndex] || imageUrl} alt="Generated" className="w-full h-auto max-h-[70vh] object-contain" />
                  </a>
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
                  <button key={u} onClick={() => setSelectedIndex(i)} className={`h-16 w-24 flex-shrink-0 rounded-md overflow-hidden border ${i === selectedIndex ? 'border-white/80' : 'border-white/10 hover:border-white/30'}`}>
                    <img src={u} alt={`thumb-${i+1}`} className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
