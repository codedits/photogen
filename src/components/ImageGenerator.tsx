"use client";

/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

const LOADING_MESSAGES = [
  "Connecting to server…",
  "Creating variations…",
  "Composing the scene…",
  "Refining details…",
  "Applying style…",
  "Optimizing colors…",
  "Rendering at high quality…",
  "Preparing final touches…",
];

// --- Custom Icons ---
const PlusIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M5 12h14" />
    <path d="M12 5v14" />
  </svg>
);

const ArrowUpIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="m5 12 7-7 7 7" />
    <path d="M12 19V5" />
  </svg>
);

const SparklesIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="m12 3-1.912 5.813a2 2 0 0 1-1.275 1.275L3 12l5.813 1.912a2 2 0 0 1 1.275 1.275L12 21l1.912-5.813a2 2 0 0 1 1.275-1.275L21 12l-5.813-1.912a2 2 0 0 1-1.275-1.275L12 3Z" />
    <path d="M5 3v4" />
    <path d="M19 17v4" />
    <path d="M3 5h4" />
    <path d="M17 19h4" />
  </svg>
);

const RatioIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <path d="M2 12h20" strokeDasharray="2 2" />
    <path d="M12 5v14" strokeDasharray="2 2" />
  </svg>
);

// --- Models & Ratios Mapping ---
const MODELS = [
  { id: 'nano-banana-pro', label: 'Imagen 4.0' },
  { id: 'nano-banana-2', label: 'Gemini 2.0 Flash' },
  { id: 'nano-banana', label: 'Gemini 2.5 Pro' },
  { id: 'midjourney', label: 'Midjourney v6' },
];

const RATIOS = [
  { id: '1:1', label: '1:1 Square' },
  { id: '16:9', label: '16:9 Wide' },
  { id: '9:16', label: '9:16 Portrait' },
  { id: '4:3', label: '4:3 Classic' },
  { id: '3:4', label: '3:4 Tall' },
];

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [ratio, setRatio] = useState<string>("16:9");
  const [model, setModel] = useState<string>("nano-banana-pro");
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [urls, setUrls] = useState<string[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imageLoaded, setImageLoaded] = useState(false);

  // UI States
  const [isModelOpen, setIsModelOpen] = useState(false);
  const [isRatioOpen, setIsRatioOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const ratioMenuRef = useRef<HTMLDivElement>(null);

  // Polling & Generation Refs
  const pollTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const pollCountRef = useRef<number>(0);
  const [loadingMessage, setLoadingMessage] = useState<string>("Initializing...");
  const [progress, setProgress] = useState<number>(0);
  const messageTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const progressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  // --- HANDLERS ---

  const clearTimers = useCallback(() => {
    if (messageTimerRef.current) clearInterval(messageTimerRef.current);
    if (progressTimerRef.current) clearInterval(progressTimerRef.current);
    if (pollTimerRef.current) clearTimeout(pollTimerRef.current);
    messageTimerRef.current = null;
    progressTimerRef.current = null;
    pollTimerRef.current = null;
  }, []);

  const clearObjectUrl = useCallback(() => {
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
  }, []);

  useEffect(() => {
    return () => {
      clearTimers();
      clearObjectUrl();
      if (abortControllerRef.current) abortControllerRef.current.abort();
    };
  }, [clearTimers, clearObjectUrl]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  // Click outside listener
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (modelMenuRef.current && !modelMenuRef.current.contains(event.target as Node)) {
        setIsModelOpen(false);
      }
      if (ratioMenuRef.current && !ratioMenuRef.current.contains(event.target as Node)) {
        setIsRatioOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const finishSuccess = useCallback((resultUrls: string[]) => {
    if (!resultUrls || resultUrls.length === 0) return;
    setUrls(resultUrls);
    setImageUrl(resultUrls[0]);
    setLoading(false);
    setProgress(100);
    clearTimers();
    // Preload
    resultUrls.forEach(u => {
      if (typeof u === 'string' && u.startsWith('http')) {
        const img = new Image(); img.src = u;
      }
    });
  }, [clearTimers]);

  const pollTask = useCallback(async (taskUrl: string) => {
    if (!taskUrl || taskUrl === "undefined") return;
    try {
      if (pollCountRef.current >= 40) {
        throw new Error("Generation timed out. Please try again.");
      }
      pollCountRef.current++;

      const res = await fetch(`/api/ai-image?task_url=${encodeURIComponent(taskUrl)}`, {
        signal: abortControllerRef.current?.signal,
        cache: 'no-store'
      });

      if (!res.ok) {
        if (res.status >= 400 && res.status < 500) throw new Error(`Polling failed (${res.status})`);
        pollTimerRef.current = setTimeout(() => pollTask(taskUrl), 10000);
        return;
      }

      const contentType = res.headers.get("content-type") || "";
      if (contentType.includes("image/")) {
        const blob = await res.blob();
        clearObjectUrl();
        const objectUrl = URL.createObjectURL(blob);
        objectUrlRef.current = objectUrl;
        finishSuccess([objectUrl]);
        return;
      }

      if (!contentType.includes("application/json")) {
        pollTimerRef.current = setTimeout(() => pollTask(taskUrl), 10000);
        return;
      }

      const data = await res.json();
      const status = String(data.status || "").toLowerCase();
      const isDone = status === "done" || status === "completed" || status === "success" || (Array.isArray(data.urls) && data.urls.length > 0) || !!data.url;
      const isFailed = status === "failed" || status === "error" || !!data.error;

      if (isDone) {
        const results = data.urls || (data.url ? [data.url] : []);
        finishSuccess(results);
      } else if (isFailed) {
        throw new Error(data.error || "Generation task failed.");
      } else {
        setProgress(prev => Math.min(98, prev + 2));
        pollTimerRef.current = setTimeout(() => pollTask(taskUrl), 10000);
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || "Something went wrong during polling.");
      setLoading(false);
      clearTimers();
    }
  }, [finishSuccess, clearObjectUrl, clearTimers]);

  async function handleGenerate(e?: React.FormEvent) {
    if (e) e.preventDefault();
    if (!prompt.trim() || loading) return;

    if (abortControllerRef.current) abortControllerRef.current.abort();
    abortControllerRef.current = new AbortController();

    setLoading(true);
    setError(null);
    clearObjectUrl();
    setImageUrl(null);
    setUrls(null);
    setImageLoaded(false);
    setProgress(5);
    pollCountRef.current = 0;
    clearTimers();

    messageTimerRef.current = setInterval(() => {
      if (document.hidden) return;
      setLoadingMessage(LOADING_MESSAGES[Math.floor(Math.random() * LOADING_MESSAGES.length)]);
    }, 2500);

    progressTimerRef.current = setInterval(() => {
      if (document.hidden) return;
      setProgress((p) => Math.min(90, p + (Math.random() * 2)));
    }, 1200);

    try {
      const q = new URLSearchParams({ text: prompt, ratio, model });
      const res = await fetch(`/api/ai-image?${q.toString()}`, {
        signal: abortControllerRef.current.signal,
        cache: 'no-store'
      });

      const data = await res.json().catch(() => ({ ok: false, error: "Cloud connection failed" }));
      if (!res.ok || !data.ok) {
        throw new Error(data.error || `Request failed (${res.status})`);
      }

      if (data.ok && data.urls?.length > 0) {
        finishSuccess(data.urls);
      } else if (data.task_url || data.taskUrl) {
        pollTask(data.task_url || data.taskUrl);
      } else {
        throw new Error(data.error || "No task ID returned");
      }
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      setError(err.message || "Generation failed.");
      setLoading(false);
      clearTimers();
    }
  }

  // --- RENDER ---

  const canGenerate = prompt.trim().length > 0 && !loading;

  return (
    <div className="relative min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 md:p-8 font-sans text-white overflow-hidden selection:bg-white/20">

      {/* --- Background Elements --- */}
      <div className="fixed inset-0 pointer-events-none -z-10 bg-[#080808]">
        <div className="absolute top-0 inset-x-0 h-1/3 bg-gradient-to-b from-[#111111] to-transparent z-10" />

        {/* Animated colorful blurs */}
        <div className={`absolute -top-[10%] -left-[10%] w-[60%] h-[60%] bg-[#3b82f6] rounded-full mix-blend-screen filter blur-[100px] sm:blur-[120px] transition-opacity duration-1000 ${loading ? 'opacity-10' : 'opacity-30 animate-pulse'}`} />
        <div className={`absolute top-[10%] -right-[10%] w-[50%] h-[50%] bg-[#6366f1] rounded-full mix-blend-screen filter blur-[100px] sm:blur-[120px] transition-opacity duration-1000 ${loading ? 'opacity-10' : 'opacity-30'}`} />
        <div className={`absolute -bottom-[20%] -left-[10%] w-[70%] h-[70%] bg-[#ec4899] rounded-full mix-blend-screen filter blur-[120px] sm:blur-[150px] transition-opacity duration-1000 ${loading ? 'opacity-10' : 'opacity-40'}`} />
        <div className={`absolute -bottom-[20%] -right-[10%] w-[70%] h-[70%] bg-[#f43f5e] rounded-full mix-blend-screen filter blur-[120px] sm:blur-[150px] transition-opacity duration-1000 ${loading ? 'opacity-10' : 'opacity-40'}`} />
      </div>

      {/* --- Dim Overlay when Generating --- */}
      <div className={`fixed inset-0 bg-black/30 backdrop-blur-[2px] transition-all duration-1000 ease-in-out pointer-events-none z-0 ${loading ? 'opacity-100' : 'opacity-0'}`} />

      {/* --- Main Content Area --- */}
      <div className="relative z-10 w-full flex flex-col items-center gap-12">

        {/* --- Image Display Area --- */}
        <AnimatePresence mode="wait">
          {imageUrl && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="w-full max-w-[800px] aspect-video rounded-[32px] overflow-hidden bg-black/40 border border-white/5 shadow-2xl relative group"
            >
              <img
                src={imageUrl}
                alt="Generated"
                className={`w-full h-full object-contain transition-opacity duration-1000 ${imageLoaded ? 'opacity-100' : 'opacity-0'}`}
                onLoad={() => setImageLoaded(true)}
              />
              {!imageLoaded && (
                <div className="absolute inset-0 bg-white/5 animate-pulse flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white/20 border-t-white/80 rounded-full animate-spin" />
                </div>
              )}
            </motion.div>
          )}

          {error && !imageUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-[680px] p-8 rounded-3xl border border-red-500/20 bg-red-500/5 text-center flex flex-col items-center gap-4"
            >
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20">
                <span className="text-red-500 text-xl font-normal">!</span>
              </div>
              <p className="text-red-400 text-sm leading-relaxed">{error}</p>
              <button onClick={() => setError(null)} className="text-[10px] uppercase tracking-widest text-white/60 hover:text-white transition-colors">Dismiss</button>
            </motion.div>
          )}

          {loading && !imageUrl && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="w-full max-w-[680px] p-12 text-center flex flex-col items-center gap-6"
            >
              <div className="w-16 h-16 relative">
                <div className="absolute inset-0 border-4 border-white/10 rounded-full" />
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="absolute inset-0 border-4 border-white/40 border-t-transparent rounded-full"
                />
              </div>
              <div className="space-y-2">
                <p className="text-white/80 text-sm tracking-widest uppercase font-medium">{loadingMessage}</p>
                <p className="text-white/45 text-[10px] font-mono">{Math.round(progress)}% COMPLETE</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* --- Main Input Container --- */}
        <div className={`relative w-full max-w-[680px] p-[2px] rounded-[24px] sm:rounded-[32px] transition-all duration-700 ease-out ${loading
            ? 'scale-[1.02] sm:scale-[1.04] shadow-[0_0_80px_-10px_rgba(255,255,255,0.15)] -translate-y-[10px]'
            : isFocused
              ? 'scale-100 shadow-[0_20px_60px_-15px_rgba(0,0,0,0.8)]'
              : 'scale-100 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.6)]'
          }`}>

          {/* Traveling Glow Border Effect */}
          {loading && (
            <div className="absolute inset-0 rounded-[24px] sm:rounded-[32px] overflow-hidden pointer-events-none">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2.5, repeat: Infinity, ease: "linear" }}
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[200%] aspect-square bg-[conic-gradient(from_0deg,transparent_70%,rgba(255,255,255,0.8)_100%)]"
              />
            </div>
          )}

          {/* Static subtle border (visible when not generating) */}
          {!loading && (
            <div className={`absolute inset-0 rounded-[24px] sm:rounded-[32px] border pointer-events-none z-20 transition-colors duration-300 ${isFocused ? 'border-white/20' : 'border-white/10'}`} />
          )}

          {/* Content Box */}
          <div className="relative w-full bg-[#1a1a1a]/90 sm:bg-[#1a1a1a]/95 backdrop-blur-3xl rounded-[22px] sm:rounded-[30px] p-3 sm:p-4 pt-4 sm:pt-5 flex flex-col gap-3 z-10">

            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onFocus={() => setIsFocused(true)}
              onBlur={() => setIsFocused(false)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleGenerate();
                }
              }}
              disabled={loading}
              placeholder={loading ? "Synthesizing pixels..." : "Describe the image you want to create..."}
              className="w-full bg-transparent text-white/95 placeholder:text-white/50 focus:outline-none resize-none min-h-[44px] max-h-[150px] sm:max-h-[200px] text-[15px] sm:text-[16px] leading-relaxed px-2 overflow-y-auto custom-scrollbar disabled:cursor-not-allowed transition-opacity duration-500"
              rows={1}
            />

            <div className="flex items-center justify-between pt-1">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  className="p-2 sm:p-2.5 text-white/60 hover:text-white/80 hover:bg-white/10 rounded-full transition-all duration-200 disabled:opacity-20 active:scale-95"
                  disabled={loading}
                  aria-label="Add attachment"
                >
                  <PlusIcon />
                </button>

                {/* Model Select */}
                <div className="relative" ref={modelMenuRef}>
                  <button
                    onClick={() => setIsModelOpen(!isModelOpen)}
                    disabled={loading}
                    className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${isModelOpen ? 'bg-white/15 text-white shadow-inner' : 'text-white/50 hover:text-white/90 hover:bg-white/10'} disabled:opacity-50`}
                  >
                    <SparklesIcon />
                    <span className="hidden xs:inline">{MODELS.find(m => m.id === model)?.label || 'Model'}</span>
                  </button>

                  {/* Dropdown Menu */}
                  <AnimatePresence>
                    {isModelOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-full left-0 mb-2 w-48 bg-[#2a2a2a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-1.5 z-50 transform origin-bottom-left"
                      >
                        {MODELS.map(m => (
                          <button
                            key={m.id}
                            onClick={() => { setModel(m.id); setIsModelOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-[13px] sm:text-sm transition-colors ${model === m.id ? 'text-white font-medium bg-white/5' : 'text-white/60 hover:bg-white/5 hover:text-white/90'}`}
                          >
                            {m.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Ratio Select */}
                <div className="relative" ref={ratioMenuRef}>
                  <button
                    onClick={() => setIsRatioOpen(!isRatioOpen)}
                    disabled={loading}
                    className={`flex items-center gap-1.5 px-3 py-2 sm:py-1.5 rounded-full text-xs sm:text-sm font-medium transition-all duration-200 ${isRatioOpen ? 'bg-white/15 text-white shadow-inner' : 'text-white/50 hover:text-white/90 hover:bg-white/10'} disabled:opacity-50`}
                  >
                    <RatioIcon />
                    <span className="hidden xs:inline">{ratio}</span>
                  </button>

                  <AnimatePresence>
                    {isRatioOpen && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="absolute bottom-full left-0 mb-2 w-36 bg-[#2a2a2a]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl py-1.5 z-50 transform origin-bottom-left"
                      >
                        {RATIOS.map(r => (
                          <button
                            key={r.id}
                            onClick={() => { setRatio(r.id); setIsRatioOpen(false); }}
                            className={`w-full text-left px-4 py-2.5 text-[13px] sm:text-sm transition-colors ${ratio === r.id ? 'text-white font-medium bg-white/5' : 'text-white/60 hover:bg-white/5 hover:text-white/90'}`}
                          >
                            {r.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>

              {/* Submit Button */}
              <button
                onClick={() => handleGenerate()}
                disabled={!canGenerate}
                className={`ml-2 p-2.5 sm:p-2 rounded-full flex items-center justify-center transition-all duration-300 ${loading
                    ? 'bg-white text-black opacity-100 scale-95 shadow-[0_0_20px_rgba(255,255,255,0.3)]'
                    : canGenerate
                      ? 'bg-white text-black hover:bg-gray-200 shadow-[0_4px_14px_rgba(255,255,255,0.25)] transform hover:scale-105 active:scale-95'
                      : 'bg-[#333] text-white/45'
                  }`}
              >
                {loading ? (
                  <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-black/20 border-t-black rounded-full animate-spin" />
                ) : (
                  <ArrowUpIcon />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* --- Global Styles --- */}
      <style jsx global>{`
        /* Extra small screen helper class for text truncation/hiding */
        @media (min-width: 400px) { .xs\\:inline { display: inline; } }
        
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.1);
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(255, 255, 255, 0.2);
        }
      `}</style>
    </div>
  );
}
