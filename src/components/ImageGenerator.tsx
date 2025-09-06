"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type StyleOption = {
  label: string;
  value: string;
};

const STYLE_OPTIONS: StyleOption[] = [
  { label: "Single Portrait", value: "single-portrait" },
  { label: "Anime", value: "anime" },
  { label: "Watercolor", value: "watercolor" },
  { label: "Photo-Realistic", value: "photo-realistic" },
  { label: "Logo", value: "logo" },
  { label: "Fantasy", value: "fantasy" },
  { label: "Minimalist", value: "minimalist" },
  { label: "Cinematic", value: "cinematic" },
  { label: "Isometric", value: "isometric" },
  { label: "Group Portrait", value: "group-portrait" },
];

export default function ImageGenerator() {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<string>(STYLE_OPTIONS[0].value);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastObjectUrlRef = useRef<string | null>(null);

  // Revoke previous object URLs to avoid memory leaks
  useEffect(() => {
    return () => {
      if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
    };
  }, []);

  const canGenerate = useMemo(() => prompt.trim().length > 0 && !loading, [prompt, loading]);

  async function handleGenerate(e?: React.FormEvent) {
    e?.preventDefault();
    if (!canGenerate) return;
    setLoading(true);
    setError(null);
    setImageUrl(null);

    try {
      const res = await fetch(`/api/ai-image?text=${encodeURIComponent(prompt)}&style=${encodeURIComponent(style)}`);
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
          const statusRes = await fetch(`/api/ai-image?task_url=${encodeURIComponent(taskUrl)}`);
          const sc = statusRes.status;
          const sct = statusRes.headers.get("content-type") || "";
          if (sc === 200 && !sct.includes("application/json")) {
            // final image bytes
            const blob = await statusRes.blob();
            const objUrl = URL.createObjectURL(blob);
            if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
            lastObjectUrlRef.current = objUrl;
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

      const blob = await res.blob();
      const objUrl = URL.createObjectURL(blob);
      if (lastObjectUrlRef.current) URL.revokeObjectURL(lastObjectUrlRef.current);
      lastObjectUrlRef.current = objUrl;
      setImageUrl(objUrl);
    } catch (err: any) {
      setError(err?.message || "Something went wrong");
      setImageUrl(null);
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setPrompt("");
    setImageUrl(null);
    setError(null);
  }

  return (
    <section id="ai-studio" className="py-10 sm:py-16">
      <div className="max-w-[1100px] w-full mx-auto px-4">
        <div className="max-w-[920px] mx-auto text-center">
          <h1 className="text-white text-glow drop-shadow-lg leading-tight md:leading-snug"
            style={{ fontWeight: 600, fontSize: "clamp(1.5rem, 3.5vw, 2.25rem)" }}>
            PhotoGen Ai Studio
          </h1>
          <p className="mt-2 text-zinc-300" style={{ fontSize: "clamp(0.95rem, 2vw, 1.05rem)" }}>
            Generate images from text prompts. Pick a style, create, and download.
          </p>

          <div className="mt-6">
            <form
              onSubmit={handleGenerate}
              className="bg-white/5 border border-white/10 rounded-2xl p-3 sm:p-5 backdrop-blur flex flex-col sm:flex-row gap-3 items-stretch"
            >
              <input
                type="text"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe your image (e.g., a vintage car parked under neon lights)"
                className="w-full sm:flex-1 rounded-xl px-3 py-2 sm:px-4 sm:py-3 bg-black/30 border border-white/10 text-white placeholder:text-zinc-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
              />

              <select
                value={style}
                onChange={(e) => setStyle(e.target.value)}
                className="w-full sm:w-auto rounded-xl px-3 py-2 sm:px-4 sm:py-3 bg-black/30 border border-white/10 text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400"
                aria-label="Select style"
              >
                {STYLE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <button
                type="submit"
                disabled={!canGenerate}
                className="w-full sm:w-auto rounded-xl px-4 py-2 sm:px-5 sm:py-3 bg-white text-black font-medium shadow hover:brightness-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? "Generating…" : "Generate"}
              </button>
            </form>

            <div className="mt-2 text-sm text-zinc-300">
              {error ? <span className="text-red-300">{error}</span> : loading ? <span>Queued / generating…</span> : <span>Tip: try "cinematic" or "photo-realistic" styles.</span>}
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="mt-6">
            {imageUrl ? (
              <div className="bg-white/5 border border-white/10 rounded-2xl p-4 sm:p-6">
                <div className="w-full overflow-hidden rounded-lg bg-black/40 flex items-center justify-center">
                  <img src={imageUrl} alt="Generated" className="w-full h-auto max-h-[70vh] object-contain" />
                </div>

                <div className="mt-4 flex flex-col sm:flex-row gap-3">
                  <a
                    href={imageUrl}
                    download={`photogen-${Date.now()}.png`}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl px-4 py-2 bg-white text-black font-medium shadow hover:brightness-95"
                  >
                    Download
                  </a>
                  <button
                    type="button"
                    onClick={() => handleGenerate()}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl px-4 py-2 border border-white/10 text-white hover:bg-white/5"
                  >
                    Regenerate
                  </button>
                  <button
                    type="button"
                    onClick={handleClear}
                    className="inline-flex w-full sm:w-auto items-center justify-center rounded-xl px-4 py-2 border border-white/10 text-white hover:bg-white/5"
                  >
                    Clear
                  </button>
                </div>
              </div>
            ) : (
              <div className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-zinc-400 min-h-[220px] sm:min-h-[160px]">
                {loading ? "Generating image…" : "Your image preview will appear here after generation."}
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
