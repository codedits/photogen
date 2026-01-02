"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";

// Style selection removed — backend accepts text-only prompts and returns multiple images

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<string>("1:1");
  const [model, setModel] = useState<string>("midjourney");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[] | null>(null);
  const [selectedIndex, setSelectedIndex] = useState<number>(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);
  
  // Simple polling state
  const [pollingTaskUrl, setPollingTaskUrl] = useState<string | null>(null);
  const pollTimerRef = useRef<any>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollCountRef = useRef<number>(0);

  // Loading messages
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

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearTimeout(pollTimerRef.current as any);
      if (messageTimerRef.current) clearInterval(messageTimerRef.current as any);
      if (progressTimerRef.current) clearInterval(progressTimerRef.current as any);
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, []);

  const canGenerate = useMemo(() => prompt.trim().length > 0 && !loading, [prompt, loading]);

  // Download helper
  const [downloading, setDownloading] = useState<Set<string>>(new Set());
  async function downloadImage(srcUrl: string) {
    try {
      setDownloading((prev) => { const s = new Set(prev); s.add(srcUrl); return s; });
      const safe = (prompt || "photogen").trim().slice(0, 40).replace(/[^a-z0-9-_]+/gi, "_") || "photogen";
      const baseName = `${safe}-${ratio.replace(":", "x")}-${Date.now()}`;
      
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
      setTimeout(() => {
        setDownloading((prev) => { const s = new Set(prev); s.delete(srcUrl); return s; });
      }, 1200);
    }
  }

  // Start generation
  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canGenerate) return;
    
    // Reset state
    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();
    
    setLoading(true);
    setError(null);
    setImageUrl(null);
    setUrls(null);
    setSelectedIndex(0);
    setImageLoaded(false);
    setProgress(5);
    pollCountRef.current = 0;
    setPollingTaskUrl(null);
    
    // Start UI timers
    if (messageTimerRef.current) clearInterval(messageTimerRef.current as any);
    messageTimerRef.current = window.setInterval(() => {
      setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 1500);
    
    if (progressTimerRef.current) clearInterval(progressTimerRef.current as any);
    progressTimerRef.current = window.setInterval(() => {
      setProgress((p) => Math.min(90, p + Math.random() * 5));
    }, 800);

    try {
      const q = new URLSearchParams({ text: prompt });
      if (ratio) q.set("ratio", ratio);
      if (model) q.set("model", model);
      
      const res = await fetch(`/api/ai-image?${q.toString()}`, { 
        signal: abortControllerRef.current.signal,
        cache: 'no-store'
      });
      
      if (!res.ok) throw new Error(`Request failed (${res.status})`);
      
      const contentType = res.headers.get("content-type") || "";
      if (!contentType.includes("application/json")) {
        throw new Error("Unexpected response format from server");
      }

      const data = await res.json();
      
      // Case 1: Immediate result (unlikely but possible)
      if (data.ok && data.urls && data.urls.length > 0) {
        finishSuccess(data.urls);
        return;
      }
      
      // Case 2: Task queued (expected flow)
      if (data.task_url || data.taskUrl) {
        const taskUrl = data.task_url || data.taskUrl;
        setPollingTaskUrl(taskUrl);
        pollTask(taskUrl);
        return;
      }
      
      throw new Error(data.error || "No task URL returned");
      
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || "Something went wrong");
      setLoading(false);
      clearTimers();
    }
  }

  // Poll the task URL
  async function pollTask(taskUrl: string) {
    if (!taskUrl || taskUrl === "undefined") return;
    
    try {
      // Poll 20 times with 10 sec gap
      if (pollCountRef.current >= 20) {
        throw new Error("Generation timed out after 20 attempts. Please try again.");
      }
      pollCountRef.current++;

      const res = await fetch(`/api/ai-image?task_url=${encodeURIComponent(taskUrl)}`, {
        signal: abortControllerRef.current?.signal,
        cache: 'no-store'
      });
      
      if (!res.ok) {
        // If 5xx, retry. If 4xx, fail.
        if (res.status >= 400 && res.status < 500) {
          let errorMsg = `Polling failed (${res.status})`;
          const contentType = res.headers.get("content-type") || "";
          if (contentType.includes("application/json")) {
            const errorData = await res.json().catch(() => ({}));
            errorMsg = errorData.error || errorMsg;
          }
          throw new Error(errorMsg);
        }
        // Retry on 5xx or network error
        pollTimerRef.current = window.setTimeout(() => pollTask(taskUrl), 10000);
        return;
      }
      
      const contentType = res.headers.get("content-type") || "";
      
      // If the response is an image, we're done!
      if (contentType.includes("image/")) {
        const blob = await res.blob();
        const objectUrl = URL.createObjectURL(blob);
        finishSuccess([objectUrl]);
        return;
      }

      if (!contentType.includes("application/json")) {
        // If it's not an image and not JSON, it might be an HTML error page
        // We'll retry
        pollTimerRef.current = window.setTimeout(() => pollTask(taskUrl), 10000);
        return;
      }

      const data = await res.json();
      
      // More robust check for completion
      // Some APIs return 'completed', 'done', 'success', or just the urls
      const status = String(data.status || "").toLowerCase();
      const isDone = status === "done" || 
                     status === "completed" || 
                     status === "success" || 
                     (Array.isArray(data.urls) && data.urls.length > 0) || 
                     (Array.isArray(data.images) && data.images.length > 0) ||
                     !!data.url || 
                     !!data.image_url;

      const isFailed = status === "failed" || 
                       status === "error" || 
                       !!data.error || 
                       (data.ok === false && status !== "pending");

      if (isDone) {
        const rawUrls = Array.isArray(data.urls) ? data.urls : 
                        (Array.isArray(data.images) ? data.images :
                        (data.url ? [data.url] : 
                        (data.image_url ? [data.image_url] : [])));
        
        // Filter out any non-string or invalid URLs to prevent /undefined 404s
        const resultUrls = rawUrls.filter((u: any) => typeof u === 'string' && u.length > 0);
        
        if (resultUrls.length > 0) {
          finishSuccess(resultUrls);
        } else if (data.b64 || data.image_base64) {
          const b64 = data.b64 || data.image_base64;
          finishSuccess([`data:image/png;base64,${b64}`]);
        } else {
          throw new Error("Task completed but no images were found.");
        }
      } else if (isFailed) {
        const errorMsg = data.error || data.message || data.reason || data.msg || "The image generation task failed.";
        throw new Error(errorMsg);
      } else {
        // Still processing (e.g., status: "processing", "queued", "pending")
        // Update progress slightly to show movement
        setProgress(prev => Math.min(98, prev + 2));
        pollTimerRef.current = window.setTimeout(() => pollTask(taskUrl), 10000);
      }
      
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || "Polling failed");
      setLoading(false);
      clearTimers();
    }
  }

  function finishSuccess(resultUrls: string[]) {
    if (!resultUrls || resultUrls.length === 0) return;
    setUrls(resultUrls);
    setImageUrl(resultUrls[0]);
    setLoading(false);
    setProgress(100);
    clearTimers();
    // Preload
    resultUrls.forEach(u => { 
      if (typeof u === 'string' && u.startsWith('http')) {
        const img = new Image(); 
        img.src = u; 
      }
    });
  }

  function clearTimers() {
    if (messageTimerRef.current) clearInterval(messageTimerRef.current as any);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current as any);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current as any);
  }

  function handleClear() {
    setPrompt("");
    setImageUrl(null);
    setUrls(null);
    setSelectedIndex(0);
    setError(null);
    setLoading(false);
    if (abortControllerRef.current) abortControllerRef.current.abort();
    clearTimers();
  }

  return (
    <div className="w-full">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 items-start">
          {/* Left: form and actions */}
          <div className="order-1">
            <form onSubmit={handleGenerate} className="bg-white/[0.03] border border-white/10 rounded-xl p-4 backdrop-blur-md">
              <div className="flex flex-col gap-3">
                <input type="text" value={prompt} onChange={(e) => setPrompt(e.target.value)} placeholder="Describe your image..." className="w-full rounded-xl px-4 py-3 bg-white/5 border border-white/10 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition-colors" />

                <div className="flex flex-col sm:flex-row gap-3 items-stretch">
                  <select
                    value={model}
                    onChange={(e) => setModel(e.target.value)}
                    className="rounded-xl px-4 py-3 border border-white/10 bg-white/5 text-white flex-1 focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
                    title="Generation Model"
                  >
                    <option value="midjourney" className="bg-neutral-900">Midjourney</option>
                    <option value="nano-banana" className="bg-neutral-900">Nano Banana (Gemini 2.5)</option>
                    <option value="nano-banana-pro" className="bg-neutral-900">Nano Banana Pro (Gemini 3)</option>
                  </select>

                  <select
                    value={ratio}
                    onChange={(e) => setRatio(e.target.value)}
                    className="rounded-xl px-4 py-3 border border-white/10 bg-white/5 text-white sm:w-40 focus:outline-none focus:border-white/30 transition-colors appearance-none cursor-pointer"
                    title="Aspect Ratio"
                  >
                    <option value="16:9" className="bg-neutral-900">16:9 Landscape</option>
                    <option value="1:1" className="bg-neutral-900">1:1 Square</option>
                    <option value="9:16" className="bg-neutral-900">9:16 Portrait</option>
                  </select>

                  <button type="submit" disabled={!canGenerate} className={`w-full sm:w-auto rounded-xl px-4 py-2 sm:px-5 sm:py-3 font-medium transition-all duration-300 ${!canGenerate ? 'opacity-50 cursor-not-allowed bg-white/5 text-white/40' : 'bg-white text-black hover:bg-white/90 active:scale-95'}`}>
                    {loading ? "Generating…" : "Generate"}
                  </button>
                </div>
              </div>

              <div className="mt-4 text-[10px] uppercase tracking-[0.2em] text-white/30">
                {error ? (
                  <span className="text-red-400/80">{error}</span>
                ) : loading ? (
                  <span className="animate-pulse">{loadingMessage} ({Math.round(progress)}%)</span>
                ) : (
                  <span>Select ratio & describe your vision</span>
                )}
              </div>
            </form>
          </div>

          {/* Right: preview or loader */}
          <div className="order-2">
            <div className="bg-white/[0.03] border border-white/10 rounded-xl p-2 backdrop-blur-md">
              {imageUrl ? (
                <div className="w-full overflow-hidden rounded-lg bg-black/40 flex items-center justify-center relative group/img">
                  {!imageLoaded && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                      <div className="w-full h-full max-h-[70vh] bg-gradient-to-br from-white/5 to-white/10 animate-pulse" />
                    </div>
                  )}
                  <a href={urls?.[selectedIndex] || imageUrl!} target="_blank" rel="noopener noreferrer" className="w-full">
                    <img 
                      src={urls?.[selectedIndex] || imageUrl} 
                      alt="Generated" 
                      className={`w-full h-auto max-h-[70vh] object-contain transition-all duration-700 ${imageLoaded ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
                      onLoad={() => setImageLoaded(true)}
                      loading="eager"
                      decoding="async"
                    />
                  </a>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      const u = urls?.[selectedIndex] || imageUrl!;
                      if (!downloading.has(u)) downloadImage(u);
                    }}
                    title="Download image"
                    disabled={downloading.has((urls?.[selectedIndex] || imageUrl!) as string)}
                    className={`absolute top-4 right-4 z-10 p-3 rounded-full border text-white shadow-2xl backdrop-blur-md opacity-0 group-hover/img:opacity-100 transition-all duration-300 ${downloading.has((urls?.[selectedIndex] || imageUrl!) as string) ? 'bg-black/70 border-white/20 cursor-wait' : 'bg-black/40 hover:bg-white hover:text-black border-white/10'}`}
                  >
                    {downloading.has((urls?.[selectedIndex] || imageUrl!) as string) ? (
                      <svg width="20" height="20" viewBox="0 0 24 24" className="animate-spin" aria-hidden="true"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" /><path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                    ) : (
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    )}
                  </button>
                </div>
              ) : (
                <div className="mt-0">
                  {error ? (
                    <div className="aspect-video w-full rounded-lg border border-red-500/20 bg-red-500/5 flex items-center justify-center text-red-400 p-8 text-center">
                      <span className="text-sm">{error}</span>
                    </div>
                  ) : loading ? (
                    <div className="space-y-6 p-6">
                      <div className="aspect-video w-full rounded-lg border border-white/5 bg-white/[0.02] animate-pulse flex items-center justify-center">
                        <div className="w-12 h-12 border-2 border-white/10 border-t-white/40 rounded-full animate-spin" />
                      </div>
                      <div className="space-y-3" aria-live="polite">
                        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-white transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="flex justify-between items-center text-[10px] uppercase tracking-[0.2em] text-white/40">
                          <span>{loadingMessage}</span>
                          <span>{Math.round(progress)}%</span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="aspect-video w-full rounded-lg border border-white/5 bg-white/[0.01] flex items-center justify-center text-white/20">
                      <div className="text-center px-4">
                        <div className="w-12 h-12 border border-white/10 rounded-full flex items-center justify-center mx-auto mb-4">
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                        </div>
                        <span className="text-[10px] uppercase tracking-[0.2em]">Awaiting Input</span>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            {/* Thumbnails & Actions */}
            {imageUrl && (
              <div className="mt-4 space-y-4">
                {urls && urls.length > 1 && (
                  <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
                    {urls.map((u, i) => (
                      <button
                        key={u}
                        onClick={() => { setSelectedIndex(i); setImageLoaded(false); }}
                        className={`relative h-16 w-24 flex-shrink-0 rounded-lg overflow-hidden border transition-all duration-300 ${i === selectedIndex ? 'border-white ring-2 ring-white/20 scale-105' : 'border-white/10 opacity-40 hover:opacity-100'}`}
                      >
                        <img src={u} alt={`thumb-${i+1}`} className="w-full h-full object-cover" />
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const u = urls?.[selectedIndex] || imageUrl!;
                      if (!downloading.has(u)) downloadImage(u);
                    }}
                    disabled={downloading.has((urls?.[selectedIndex] || imageUrl!) as string)}
                    className="flex-1 flex items-center justify-center gap-2 bg-white text-black px-4 py-3 rounded-xl font-medium transition-all hover:bg-white/90 active:scale-95 disabled:opacity-50"
                  >
                    {downloading.has((urls?.[selectedIndex] || imageUrl!) as string) ? (
                      <svg width="18" height="18" viewBox="0 0 24 24" className="animate-spin"><circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" fill="none" opacity="0.25" /><path d="M21 12a9 9 0 0 1-9 9" stroke="currentColor" strokeWidth="2" fill="none" /></svg>
                    ) : (
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                    )}
                    <span className="text-sm">Download</span>
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => window.open(urls?.[selectedIndex] || imageUrl!, '_blank', 'noopener')}
                    className="flex items-center justify-center gap-2 bg-white/10 hover:bg-white/20 text-white px-5 py-3 rounded-xl font-medium transition-all backdrop-blur-md border border-white/10"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg>
                  </button>

                  <button
                    type="button"
                    onClick={handleClear}
                    className="flex items-center justify-center gap-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 text-white/40 px-5 py-3 rounded-xl font-medium transition-all border border-white/5"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6" /><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" /></svg>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    
  );
}
