"use client";

import React from "react";
import Image from "next/image";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowDownRight } from "lucide-react";

interface HeroProps {
  settings?: {
    introText: string;
    mainHeadline: string;
    image: {
      url: string;
      public_id: string;
    };
  };
}

export default function Hero({ settings }: HeroProps) {
  const introText = settings?.introText || "It's about emotion and clarity. It is the balance between structure and imagination.";
  const mainHeadline = settings?.mainHeadline || "Art Director from Pakistan, working across brand, and campaign. My work is a dialogue between order and chaos.";
  const heroImage = settings?.image?.url || "https://framerusercontent.com/images/twX7Aze7rBnuv17EgJDs5qO4nE.jpeg?scale-down-to=1024";

  return (
    <section className="relative min-h-screen w-full flex flex-col justify-end selection:bg-white selection:text-black overflow-hidden">

      {/* Content */}
      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pb-16 md:pb-24 pt-32">

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-end">

          {/* Left: Editorial Text */}
          <div className="lg:col-span-6 xl:col-span-7 flex flex-col justify-end">

            {/* Subtle Intro */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
              className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-8 flex items-center gap-3 [&>p]:inline-block"
            >
              <span className="w-8 h-px bg-foreground/30" />
              <span dangerouslySetInnerHTML={{ __html: introText }} />
            </motion.div>

            {/* Main Headline */}
            <motion.h1
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.4 }}
              className="text-[clamp(2rem,5vw,3.5rem)] font-normal leading-[1.1] tracking-tight text-foreground prose-strong:font-semibold prose-strong:text-foreground [&>p]:inline"
            >
              <span dangerouslySetInnerHTML={{ __html: mainHeadline }} />
            </motion.h1>

            {/* CTA */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="mt-10 flex items-center gap-6"
            >
              <Link
                href="/gallery"
                className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <span className="w-4 h-px bg-foreground/30" />
                Browse Gallery
              </Link>
              <Link
                href="/studio"
                className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground hover:text-foreground transition-colors flex items-center gap-2"
              >
                <span className="w-4 h-px bg-foreground/30" />
                Open Studio
              </Link>
            </motion.div>
          </div>

          {/* Right: Featured Image */}
          <motion.div
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 1.2, delay: 0.3 }}
            className="lg:col-span-6 xl:col-span-5"
          >
            <div className="relative aspect-[3/4] w-full max-w-md lg:max-w-none ml-auto overflow-hidden rounded-sm">
              <Image
                src={heroImage}
                alt="Featured editorial photograph"
                fill
                className="object-cover"
                priority
                quality={85}
                sizes="(max-width: 1024px) 100vw, 40vw"
              />
            </div>
          </motion.div>

        </div>
      </div>

      {/* Scroll indicator */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.5 }}
        className="absolute bottom-8 right-8 z-20 hidden md:block"
      >
        <div className="w-10 h-10 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-all cursor-pointer">
          <ArrowDownRight className="w-4 h-4" />
        </div>
      </motion.div>

    </section>
  );
}
