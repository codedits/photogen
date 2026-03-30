"use client";

import React, { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import LiquidRiseCTA from "./LiquidRiseCTA";
import { cloudinaryPresetUrl } from "../lib/cloudinaryUrl";

interface HeroProps {
  settings?: {
    introText?: string;
    mainHeadline?: string;
    mediaType?: "image" | "video";
    updatedAt?: string;
    image?: {
      url?: string;
      public_id?: string;
    };
    video?: {
      url?: string;
      public_id?: string;
    };
    overlayBrightness?: number;
    ctaText?: string;
    ctaLink?: string;
    secondaryCtaText?: string;
    secondaryCtaLink?: string;
  };
}

function appendCacheToken(url: string, token: string) {
  if (!url || !token) return url;
  if (url.startsWith("blob:")) return url;
  const joiner = url.includes("?") ? "&" : "?";
  return `${url}${joiner}v=${encodeURIComponent(token)}`;
}

function toCompatibleHeroVideoUrl(url: string) {
  if (!url) return url;

  try {
    const parsed = new URL(url);
    const parts = parsed.pathname.split("/video/upload/");
    if (parts.length !== 2) {
      return url;
    }

    const resourcePath = parts[1].replace(/^\/+/, "");
    const looksTransformed =
      resourcePath.startsWith("f_") || resourcePath.startsWith("q_") || resourcePath.startsWith("vc_");

    if (looksTransformed) {
      return url;
    }

    const transform = "f_mp4,vc_h264,ac_aac,q_auto";
    return `${parsed.protocol}//${parsed.host}${parts[0]}/video/upload/${transform}/${resourcePath}${parsed.search}`;
  } catch {
    return url;
  }
}

export default function Hero({ settings }: HeroProps) {
  const introText = settings?.introText ?? "";
  const mainHeadline = settings?.mainHeadline ?? "";
  const heroImageSource = settings?.image?.url || "https://framerusercontent.com/images/twX7Aze7rBnuv17EgJDs5qO4nE.jpeg?width=1600";
  const rawHeroVideo = typeof settings?.video?.url === "string" ? settings.video.url.trim() : "";
  const heroVideoBase = toCompatibleHeroVideoUrl(rawHeroVideo);
  const mediaUpdateToken = settings?.updatedAt || "";
  const imageToken = settings?.image?.public_id || mediaUpdateToken;
  const videoToken = settings?.video?.public_id || mediaUpdateToken;
  const heroVideoWithToken = appendCacheToken(heroVideoBase, videoToken);
  const heroImageMobile = appendCacheToken(cloudinaryPresetUrl(heroImageSource, "hero_mobile"), imageToken);
  const heroImageDesktop = appendCacheToken(cloudinaryPresetUrl(heroImageSource, "hero"), imageToken);
  const rawMediaType = typeof settings?.mediaType === "string" ? settings.mediaType.trim().toLowerCase() : "";
  const desiredMediaType: "image" | "video" =
    rawMediaType === "video" || (rawMediaType !== "image" && !!heroVideoBase) ? "video" : "image";
  const overlayBrightness = settings?.overlayBrightness ?? 0.85;
  const ctaText = settings?.ctaText || "Gallery";
  const ctaLink = settings?.ctaLink || "/gallery";
  const secondaryCtaText = settings?.secondaryCtaText || "Studio";
  const secondaryCtaLink = settings?.secondaryCtaLink || "/studio";

  const [isLoaded, setIsLoaded] = useState(false);
  const [videoFailed, setVideoFailed] = useState(false);
  const [videoUrlAttempt, setVideoUrlAttempt] = useState<0 | 1>(0);
  const heroVideo = videoUrlAttempt === 0 ? heroVideoWithToken : heroVideoBase;
  const usingVideo = desiredMediaType === "video" && !!heroVideoBase && !videoFailed;
  const lqipUrl = heroImageSource ? appendCacheToken(cloudinaryPresetUrl(heroImageSource, "lqip"), imageToken) : "";

  React.useEffect(() => {
    setIsLoaded(false);
    setVideoFailed(false);
    setVideoUrlAttempt(0);
  }, [heroImageSource, heroVideoWithToken, heroVideoBase, desiredMediaType]);

  return (
    <section className="relative w-full flex flex-col bg-background selection:bg-white selection:text-black overflow-hidden font-sans">

      {/* Main Container: Full Width Frame with 9:16 Aspect on Mobile */}
      <div className="relative w-full h-[100dvh] md:h-screen overflow-hidden group/hero bg-zinc-950">

        {/* Cinematic Background with Slow Parallax/Scale */}
        <div className="absolute inset-0 z-0 overflow-hidden">
          {/* Static Blur Placeholder (Prevents Flash) */}
          <div
            className="absolute inset-0 z-[-1] transition-opacity duration-1000"
            style={{
              backgroundImage: lqipUrl ? `url(${lqipUrl})` : undefined,
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              filter: `blur(40px) brightness(${overlayBrightness})`,
              opacity: isLoaded ? 0 : 1
            }}
          />

          <motion.div
            initial={{ scale: 1.05, opacity: 0 }}
            animate={{
              scale: isLoaded ? 1 : 1.05,
              opacity: isLoaded ? 1 : 0
            }}
            transition={{
              duration: 1.5,
              ease: [0.16, 1, 0.3, 1],
              opacity: { duration: 0.8 }
            }}
            className="relative h-full w-full"
          >
            {usingVideo ? (
              <video
                key={heroVideo}
                src={heroVideo}
                className="h-full w-full object-cover contrast-[1.05] grayscale-[0.02]"
                style={{ filter: `brightness(${overlayBrightness})` }}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
                poster={lqipUrl || undefined}
                onLoadedMetadata={() => {
                  setVideoFailed(false);
                  setIsLoaded(true);
                }}
                onLoadedData={() => {
                  setVideoFailed(false);
                  setIsLoaded(true);
                }}
                onError={() => {
                  if (videoUrlAttempt === 0 && heroVideoBase && heroVideoWithToken !== heroVideoBase) {
                    setVideoUrlAttempt(1);
                    return;
                  }
                  setVideoFailed(true);
                  setIsLoaded(false);
                }}
              />
            ) : (
              <>
                {/* Mobile Image (9:16) */}
                <Image
                  key={heroImageMobile}
                  src={heroImageMobile}
                  alt="Hero Background Mobile"
                  fill
                  className="object-cover md:hidden contrast-[1.05] grayscale-[0.02]"
                  style={{ filter: `brightness(${overlayBrightness})` }}
                  priority
                  quality={85}
                  onLoad={() => setIsLoaded(true)}
                />
                {/* Desktop Image (16:9) */}
                <Image
                  key={heroImageDesktop}
                  src={heroImageDesktop}
                  alt="Hero Background Desktop"
                  fill
                  className="object-cover hidden md:block contrast-[1.05] grayscale-[0.02]"
                  style={{ filter: `brightness(${overlayBrightness})` }}
                  priority
                  quality={85}
                  onLoad={() => setIsLoaded(true)}
                />
              </>
            )}
          </motion.div>

          {/* Multi-layered Vignette for depth */}
          <div className="absolute inset-x-0 bottom-0 h-2/3 bg-gradient-to-t from-black via-black/20 to-transparent opacity-90 transition-opacity duration-1000" />
          <div className="absolute inset-x-0 top-0 h-1/3 bg-gradient-to-b from-black/60 to-transparent" />
        </div>

        {/* Layout: Single Central Stack */}
        <div className="relative z-10 h-full w-full flex flex-col justify-center items-center px-8 text-center max-w-7xl mx-auto">

          <div className="max-w-4xl flex flex-col items-center space-y-8">
            {/* Subtitle / Intro */}
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1 }}
              className="flex items-center gap-4 text-white/40"
            >
              <span className="w-8 h-[1px] bg-white/10" />
              <span
                className="text-[10px] md:text-[11px] uppercase tracking-[0.5em] font-medium"
                dangerouslySetInnerHTML={{ __html: introText }}
              />
              <span className="w-8 h-[1px] bg-white/10" />
            </motion.div>

            {/* Main Title */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1.2, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            >
              <h1 className="text-white text-[clamp(1.85rem,6vw,3.5rem)] font-light leading-[0.95] tracking-tighter">
                <span dangerouslySetInnerHTML={{ __html: mainHeadline }} className="[&_strong]:font-semibold [&_em]:italic" />
              </h1>
            </motion.div>

            {/* CTAs */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.6 }}
              className="flex flex-wrap justify-center gap-4 pt-6"
            >
              <LiquidRiseCTA
                href={ctaLink}
                className="!bg-white !text-black border-transparent md:!w-40 !w-32 md:!h-11 !h-9 md:text-[10px] text-[9px]"
              >
                {ctaText}
              </LiquidRiseCTA>

              <LiquidRiseCTA
                href={secondaryCtaLink}
                className="!bg-white/10 !text-white !backdrop-blur-xl border-white/20 md:!w-40 !w-32 md:!h-11 !h-9 md:text-[10px] text-[9px]"
              >
                {secondaryCtaText}
              </LiquidRiseCTA>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
