"use client";

import React, { useRef, useCallback } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowDownRight, Maximize2 } from "lucide-react";

const HERO_IMAGES = [
  "https://framerusercontent.com/images/twX7Aze7rBnuv17EgJDs5qO4nE.jpeg?scale-down-to=1024",
  "https://framerusercontent.com/images/arXlibXbrMj6yu1ZVcYn9DIEbes.jpeg?scale-down-to=1024&width=904&height=1200",
  "https://framerusercontent.com/images/twX7Aze7rBnuv17EgJDs5qO4nE.jpeg?scale-down-to=1024",  
];

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // Softer spring for the "floating" feel, but responsive enough for 3D
  const mouseX = useSpring(x, { stiffness: 100, damping: 25 });
  const mouseY = useSpring(y, { stiffness: 100, damping: 25 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const { width, height, left, top } = containerRef.current.getBoundingClientRect();
    // Normalizing coordinates from -0.5 to 0.5
    x.set((e.clientX - left) / width - 0.5);
    y.set((e.clientY - top) / height - 0.5);
  }

  // --- TRANSFORMS ---

  // 1. Rotation (Tilting the card based on mouse)
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [7, -7]); // Look up/down
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-7, 7]); // Look left/right

  // 2. Parallax (Moving layers apart)
  const frontX = useTransform(mouseX, [-0.5, 0.5], [40, -40]);
  const frontY = useTransform(mouseY, [-0.5, 0.5], [40, -40]);

  const midX = useTransform(mouseX, [-0.5, 0.5], [-20, 20]);
  const midY = useTransform(mouseY, [-0.5, 0.5], [-20, 20]);

  const backX = useTransform(mouseX, [-0.5, 0.5], [-50, 50]);
  const backY = useTransform(mouseY, [-0.5, 0.5], [-40, 40]);

  // 3. SCALE / DEPTH (The "Forward/Backward" effect)
  // When mouse is in center (0), scale is 1.1 (Close). When at edges, scale drops to 1.
  // This creates a "Zoom" effect when you focus on the content.
  const frontScale = useTransform(mouseY, [-0.5, 0, 0.5], [1, 1.1, 1]); 
  
  // Smooth scroll logic
  const scrollToGallery = useCallback(() => {
    const el = document.getElementById('gallery');
    if (!el) return;
    const offset = window.innerWidth < 768 ? 40 : 80;
    const y = el.getBoundingClientRect().top + window.pageYOffset - offset;
    window.scrollTo({ top: y, behavior: 'smooth' });
  }, []);

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-black selection:bg-white selection:text-black"
      // Added perspective to the container to enable real 3D depth
      style={{ perspective: "1200px" }}
    >
      {/* Background Gradients */}
      <div className="absolute inset-0 z-0 opacity-20" 
        style={{ 
          backgroundImage: 'radial-gradient(circle at 2px 2px, #444 1px, transparent 0)', 
          backgroundSize: '40px 40px' 
        }} 
      />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-black/50 to-black z-10" />

      {/* Background Text Parallax */}
      <motion.div 
        style={{ 
          x: useTransform(mouseX, [-0.5, 0.5], [80, -80]),
          y: useTransform(mouseY, [-0.5, 0.5], [40, -40]),
          opacity: useTransform(mouseY, [-0.5, 0, 0.5], [0.05, 0.1, 0.05]) // Fades in slightly at center
        }}
        className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-0"
      >
        <h1 className="text-[22vw] font-black tracking-tighter text-white leading-none uppercase select-none">
          Explore
        </h1>
      </motion.div>

      {/* --- 3D CARD STACK --- */}
      {/* Added 'preserve-3d' to allow children to exist in 3D space */}
      <div 
        className="relative w-[320px] h-[450px] md:w-[450px] md:h-[600px] z-20 flex items-center justify-center"
        style={{ transformStyle: "preserve-3d" }}
      >
        
        {/* Back Layer - Drifts slowly */}
        <motion.div
          style={{ x: backX, y: backY, z: -100 }}
          // Infinite breathing animation
          animate={{ 
            scale: [0.85, 0.9, 0.85],
            rotateZ: [-8, -12, -8],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute w-full h-[80%] opacity-40 blur-[2px]"
        >
          <Image 
            src={HERO_IMAGES[2]} 
            alt="" fill 
            className="object-cover rounded-sm grayscale" 
            sizes="(max-width: 768px) 320px, 450px"
          />
        </motion.div>

        {/* Mid Layer - Drifts opposite to back layer */}
        <motion.div
          style={{ x: midX, y: midY, z: -50 }}
          // Infinite breathing animation (offset timing)
          animate={{ 
            scale: [0.9, 0.95, 0.9],
            rotateZ: [4, 8, 4],
          }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
          className="absolute w-[90%] h-[90%] opacity-60 brightness-50"
        >
          <Image 
            src={HERO_IMAGES[1]} 
            alt="" fill 
            className="object-cover rounded-sm" 
            sizes="(max-width: 768px) 320px, 450px"
          />
        </motion.div>

        {/* Front Layer - THE HERO */}
        <motion.div
          style={{ 
            x: frontX, 
            y: frontY, 
            rotateX: rotateX, // Real 3D Tilt X
            rotateY: rotateY, // Real 3D Tilt Y
            scale: frontScale, // Zoom on Center
            z: 0
          }}
          className="relative w-full h-full z-30 bg-neutral-900 rounded-sm overflow-hidden border border-white/20 shadow-2xl group"
        >
          {/* Subtle Flash Overlay on movement */}
          <motion.div 
            style={{ opacity: useTransform(mouseY, [-0.5, 0.5], [0, 0.2]) }}
            className="absolute inset-0 bg-gradient-to-tr from-white/20 to-transparent z-40 pointer-events-none mix-blend-overlay"
          />

          <Image 
            src={HERO_IMAGES[0]} 
            alt="Hero" fill 
            className="object-cover scale-110 transition-transform duration-700 group-hover:scale-100" 
            priority
            sizes="(max-width: 768px) 320px, 450px"
          />
          
          <div className="absolute top-6 left-6 flex items-center gap-2 z-50">
             <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
             <span className="text-[10px] uppercase tracking-[0.3em] text-white/80 font-medium">Live Studio</span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 bg-gradient-to-t from-black to-transparent z-50">
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

      {/* Foreground Text - Mix Blend */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-40 mix-blend-difference">
         <h1 className="text-[18vw] font-black tracking-tighter text-white leading-none uppercase opacity-90">
           Create
         </h1>
      </div>

      <div className="absolute bottom-12 right-12 z-50">
        <button onClick={scrollToGallery} className="group relative flex items-center justify-center p-1">
          <div className="absolute inset-0 rounded-full border border-white/10 group-hover:scale-110 group-hover:border-white/40 transition-all duration-500" />
          <div className="relative w-16 h-16 rounded-full flex items-center justify-center text-white bg-white/5 backdrop-blur-xl">
             <ArrowDownRight className="w-6 h-6 transform group-hover:rotate-45 transition-transform duration-300" />
          </div>
        </button>
      </div>

    </section>
  );
}