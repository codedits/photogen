"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ExternalLink, Film, Image as ImageIcon, Loader2, Save, SunMedium, Upload } from "lucide-react";
import { useToast } from "./page";
import RichTextEditor from "./components/RichTextEditor";

type HeroMediaType = "image" | "video";

type HeroMediaRef = {
  url: string;
  public_id: string;
};

type HeroSettings = {
  introText: string;
  mainHeadline: string;
  image: HeroMediaRef;
  video: HeroMediaRef;
  mediaType: HeroMediaType;
  overlayBrightness: number;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
};

interface HeroSettingsManagementProps {
  onDirtyChange?: (dirty: boolean) => void;
}

const defaultSettings: HeroSettings = {
  introText: "",
  mainHeadline: "",
  image: {
    url: "",
    public_id: "",
  },
  video: {
    url: "",
    public_id: "",
  },
  mediaType: "image",
  overlayBrightness: 0.85,
  ctaText: "Gallery",
  ctaLink: "/gallery",
  secondaryCtaText: "Contact",
  secondaryCtaLink: "/contact",
};

function normalizeMediaRef(value: unknown): HeroMediaRef {
  if (!value || typeof value !== "object") {
    return { url: "", public_id: "" };
  }

  const media = value as Record<string, unknown>;
  return {
    url: typeof media.url === "string" ? media.url : "",
    public_id: typeof media.public_id === "string" ? media.public_id : "",
  };
}

function normalizeHeroSettings(value: unknown): HeroSettings {
  if (!value || typeof value !== "object") {
    return defaultSettings;
  }

  const raw = value as Record<string, unknown>;

  return {
    introText: typeof raw.introText === "string" ? raw.introText : defaultSettings.introText,
    mainHeadline: typeof raw.mainHeadline === "string" ? raw.mainHeadline : defaultSettings.mainHeadline,
    image: {
      ...defaultSettings.image,
      ...normalizeMediaRef(raw.image),
    },
    video: {
      ...defaultSettings.video,
      ...normalizeMediaRef(raw.video),
    },
    mediaType: raw.mediaType === "video" ? "video" : "image",
    overlayBrightness:
      typeof raw.overlayBrightness === "number" && Number.isFinite(raw.overlayBrightness)
        ? Math.min(1, Math.max(0.1, raw.overlayBrightness))
        : defaultSettings.overlayBrightness,
    ctaText: typeof raw.ctaText === "string" ? raw.ctaText : defaultSettings.ctaText,
    ctaLink: typeof raw.ctaLink === "string" ? raw.ctaLink : defaultSettings.ctaLink,
    secondaryCtaText:
      typeof raw.secondaryCtaText === "string" ? raw.secondaryCtaText : defaultSettings.secondaryCtaText,
    secondaryCtaLink:
      typeof raw.secondaryCtaLink === "string" ? raw.secondaryCtaLink : defaultSettings.secondaryCtaLink,
  };
}

function parseSnapshot(snapshot: string): HeroSettings {
  try {
    return normalizeHeroSettings(JSON.parse(snapshot));
  } catch {
    return defaultSettings;
  }
}

export default function HeroSettingsManagement({ onDirtyChange }: HeroSettingsManagementProps) {
  const { addToast } = useToast();
  const isMountedRef = useRef(true);
  const initialImagePublicIdRef = useRef("");
  const initialVideoPublicIdRef = useRef("");
  const latestImagePublicIdRef = useRef("");
  const latestVideoPublicIdRef = useRef("");
  const initialSnapshotRef = useRef(JSON.stringify(defaultSettings));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(defaultSettings);

  const currentSnapshot = useMemo(() => JSON.stringify(heroSettings), [heroSettings]);
  const isDirty = !loading && currentSnapshot !== initialSnapshotRef.current;
  const uploadingMedia = uploadingImage || uploadingVideo;
  const activeMediaType = heroSettings.mediaType;
  const activeMediaUrl = activeMediaType === "video" ? heroSettings.video.url : heroSettings.image.url;

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    latestImagePublicIdRef.current = heroSettings.image?.public_id || "";
  }, [heroSettings.image?.public_id]);

  useEffect(() => {
    latestVideoPublicIdRef.current = heroSettings.video?.public_id || "";
  }, [heroSettings.video?.public_id]);

  useEffect(() => {
    if (!activeMediaUrl) {
      setPreviewLoading(false);
      return;
    }

    // When media changes, we start loading the new preview
    setPreviewLoading(true);

    const timeoutId = window.setTimeout(() => {
      if (isMountedRef.current) {
        setPreviewLoading(false);
      }
    }, 8000);

    return () => {
      window.clearTimeout(timeoutId);
    };
  }, [activeMediaUrl, activeMediaType]);

  // Handle immediate state changes for existing media that might already be cached or fast-loading
  useEffect(() => {
    const video = document.querySelector("#hero-preview-video") as HTMLVideoElement;
    const img = document.querySelector("#hero-preview-img") as HTMLImageElement;

    if (activeMediaType === "video" && video?.readyState >= 3) {
      setPreviewLoading(false);
    } else if (activeMediaType === "image" && img?.complete) {
      setPreviewLoading(false);
    }
  }, [activeMediaUrl, activeMediaType]);

  const cleanupCloudinaryUpload = useCallback((publicId: string, resourceType: HeroMediaType) => {
    if (!publicId) return;

    fetch("/api/upload-image", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ public_id: publicId, resource_type: resourceType }),
    }).catch(() => {});
  }, []);

  const persistHeroMediaPatch = useCallback(
    async (patch: Partial<Pick<HeroSettings, "mediaType" | "image" | "video">>) => {
      const res = await fetch("/api/admin/settings/hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(patch),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data as { error?: string } | null)?.error || "Failed to persist hero media");
      }

      const persisted = normalizeHeroSettings((data as { settings?: unknown } | null)?.settings ?? patch);
      const snapshot = parseSnapshot(initialSnapshotRef.current);
      const nextSnapshot: HeroSettings = {
        ...snapshot,
        mediaType: patch.mediaType ? persisted.mediaType : snapshot.mediaType,
        image: patch.image ? persisted.image : snapshot.image,
        video: patch.video ? persisted.video : snapshot.video,
      };

      initialSnapshotRef.current = JSON.stringify(nextSnapshot);
      initialImagePublicIdRef.current = nextSnapshot.image.public_id || "";
      initialVideoPublicIdRef.current = nextSnapshot.video.public_id || "";

      if (isMountedRef.current) {
        setHeroSettings((prev) => ({
          ...prev,
          mediaType: patch.mediaType ? persisted.mediaType : prev.mediaType,
          image: patch.image ? persisted.image : prev.image,
          video: patch.video ? persisted.video : prev.video,
        }));
      }
    },
    []
  );

  const uploadToCloudinary = useCallback(
    async (file: File, resourceType: HeroMediaType, folder: string): Promise<HeroMediaRef> => {
      const signatureRes = await fetch("/api/admin/cloudinary-signature", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder, resourceType }),
      });
      const signatureData = await signatureRes.json();
      if (!signatureRes.ok || !signatureData?.ok) {
        throw new Error(signatureData?.error || "Failed to initialize upload");
      }

      const effectiveResourceType =
        signatureData.resourceType === "video" || signatureData.resourceType === "image"
          ? signatureData.resourceType
          : resourceType;

      const formData = new FormData();
      formData.append("file", file, file.name);
      formData.append("api_key", signatureData.apiKey);
      formData.append("timestamp", String(signatureData.timestamp));
      formData.append("signature", signatureData.signature);
      formData.append("folder", signatureData.folder);
      formData.append("resource_type", effectiveResourceType);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${effectiveResourceType}/upload`,
        { method: "POST", body: formData }
      );
      const uploadData = await uploadRes.json();
      if (!uploadRes.ok || !uploadData?.secure_url || !uploadData?.public_id) {
        throw new Error(uploadData?.error?.message || "Media upload failed");
      }

      return { url: uploadData.secure_url as string, public_id: uploadData.public_id as string };
    },
    []
  );

  useEffect(() => {
    isMountedRef.current = true;
    const controller = new AbortController();

    const fetchHero = async () => {
      try {
        const heroRes = await fetch("/api/admin/settings/hero", {
          cache: "no-store",
          signal: controller.signal,
        });
        const heroData = await heroRes.json();
        if (!heroData.error && isMountedRef.current && !controller.signal.aborted) {
          const merged = normalizeHeroSettings(heroData);
          setHeroSettings(merged);
          initialImagePublicIdRef.current = merged.image?.public_id || "";
          initialVideoPublicIdRef.current = merged.video?.public_id || "";
          initialSnapshotRef.current = JSON.stringify(merged);
          latestImagePublicIdRef.current = merged.image?.public_id || "";
          latestVideoPublicIdRef.current = merged.video?.public_id || "";
        }
      } catch (err) {
        if ((err as Error)?.name !== "AbortError") {
          console.error("Failed to fetch hero settings:", err);
          addToast("Failed to load hero settings", "error");
        }
      } finally {
        if (isMountedRef.current && !controller.signal.aborted) {
          setLoading(false);
        }
      }
    };

    fetchHero();

    return () => {
      isMountedRef.current = false;
      controller.abort();

      const currentImagePublicId = latestImagePublicIdRef.current;
      if (currentImagePublicId && currentImagePublicId !== initialImagePublicIdRef.current) {
        cleanupCloudinaryUpload(currentImagePublicId, "image");
      }

      const currentVideoPublicId = latestVideoPublicIdRef.current;
      if (currentVideoPublicId && currentVideoPublicId !== initialVideoPublicIdRef.current) {
        cleanupCloudinaryUpload(currentVideoPublicId, "video");
      }

      onDirtyChange?.(false);
    };
  }, [addToast, cleanupCloudinaryUpload, onDirtyChange]);

  const handleSaveHero = async () => {
    if (saving || uploadingMedia) return;
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heroSettings),
      });

      const data = await res.json().catch(() => null);
      if (!res.ok) {
        throw new Error((data as { error?: string } | null)?.error || "Failed to save");
      }

      const normalizedSaved = normalizeHeroSettings((data as { settings?: unknown } | null)?.settings ?? heroSettings);
      setHeroSettings(normalizedSaved);
      initialImagePublicIdRef.current = normalizedSaved.image?.public_id || "";
      initialVideoPublicIdRef.current = normalizedSaved.video?.public_id || "";
      latestImagePublicIdRef.current = normalizedSaved.image?.public_id || "";
      latestVideoPublicIdRef.current = normalizedSaved.video?.public_id || "";
      initialSnapshotRef.current = JSON.stringify(normalizedSaved);

      onDirtyChange?.(false);
      addToast("Hero section updated", "success");
    } catch (err) {
      addToast((err as Error)?.message || "Failed to update hero settings", "error");
    } finally {
      if (isMountedRef.current) {
        setSaving(false);
      }
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    setPreviewLoading(true);
    try {
      const uploaded = await uploadToCloudinary(file, "image", "photogen/hero/images");

      if (!isMountedRef.current) return;

      // Only delete prior temporary uploads that were never persisted.
      const prevPublicId = latestImagePublicIdRef.current;
      if (prevPublicId && prevPublicId !== uploaded.public_id && prevPublicId !== initialImagePublicIdRef.current) {
        cleanupCloudinaryUpload(prevPublicId, "image");
      }

      setHeroSettings((prev) => ({
        ...prev,
        mediaType: "image",
        image: uploaded,
      }));
      latestImagePublicIdRef.current = uploaded.public_id;

      try {
        await persistHeroMediaPatch({ mediaType: "image", image: uploaded });
        addToast("Hero image uploaded and saved", "success");
      } catch (persistErr) {
        addToast(
          (persistErr as Error)?.message || "Image uploaded, but DB save failed. Click Save Hero Section.",
          "error"
        );
      } finally {
        if (isMountedRef.current) {
          setPreviewLoading(false);
        }
      }
    } catch (err) {
      addToast((err as Error)?.message || "Image upload failed", "error");
      setPreviewLoading(false);
    } finally {
      if (e.currentTarget) {
        e.currentTarget.value = "";
      }
      if (isMountedRef.current) {
        setUploadingImage(false);
      }
    }
  };

  const handleHeroVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingVideo(true);
    setPreviewLoading(true);
    try {
      const uploaded = await uploadToCloudinary(file, "video", "photogen/hero/videos");

      if (!isMountedRef.current) return;

      const prevPublicId = latestVideoPublicIdRef.current;
      if (prevPublicId && prevPublicId !== uploaded.public_id && prevPublicId !== initialVideoPublicIdRef.current) {
        cleanupCloudinaryUpload(prevPublicId, "video");
      }

      setHeroSettings((prev) => ({
        ...prev,
        mediaType: "video",
        video: uploaded,
      }));
      latestVideoPublicIdRef.current = uploaded.public_id;

      try {
        await persistHeroMediaPatch({ mediaType: "video", video: uploaded });
        addToast("Hero video uploaded and saved", "success");
      } catch (persistErr) {
        addToast(
          (persistErr as Error)?.message || "Video uploaded, but DB save failed. Click Save Hero Section.",
          "error"
        );
      } finally {
        if (isMountedRef.current) {
          setPreviewLoading(false);
        }
      }
    } catch (err) {
      addToast((err as Error)?.message || "Video upload failed", "error");
      setPreviewLoading(false);
    } finally {
      if (e.currentTarget) {
        e.currentTarget.value = "";
      }
      if (isMountedRef.current) {
        setUploadingVideo(false);
      }
    }
  };

  const brightnessPct = useMemo(() => Math.round((heroSettings.overlayBrightness || 0.85) * 100), [heroSettings.overlayBrightness]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-16">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-normal text-white tracking-tight">Hero Section</h2>
          <p className="text-zinc-500 text-sm mt-1">Edit hero media, overlay, copy, and CTA links with instant preview.</p>
        </div>
        <button
          onClick={handleSaveHero}
          disabled={saving || uploadingMedia}
          className="flex items-center gap-2 px-4 py-2 bg-zinc-100 text-zinc-900 rounded-md font-medium hover:bg-white transition-colors disabled:opacity-50"
        >
          {saving ? <Loader2 size={18} className="animate-spin" /> : <Save size={18} />}
          Save Hero Section
        </button>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1fr)_380px] gap-6 items-start">
        <div className="space-y-6">
          <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 space-y-4">
            <h3 className="text-sm font-normal text-zinc-400 uppercase tracking-wider">Hero Copy</h3>
            <div className="grid grid-cols-1 2xl:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Intro Text</label>
                <RichTextEditor
                  content={heroSettings.introText}
                  onChange={(content) => setHeroSettings({ ...heroSettings, introText: content })}
                  placeholder="Subtle line above headline"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-medium text-zinc-300">Main Headline</label>
                <RichTextEditor
                  content={heroSettings.mainHeadline}
                  onChange={(content) => setHeroSettings({ ...heroSettings, mainHeadline: content })}
                  placeholder="Main hero headline"
                />
              </div>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 space-y-4">
            <h3 className="text-sm font-normal text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <SunMedium size={14} /> Appearance
            </h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="text-xs font-medium text-zinc-300">Overlay Brightness</label>
                <span className="text-[10px] bg-zinc-800 px-2 py-0.5 rounded text-zinc-400 font-mono">{brightnessPct}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="1.0"
                step="0.05"
                value={heroSettings.overlayBrightness || 0.85}
                onChange={(e) => setHeroSettings({ ...heroSettings, overlayBrightness: parseFloat(e.target.value) })}
                className="w-full h-1.5 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-white"
              />
              <p className="text-[10px] text-zinc-500 italic">Lower values darken the image and improve text contrast.</p>
            </div>
          </div>

          <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 space-y-4">
            <h3 className="text-sm font-normal text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <ExternalLink size={14} /> Call To Actions
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-tight">Primary Button Text</label>
                <input
                  type="text"
                  value={heroSettings.ctaText || ""}
                  onChange={(e) => setHeroSettings({ ...heroSettings, ctaText: e.target.value })}
                  placeholder="View Gallery"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-tight">Primary Link</label>
                <input
                  type="text"
                  value={heroSettings.ctaLink || ""}
                  onChange={(e) => setHeroSettings({ ...heroSettings, ctaLink: e.target.value })}
                  placeholder="/gallery"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none font-mono"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-tight">Secondary Button Text</label>
                <input
                  type="text"
                  value={heroSettings.secondaryCtaText || ""}
                  onChange={(e) => setHeroSettings({ ...heroSettings, secondaryCtaText: e.target.value })}
                  placeholder="Contact"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none"
                />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-medium text-zinc-400 uppercase tracking-tight">Secondary Link</label>
                <input
                  type="text"
                  value={heroSettings.secondaryCtaLink || ""}
                  onChange={(e) => setHeroSettings({ ...heroSettings, secondaryCtaLink: e.target.value })}
                  placeholder="/contact"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-md px-3 py-2 text-sm text-white focus:border-zinc-500 outline-none font-mono"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="space-y-4 xl:sticky xl:top-6">
          <div className="bg-zinc-900/50 p-5 rounded-xl border border-zinc-800 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-normal text-zinc-400 uppercase tracking-wider">Live Preview</h3>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHeroSettings((prev) => ({ ...prev, mediaType: "image" }))}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-md border transition-colors ${
                    heroSettings.mediaType === "image"
                      ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                      : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <ImageIcon size={12} /> Image
                </button>
                <button
                  type="button"
                  onClick={() => setHeroSettings((prev) => ({ ...prev, mediaType: "video" }))}
                  className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-[11px] rounded-md border transition-colors ${
                    heroSettings.mediaType === "video"
                      ? "bg-zinc-100 text-zinc-900 border-zinc-100"
                      : "bg-zinc-900 text-zinc-300 border-zinc-700 hover:border-zinc-500"
                  }`}
                >
                  <Film size={12} /> Video
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-2 text-[11px] rounded-md bg-zinc-100 text-zinc-900 hover:bg-white transition-colors disabled:opacity-50">
                {uploadingImage ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Upload Image
                <input
                  type="file"
                  className="hidden"
                  accept="image/*"
                  disabled={uploadingMedia}
                  onChange={handleHeroImageUpload}
                />
              </label>

              <label className="cursor-pointer inline-flex items-center justify-center gap-2 px-3 py-2 text-[11px] rounded-md bg-zinc-800 text-zinc-100 hover:bg-zinc-700 transition-colors disabled:opacity-50">
                {uploadingVideo ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Upload Video
                <input
                  type="file"
                  className="hidden"
                  accept="video/*"
                  disabled={uploadingMedia}
                  onChange={handleHeroVideoUpload}
                />
              </label>
            </div>

            <p className="text-[10px] text-zinc-500">
              Active media: <span className="text-zinc-300 uppercase">{heroSettings.mediaType}</span>
            </p>

            <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
              {heroSettings.mediaType === "video" && heroSettings.video.url ? (
                <video
                  id="hero-preview-video"
                  src={heroSettings.video.url}
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{ filter: `brightness(${heroSettings.overlayBrightness || 0.85})` }}
                  autoPlay
                  loop
                  muted
                  playsInline
                  preload="auto"
                  onLoadedData={() => setPreviewLoading(false)}
                  onCanPlay={() => setPreviewLoading(false)}
                  onError={() => setPreviewLoading(false)}
                />
              ) : heroSettings.image.url ? (
                <img
                  id="hero-preview-img"
                  src={heroSettings.image.url}
                  alt="Hero preview"
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{ filter: `brightness(${heroSettings.overlayBrightness || 0.85})` }}
                  onLoad={() => setPreviewLoading(false)}
                  onError={() => setPreviewLoading(false)}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-600">
                  {heroSettings.mediaType === "video" ? <Film size={28} /> : <ImageIcon size={28} />}
                  <span className="text-xs">
                    {heroSettings.mediaType === "video" ? "Upload hero video" : "Upload hero image"}
                  </span>
                </div>
              )}

              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

              <div className="absolute inset-x-0 bottom-0 p-4 text-white space-y-3">
                <div className="text-[9px] uppercase tracking-[0.25em] text-white/70" dangerouslySetInnerHTML={{ __html: heroSettings.introText || "Intro text" }} />
                <div className="text-xl leading-tight font-light" dangerouslySetInnerHTML={{ __html: heroSettings.mainHeadline || "Your headline preview" }} />
                <div className="flex gap-2 pt-1">
                  <span className="inline-flex items-center justify-center text-[10px] px-3 h-7 rounded-full bg-white text-black">
                    {heroSettings.ctaText || "Gallery"}
                  </span>
                  <span className="inline-flex items-center justify-center text-[10px] px-3 h-7 rounded-full bg-white/15 border border-white/25 text-white">
                    {heroSettings.secondaryCtaText || "Contact"}
                  </span>
                </div>
              </div>

              {(uploadingMedia || (previewLoading && !!activeMediaUrl)) && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <div className="flex items-center gap-2 text-white">
                    <Loader2 className="animate-spin" />
                    <span className="text-xs">
                      {uploadingMedia ? "Uploading media..." : "Loading preview..."}
                    </span>
                  </div>
                </div>
              )}
            </div>

            <p className="text-[10px] text-zinc-500 text-center">
              Uploaded media is persisted to DB immediately. Use Save for text/CTA/appearance edits.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
