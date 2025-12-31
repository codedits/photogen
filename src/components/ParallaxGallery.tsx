"use client";

import React, { useRef } from "react";
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

// Combine images to create a seamless loop buffer
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
  const { scrollY: componentScrollY } = useScroll();
  const scrollVelocity = useVelocity(componentScrollY);
  
  // Smooth out the velocity so it doesn't jitter
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 400
  });

  // Calculate dynamic effects based on scroll speed
  const velocityFactor = useTransform(smoothVelocity, [0, 1000], [0, 5], {
    clamp: false
  });
  
  // Dynamic transformations based on speed (recreating your 'm' multiplier effects)
  // When scrolling fast: scale goes down, gap changes, row shifts vertically
  const scrollSpeed = useTransform(smoothVelocity, (v) => Math.abs(v));
  const scale = useTransform(scrollSpeed, [0, 3000], [1, 0.9]); // Shrink items slightly
  const yOffset = useTransform(scrollSpeed, [0, 3000], [0, baseVelocity > 0 ? -10 : 10]); 
  
  // Continuous loop logic
  useAnimationFrame((t, delta) => {
    let moveBy = baseVelocity * (delta / 1000);

    // Add scroll velocity to base movement
    if (velocityFactor.get() < 0) {
      moveBy += velocityFactor.get() * moveBy;
    } else {
      moveBy += velocityFactor.get() * moveBy;
    }

    baseX.set(baseX.get() + moveBy);
  });

  // Wrap the x position so it loops infinitely between -50% and 0%
  const x = useTransform(baseX, (v) => `${wrap(-50, 0, v)}%`);

  return (
    <motion.div
      className={`flex flex-nowrap gap-2 ${className}`}
      style={{ x, scale, y: yOffset }}
    >
      {images.map((src, i) => (
        <div
          key={i}
          className="relative h-[300px] w-[200px] md:h-[420px] md:w-[300px] shrink-0 overflow-hidden rounded-md bg-neutral-900"
        >
          <img
            src={src}
            alt=""
            className="h-full w-full object-cover"
            loading="lazy"
          />
        </div>
      ))}
    </motion.div>
  );
}

export default function ParallaxGallery() {
  const { scrollY } = useScroll();

  const rotate = (arr: string[], n: number) => {
    const len = arr.length;
    if (len === 0) return arr;
    const mod = ((n % len) + len) % len; // handle negative n
    return arr.slice(mod).concat(arr.slice(0, mod));
  };

  return (
    <section className="relative overflow-hidden bg-black py-24 md:py-32">
      {/* Background Mask */}
      <div className="absolute inset-0 z-20 pointer-events-none bg-gradient-to-r from-black via-transparent to-black" />

      {/* Content Overlay */}
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


      {/* Rows */}
      <div className="flex flex-col gap-4 relative z-10 rotate-[-2deg] scale-105 origin-center">
        <ParallaxRow 
          images={rotate(DOUBLE_IMAGES, 0)} 
          baseVelocity={-2} 
          scrollY={scrollY} 
        />
        <ParallaxRow 
          images={rotate(DOUBLE_IMAGES, 4)} 
          baseVelocity={2} 
          scrollY={scrollY} 
          className="md:pl-24" // Offset slightly like your original
        />
        <ParallaxRow 
          images={rotate(DOUBLE_IMAGES, 8)} 
          baseVelocity={-2} 
          scrollY={scrollY} 
        />
      </div>
    </section>
  );
}