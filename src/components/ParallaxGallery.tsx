"use client";

import React, { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useScroll,
  useSpring,
  useTransform,
  useMotionValue,
  useVelocity,
  useAnimationFrame,
  wrap,
} from "framer-motion";

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

const DOUBLE_IMAGES = [...IMAGES, ...IMAGES];

function ParallaxRow({
  images,
  baseVelocity = 100,
  className = "",
  scrollY,
}: {
  images: string[];
  baseVelocity: number;
  className?: string;
  scrollY: any;
}) {
  const baseX = useMotionValue(0);
  const scrollVelocity = useVelocity(scrollY);
  
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400
  });

  /**
   * CHANGE 1: Increase the multiplier for scroll speed.
   * Changing [0, 2] to [0, 5] makes the marquee move 5x faster 
   * when you scroll quickly.
   */
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 3], {
    clamp: false // Set to false to allow even more speed on fast scrolls
  });

  const scrollSpeed = useTransform(smoothVelocity, (v) => Math.abs(v));
  const scale = useTransform(scrollSpeed, [0, 2000], [1, 0.98]); 
  const yOffset = useTransform(scrollSpeed, [0, 2000], [0, baseVelocity > 0 ? -10 : 10]); 

  useAnimationFrame((t, delta) => {
    let moveBy = baseVelocity * (delta / 1000);
    moveBy += moveBy * velocityFactor.get();
    baseX.set(baseX.get() + moveBy);
  });

  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);

  return (
    <motion.div
      className={`flex flex-nowrap gap-4 ${className}`}
      style={{ x, scale, y: yOffset }}
    >
      {images.map((src, i) => {
        const isFramer = typeof src === 'string' && src.includes('framerusercontent.com');
        return (
          <div
            key={`${src}-${i}`}
            className="relative h-[300px] w-[200px] md:h-[420px] md:w-[300px] shrink-0 overflow-hidden rounded-md bg-neutral-900"
          >
            <Image
              src={src}
              alt=""
              fill
              className="object-cover"
              priority={i < 6}
              loading={i < 6 ? 'eager' : 'lazy'}
              quality={60}
              sizes="(max-width: 768px) 200px, 300px"
              unoptimized={isFramer}
            />
          </div>
        );
      })}
    </motion.div>
  );
}

export default function ParallaxGallery() {
  const { scrollY } = useScroll();

  const rotate = (arr: string[], n: number) => {
    const len = arr.length;
    if (len === 0) return arr;
    const mod = ((n % len) + len) % len;
    return arr.slice(mod).concat(arr.slice(0, mod));
  };

  return (
    <section id="gallery" className="relative overflow-hidden bg-black py-24 md:py-32">
      <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-r from-black via-transparent to-black" />

      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-start">
        <div className="container mx-auto px-6 md:px-24 pointer-events-auto">
          <div className="max-w-xl">
            <h2 className="mb-6 text-4xl font-light uppercase leading-[0.95] tracking-tighter text-white md:text-6xl">
              Explore more <br /> masterpieces in <br /> the gallery
            </h2>
            <a
              href="/gallery"
              className="inline-flex items-center gap-2 text-[10px] uppercase tracking-[0.3em] text-white/80 transition-colors hover:text-white"
            >
              <span className="mr-2 h-px w-4 bg-white/40" />
              Browse Gallery
            </a>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-4 relative z-10 rotate-[-2deg] scale-105 origin-center">
        {/**
         * CHANGE 2: Increase baseVelocity.
         * Changing -1.5 to -5 (or higher) increases the "idle" speed 
         * when the user is not scrolling at all.
         */}
        <ParallaxRow 
          images={rotate(DOUBLE_IMAGES, 0)} 
          baseVelocity={-5} 
          scrollY={scrollY} 
        />
        <ParallaxRow 
          images={rotate(DOUBLE_IMAGES, 4)} 
          baseVelocity={5} 
          scrollY={scrollY} 
          className="md:pl-24" 
        />
        <ParallaxRow 
          images={rotate(DOUBLE_IMAGES, 8)} 
          baseVelocity={-5} 
          scrollY={scrollY} 
        />
      </div>
    </section>
  );
}