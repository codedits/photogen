"use client";

import React from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { ArrowDownRight } from "lucide-react";
import LiquidRiseCTA from "./LiquidRiseCTA";

interface HeroProps {
  settings?: {
    introText?: string;
    mainHeadline?: string;
    image?: {
      url?: string;
      public_id?: string;
    };
  };
}

export default function Hero({ settings }: HeroProps) {
  const introText = settings?.introText ?? "";
  const mainHeadline = settings?.mainHeadline ?? "";
  const heroImage = settings?.image?.url ?? "https://framerusercontent.com/images/twX7Aze7rBnuv17EgJDs5qO4nE.jpeg?width=1600";

  return (
    <section className="relative h-screen w-full flex flex-col p-1 bg-background selection:bg-white selection:text-black overflow-hidden font-sans">
      
      {/* Main Container: Editorial Frame */}
      <div className="relative flex-1 w-full rounded-[1.5rem] md:rounded-[2.5rem] overflow-hidden shadow-[0_0_80px_rgba(0,0,0,0.4)] border border-border/20 group/hero">
        
        {/* Cinematic Background with Slow Parallax/Scale */}
        <div className="absolute inset-0 z-0">
          <Image
            src={heroImage}
            alt="Hero Background"
            fill
            className="object-cover contrast-[1.1] grayscale-[0.05] brightness-[0.85]"
            priority
            quality={80}
          />
          {/* Multi-layered Vignette for depth */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black via-black/40 to-transparent opacity-80" />
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
              <h1 className="text-white text-[clamp(1.5rem,6vw,3.5rem)] font-light leading-[1.1] tracking-tight">
                <span dangerouslySetInnerHTML={{ __html: mainHeadline }} className="[&_strong]:font-medium [&_strong]:italic" />
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
                href="/gallery" 
                className="!bg-white !text-black border-transparent !w-40 !h-11 text-[10px]"
              >
                Gallery
              </LiquidRiseCTA>
              
              <LiquidRiseCTA 
                href="/studio" 
                className="!bg-white/10 !text-white !backdrop-blur-xl border-white/20 !w-40 !h-11 text-[10px]"
              >
                Studio
              </LiquidRiseCTA>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}
