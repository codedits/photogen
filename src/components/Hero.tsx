"use client";

import React, { useRef, useCallback } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowDownRight, Camera, Maximize2, MoveRight } from "lucide-react";

const HERO_IMAGES = [
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=800&auto=format&fit=crop",
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=800&auto=format&fit=crop",
];

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse tracking with the same heavy spring logic as your marquee
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseX = useSpring(x, { stiffness: 150, damping: 30 });
  const mouseY = useSpring(y, { stiffness: 150, damping: 30 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const { width, height, left, top } = containerRef.current.getBoundingClientRect();
    x.set((e.clientX - left) / width - 0.5);
    y.set((e.clientY - top) / height - 0.5);
  }

  // Layered movement for 3D depth
  const frontX = useTransform(mouseX, [-0.5, 0.5], [30, -30]);
  const frontY = useTransform(mouseY, [-0.5, 0.5], [30, -30]);
  
  const midX = useTransform(mouseX, [-0.5, 0.5], [-50, 50]);
  const midY = useTransform(mouseY, [-0.5, 0.5], [-40, 40]);

  const backX = useTransform(mouseX, [-0.5, 0.5], [-80, 80]);
  const backY = useTransform(mouseY, [-0.5, 0.5], [-20, 20]);

  // Smooth scroll to the gallery section when user clicks the button
  const scrollToGallery = useCallback(() => {
    const el = document.getElementById('gallery');
    if (!el) return;
    // small offset to account for sticky nav (adjust if needed)
    const offset = window.innerWidth < 768 ? 40 : 80;
    const y = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }, []);

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black selection:bg-white selection:text-black"
    >
      {/* 1. Refined Background: Subtle Grid + Radial Glow */}
      <div className="absolute inset-0 z-0 opacity-20" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, #444 1px, transparent 0)', 
          backgroundSize: '40px 40px' 
        }} 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />

      {/* 2. Background Typography (Behind the images) */}
      <motion.div 
        style={{ x: useTransform(mouseX, [-0.5, 0.5], [50, -50]) }}
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0"
      >
        <h1 className="text-[22vw] font-black tracking-tighter text-white/[0.05] leading-none uppercase">
          Explore
        </h1>
      </motion.div>

      {/* 3. Image Stack with High-End Borders */}
      <div className="relative w-[320px] h-[450px] md:w-[450px] md:h-[600px] z-20 flex items-center justify-center">
        
        {/* Back Layer */}
        <motion.div
          style={{ x: backX, y: backY, rotate: -8 }}
          className="absolute w-full h-[80%] opacity-40 blur-[2px] scale-90"
        >
          <Image 
            src={HERO_IMAGES[2]} 
            alt="" 
            fill 
            className="object-cover rounded-sm grayscale" 
            sizes="(max-width: 768px) 320px, 450px"
            priority
          />
        </motion.div>

        {/* Mid Layer */}
        <motion.div
          style={{ x: midX, y: midY, rotate: 4 }}
          className="absolute w-[90%] h-[90%] opacity-60 brightness-50"
        >
          <Image 
            src={HERO_IMAGES[1]} 
            alt="" 
            fill 
            className="object-cover rounded-sm" 
            sizes="(max-width: 768px) 320px, 450px"
            priority
          />
        </motion.div>

        {/* Front Layer (The Hero) */}
        <motion.div
          style={{ x: frontX, y: frontY, rotate: useTransform(mouseX, [-0.5, 0.5], [-2, 2]) }}
          className="relative w-full h-full z-30 bg-neutral-900 rounded-sm overflow-hidden border border-white/20 shadow-2xl group"
        >
          <Image 
            src={HERO_IMAGES[0]} 
            alt="Hero" 
            fill 
            className="object-cover scale-110 transition-transform duration-700 group-hover:scale-100" 
            priority
            sizes="(max-width: 768px) 320px, 450px"
          />
          
          {/* Internal Label Styling */}
          <div className="absolute top-6 left-6 flex items-center gap-2">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             <span className="text-[10px] uppercase tracking-[0.3em] text-white/80 font-medium">Live Studio</span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black to-transparent">
             <div className="flex justify-between items-end">
                <div>
                  <h3 className="text-white text-2xl font-light tracking-tight">Ethereal Moments</h3>
                  <p className="text-white/40 text-[10px] uppercase tracking-widest mt-2">Conceptual Photography ©2024</p>
                </div>
                <div className="p-3 rounded-full border border-white/10 backdrop-blur-md text-white hover:bg-white hover:text-black transition-colors cursor-pointer">
                   <Maximize2 className="w-4 h-4" />
                </div>
             </div>
          </div>
        </motion.div>
      </div>

      {/* 4. Foreground Mix-Blend Typography */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 mix-blend-difference">
         <h1 className="text-[18vw] font-black tracking-tighter text-white leading-none uppercase opacity-90">
           Create
         </h1>
      </div>

    

      <div className="absolute bottom-12 right-12 z-50">
        <button type="button" aria-label="Scroll to gallery" onClick={scrollToGallery} className="group relative flex items-center justify-center p-1">
          {/* Circular Button with Hover Effect */}
          <div className="absolute inset-0 rounded-full border border-white/10 group-hover:scale-110 group-hover:border-white/40 transition-all duration-500" />
          <div className="relative w-16 h-16 rounded-full flex items-center justify-center text-white bg-white/5 backdrop-blur-xl">
             <ArrowDownRight className="w-6 h-6 transform group-hover:rotate-45 transition-transform duration-300" />
          </div>
          <span className="absolute -top-8 text-[9px] uppercase tracking-[0.5em] text-white/40 opacity-0 group-hover:opacity-100 transition-opacity">
            Scroll
          </span>
        </button>
      </div>

  

    </section>
  );
}