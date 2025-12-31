"use client";

import React, { useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { ArrowDownRight, Camera, Aperture, Maximize2 } from "lucide-react";

const HERO_IMAGES = [
  // Front Image (Portrait)
  "https://images.unsplash.com/photo-1534528741775-53994a69daeb?q=80&w=1000&auto=format&fit=crop",
  // Middle Image (Architecture/Abstract)
  "https://images.unsplash.com/photo-1486325212027-8081e485255e?q=80&w=1000&auto=format&fit=crop",
  // Back Image (Landscape/Texture)
  "https://images.unsplash.com/photo-1470071459604-3b5ec3a7fe05?q=80&w=1000&auto=format&fit=crop",
];

export default function Hero() {
  const containerRef = useRef<HTMLDivElement>(null);

  // 1. Track Mouse Position
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  // 2. Smooth the mouse data (Spring Physics)
  const mouseX = useSpring(x, { stiffness: 100, damping: 20 });
  const mouseY = useSpring(y, { stiffness: 100, damping: 20 });

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (!containerRef.current) return;
    const { width, height, left, top } = containerRef.current.getBoundingClientRect();
    // Normalize coordinates from -0.5 to 0.5
    const currentX = (e.clientX - left) / width - 0.5;
    const currentY = (e.clientY - top) / height - 0.5;
    x.set(currentX);
    y.set(currentY);
  }

  // --- PARALLAX LAYERS CALCULATIONS ---
  
  // Front Image: Moves mostly with mouse
  const frontX = useTransform(mouseX, [-0.5, 0.5], [40, -40]);
  const frontY = useTransform(mouseY, [-0.5, 0.5], [40, -40]);
  const frontRotate = useTransform(mouseX, [-0.5, 0.5], [-5, 5]);

  // Middle Image: Moves opposite (creates separation)
  const midX = useTransform(mouseX, [-0.5, 0.5], [-60, 60]);
  const midY = useTransform(mouseY, [-0.5, 0.5], [-20, 20]);
  const midRotate = useTransform(mouseX, [-0.5, 0.5], [5, -5]);

  // Back Image: Moves slowest, anchors the scene
  const backX = useTransform(mouseX, [-0.5, 0.5], [-20, 20]);
  const backY = useTransform(mouseY, [-0.5, 0.5], [-60, 60]);
  
  // Text Parallax
  const textX = useTransform(mouseX, [-0.5, 0.5], [20, -20]);

  return (
    <section
      ref={containerRef}
      onMouseMove={handleMouseMove}
      className="relative h-screen w-full flex flex-col items-center justify-center overflow-hidden bg-[#080808] perspective-1000"
    >
      {/* Decorative Grid Background */}
      <div className="absolute inset-0 z-0 opacity-10" 
        style={{ 
          backgroundImage: 'linear-gradient(to right, #333 1px, transparent 1px), linear-gradient(to bottom, #333 1px, transparent 1px)', 
          backgroundSize: '80px 80px' 
        }} 
      />

      {/* --- CONTENT LAYER --- */}
      <div className="relative z-20 w-full max-w-7xl mx-auto h-[600px] flex items-center justify-center">
        
        {/* BIG TYPOGRAPHY (Behind) */}
        <motion.div 
          style={{ x: textX }}
          className="absolute inset-0 flex items-center justify-center pointer-events-none z-10"
        >
           <h1 className="text-[18vw] font-black tracking-tighter text-[#1a1a1a] leading-none select-none">
             STUDIO
           </h1>
        </motion.div>

        {/* --- IMAGE STACK --- */}
        <div className="relative w-[300px] h-[400px] md:w-[400px] md:h-[550px] z-30">
            
            {/* 3. Back Image */}
            <motion.div
              style={{ x: backX, y: backY, rotate: -6 }}
              className="absolute top-0 left-[-80px] w-full h-full opacity-60 grayscale hover:grayscale-0 transition-all duration-500"
            >
               <img src={HERO_IMAGES[2]} className="w-full h-full object-cover rounded shadow-2xl" alt="Back" />
            </motion.div>

            {/* 2. Middle Image */}
            <motion.div
              style={{ x: midX, y: midY, rotate: 6 }}
              className="absolute top-[40px] right-[-80px] w-full h-full opacity-80 brightness-75 hover:brightness-100 transition-all duration-500"
            >
               <img src={HERO_IMAGES[1]} className="w-full h-full object-cover rounded shadow-2xl" alt="Middle" />
            </motion.div>

            {/* 1. Front Main Image */}
            <motion.div
              style={{ x: frontX, y: frontY, rotate: frontRotate }}
              className="absolute inset-0 z-40 bg-neutral-800 rounded shadow-[0_35px_60px_-15px_rgba(0,0,0,0.5)] overflow-hidden border border-white/10"
            >
                <img src={HERO_IMAGES[0]} className="w-full h-full object-cover scale-110" alt="Front" />
                
                {/* Overlay Text on Main Image */}
                <div className="absolute bottom-0 left-0 right-0 p-6 bg-gradient-to-t from-black/80 to-transparent">
                  <div className="flex items-center justify-between border-t border-white/20 pt-4">
                     <div>
                       <p className="text-xs font-bold text-white uppercase tracking-widest mb-1">Vol. 01</p>
                       <p className="text-[10px] text-white/60">Summer Collection</p>
                     </div>
                     <Maximize2 className="text-white/80 w-5 h-5" />
                  </div>
                </div>
            </motion.div>
        </div>

        {/* OVERLAY TYPOGRAPHY (Front - Blend Mode) */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50 mix-blend-exclusion">
           <h1 className="text-[18vw] font-black tracking-tighter text-white leading-none select-none opacity-80">
             STUDIO
           </h1>
        </div>

      </div>

      {/* --- UI ELEMENTS --- */}
      
     

      {/* Bottom Footer */}
      <div className="absolute bottom-0 w-full p-8 flex justify-between items-end z-50">
        <div className="flex gap-4">
           <div className="flex items-center gap-2 px-4 py-2 bg-white/5 backdrop-blur-md rounded-full border border-white/10 text-white/80 text-xs">
              <Camera className="w-3 h-3" />
              <span>Scroll to explore</span>
           </div>
        </div>
        
        <button className="group flex items-center gap-3 text-white">
           <div className="w-12 h-12 rounded-full border border-white/20 flex items-center justify-center group-hover:bg-white group-hover:text-black transition-all duration-300">
              <ArrowDownRight className="w-5 h-5 transform group-hover:rotate-45 transition-transform" />
           </div>
           <span className="text-xs uppercase tracking-widest hidden md:block">View Gallery</span>
        </button>
      </div>

    </section>
  );
}