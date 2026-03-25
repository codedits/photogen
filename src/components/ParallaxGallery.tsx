"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
  useInView,
  useReducedMotion,
  type MotionValue,
} from "framer-motion";
import Link from "next/link";

const IMAGES = [
  "https://framerusercontent.com/images/twX7Aze7rBnuv17EgJDs5qO4nE.jpeg?width=904&height=1200",
  "https://framerusercontent.com/images/XaarlKDjrDWlHUx9pHI5N156CM.jpeg?width=673&height=1200",
  "https://framerusercontent.com/images/8JG9l1vs1T358YK5DGjMZHom0A.jpeg?width=840&height=1200",
  "https://framerusercontent.com/images/tczjit7E0mjTHHyk9gQEZbjAo.jpeg?width=904&height=1200",
  "https://framerusercontent.com/images/6ySJkkM4kRtYUPB89EqOTNQoB0Q.jpeg?width=800&height=1200",
  "https://framerusercontent.com/images/AGpfc8MenhbL3usFuhsdgBWd2U8.jpeg?width=904&height=1200",
  "https://framerusercontent.com/images/YKHZSqkHuBQNvBM4Qsyz62MCM78.jpeg?width=904&height=1200",
  "https://framerusercontent.com/images/VRKVNED8rkR7xPWCRjk1GMIIAM.jpeg?width=904&height=1200",
  "https://framerusercontent.com/images/uMrzBbVigJiWon8PB1eG3PKFr8Q.jpeg?width=904&height=1200",
  "https://framerusercontent.com/images/uRfY4TZwtxJWq3VDNHPjvLQIU.jpeg?width=904&height=1200",
  "https://framerusercontent.com/images/jfMNUjp8vDTlcrkiyGuzEZZBJhc.jpeg?width=904&height=1200",
  "https://framerusercontent.com/images/Nr5dBI9PpUIALjIub1KMrmXq8.jpeg?width=904&height=1200",
  "https://framerusercontent.com/images/arXlibXbrMj6yu1ZVcYn9DIEbes.jpeg?width=904&height=1200",
  "https://framerusercontent.com/images/yqa8LtbxWvlsHn9yYkxT7qrKZdY.jpeg?width=960&height=1200",
];

function ParallaxRow({
  images,
  baseVelocity = 100,
  scrollY,
  isActive,
  prefersReducedMotion,
  priorityCount = 1,
}: {
  images: string[];
  baseVelocity: number;
  scrollY: MotionValue<number>;
  isActive: boolean;
  prefersReducedMotion: boolean;
  priorityCount?: number;
}) {
  const baseX = useMotionValue(0);
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 44,
    stiffness: 280,
  });
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false,
  });

  /**
   * SEAMLESS LOOP REFACTOR:
   * We use one motion.div with two sets of duplicate images.
   * To loop perfectly, we wrap -50% to 0%.
   */
  const x = useTransform(baseX, (v) => `${((v % 50) - 50) % 50}%`);

  const directionFactor = useRef<number>(1);
  const [isMobileViewport, setIsMobileViewport] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const mediaQuery = window.matchMedia("(max-width: 767px)");
    const updateViewport = () => setIsMobileViewport(mediaQuery.matches);
    updateViewport();
    mediaQuery.addEventListener("change", updateViewport);
    return () => mediaQuery.removeEventListener("change", updateViewport);
  }, []);

  useAnimationFrame((t, delta) => {
    if (!isActive || prefersReducedMotion) return;

    let moveBy = directionFactor.current * baseVelocity * (delta / 1000);

    if (isMobileViewport) {
      baseX.set(baseX.get() + moveBy * 1.6);
      return;
    }

    if (velocityFactor.get() < 0) {
      directionFactor.current = -1;
    } else if (velocityFactor.get() > 0) {
      directionFactor.current = 1;
    }

    moveBy += directionFactor.current * moveBy * velocityFactor.get();

    baseX.set(baseX.get() + moveBy);
  });

  const allImages = useMemo(() => [...images, ...images], [images]);

  return (
    <div className="flex whitespace-nowrap overflow-hidden">
      <motion.div 
        className="flex flex-nowrap gap-[2px]" 
        style={{ x, willChange: 'transform' }}
      >
        {allImages.map((src, i) => (
          <motion.div
            key={`${src}-${i}`}
            className="group relative h-[350px] w-[240px] md:h-[500px] md:w-[350px] shrink-0 overflow-hidden bg-neutral-900"
            whileHover={isMobileViewport ? undefined : { scale: 0.98 }}
            transition={{ duration: 0.6, ease: [0.33, 1, 0.68, 1] }}
          >
             <Image
              src={src}
              alt=""
              fill
              className="object-cover transition-all duration-1000 ease-[cubic-bezier(0.2,0,0,1)] group-hover:scale-110 saturate-[0.9] md:saturate-[0.3] group-hover:saturate-[1.1] grayscale-0 md:grayscale-[0.4] group-hover:grayscale-0 opacity-95 md:opacity-70 group-hover:opacity-100"
              priority={i < priorityCount}
              quality={80}
              sizes="(max-width: 768px) 240px, 350px"
            />
            {/* Brightened Indicator */}
            <div className="absolute top-4 left-4 z-10">
               <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                 {/* Index numbering removed */}
               </span>
            </div>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
}

export default function ParallaxGallery() {
  const sectionRef = useRef<HTMLElement>(null);
  const isInView = useInView(sectionRef, { margin: "200px 0px 200px 0px" });
  const prefersReducedMotion = useReducedMotion();
  const [isTabVisible, setIsTabVisible] = useState(true);

  useEffect(() => {
    if (typeof document === "undefined") return;
    const handleVisibility = () => setIsTabVisible(!document.hidden);
    handleVisibility();
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, []);

  const isActive = isInView && isTabVisible;
  const { scrollY } = useScroll();

  return (
    <section ref={sectionRef} id="gallery" className="relative overflow-hidden bg-background py-8 md:py-12">
      {/* Intense DEEP Vignette Overlays */}
      {/* Intense DEEP Vignette Overlays - Shortened for "longness" reduction */}
      <div className="absolute inset-x-0 top-0 z-30 h-16 md:h-64 bg-gradient-to-b from-background via-background/60 to-transparent pointer-events-none" />
      <div className="absolute inset-x-0 bottom-0 z-30 h-16 md:h-64 bg-gradient-to-t from-background via-background/60 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 left-0 z-30 w-8 md:w-40 bg-gradient-to-r from-background via-background/60 to-transparent pointer-events-none" />
      <div className="absolute inset-y-0 right-0 z-30 w-8 md:w-40 bg-gradient-to-l from-background via-background/60 to-transparent pointer-events-none" />
      <div className="absolute inset-0 z-20 bg-background/40 pointer-events-none" />

      {/* Center Floating Text */}
      <div className="pointer-events-none absolute inset-0 z-40 flex items-center justify-center text-center">
        <div className="max-w-2xl px-6">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, amount: 0.4 }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="backdrop-blur-md bg-background/20 p-8 md:p-16 rounded-[2.5rem] md:rounded-[4rem] border border-border shadow-2xl"
          >
            <h2 className="mb-6 text-3xl font-light uppercase leading-[0.9] tracking-tighter text-foreground md:text-7xl">
              Explore <br className="hidden md:block" /> the gallery
            </h2>
            <Link 
              href="/gallery"
              className="pointer-events-auto inline-flex items-center gap-4 px-8 py-3 bg-primary text-primary-foreground text-[10px] font-normal uppercase tracking-[0.3em] rounded-full hover:bg-primary/90 transition-all duration-300"
            >
              Browse Archive
            </Link>
          </motion.div>
        </div>
      </div>

      {/* Marquee Rows */}
      <div className="flex flex-col gap-[2px] relative z-10">
        <ParallaxRow 
          images={IMAGES.slice(0, 7)} 
          baseVelocity={-0.8} 
          scrollY={scrollY}
          isActive={isActive}
          prefersReducedMotion={!!prefersReducedMotion}
          priorityCount={1}
        />
        <ParallaxRow 
          images={IMAGES.slice(7, 14)} 
          baseVelocity={0.8} 
          scrollY={scrollY}
          isActive={isActive}
          prefersReducedMotion={!!prefersReducedMotion}
          priorityCount={0}
        />
      </div>
    </section>
  );
}