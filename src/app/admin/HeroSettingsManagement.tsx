"use client";

import React, { useEffect, useMemo, useState } from "react";
import { ExternalLink, Image as ImageIcon, Loader2, Save, SunMedium, Upload } from "lucide-react";
import { useToast } from "./page";
import RichTextEditor from "./components/RichTextEditor";

type HeroSettings = {
  introText: string;
  mainHeadline: string;
  image: {
    url: string;
    public_id: string;
  };
  overlayBrightness: number;
  ctaText: string;
  ctaLink: string;
  secondaryCtaText: string;
  secondaryCtaLink: string;
};

const defaultSettings: HeroSettings = {
  introText: "",
  mainHeadline: "",
  image: {
    url: "",
    public_id: "",
  },
  overlayBrightness: 0.85,
  ctaText: "Gallery",
  ctaLink: "/gallery",
  secondaryCtaText: "Contact",
  secondaryCtaLink: "/contact",
};

export default function HeroSettingsManagement() {
  const { addToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [heroSettings, setHeroSettings] = useState<HeroSettings>(defaultSettings);

  useEffect(() => {
    const fetchHero = async () => {
      try {
        const heroRes = await fetch("/api/admin/settings/hero", { cache: "no-store" });
        const heroData = await heroRes.json();
        if (!heroData.error) {
          setHeroSettings({
            ...defaultSettings,
            ...heroData,
            image: {
              ...defaultSettings.image,
              ...(heroData.image || {}),
            },
          });
        }
      } catch (err) {
        console.error("Failed to fetch hero settings:", err);
        addToast("Failed to load hero settings", "error");
      } finally {
        setLoading(false);
      }
    };

    fetchHero();
  }, [addToast]);

  const handleSaveHero = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings/hero", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(heroSettings),
      });

      if (!res.ok) throw new Error("Failed to save");
      addToast("Hero section updated", "success");
    } catch (err) {
      addToast("Failed to update hero settings", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleHeroImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingImage(true);
    try {
      const signatureRes = await fetch("/api/admin/cloudinary-signature", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ folder: "photogen/hero" }),
      });
      const signatureData = await signatureRes.json();

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", signatureData.apiKey);
      formData.append("timestamp", String(signatureData.timestamp));
      formData.append("signature", signatureData.signature);
      formData.append("folder", signatureData.folder);

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/image/upload`,
        { method: "POST", body: formData }
      );
      const data = await uploadRes.json();

      if (data.secure_url) {
        setHeroSettings((prev) => ({
          ...prev,
          image: { url: data.secure_url, public_id: data.public_id },
        }));
        addToast("Hero image uploaded", "success");
      }
    } catch (err) {
      addToast("Image upload failed", "error");
    } finally {
      setUploadingImage(false);
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
          <p className="text-zinc-500 text-sm mt-1">Edit image, overlay, copy, and CTA links with instant preview.</p>
        </div>
        <button
          onClick={handleSaveHero}
          disabled={saving}
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
              <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 text-[11px] rounded-md bg-zinc-100 text-zinc-900 hover:bg-white transition-colors">
                {uploadingImage ? <Loader2 size={12} className="animate-spin" /> : <Upload size={12} />}
                Change Image
                <input type="file" className="hidden" accept="image/*" onChange={handleHeroImageUpload} />
              </label>
            </div>

            <div className="relative aspect-[3/4] w-full rounded-lg overflow-hidden border border-zinc-800 bg-zinc-950">
              {heroSettings.image.url ? (
                <img
                  src={heroSettings.image.url}
                  alt="Hero preview"
                  className="w-full h-full object-cover transition-all duration-300"
                  style={{ filter: `brightness(${heroSettings.overlayBrightness || 0.85})` }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-zinc-600">
                  <ImageIcon size={28} />
                  <span className="text-xs">Upload hero image</span>
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

              {uploadingImage && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <Loader2 className="animate-spin text-white" />
                </div>
              )}
            </div>

            <p className="text-[10px] text-zinc-500 text-center">Live preview updates instantly while editing.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
