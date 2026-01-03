"use client";

import React from "react";
import ImageGenerator from "../../components/ImageGenerator";
import { PageContainer, Section } from "../../components/layout/Primitives";

export default function StudioPage() {
  return (
    <PageContainer className="bg-black text-white overflow-x-hidden">

      {/* Content */}
      <main className="relative z-10 pt-32 pb-24">
        <Section>
          <div className="mb-16 max-w-3xl">
            <h1 className="text-6xl md:text-8xl font-light tracking-tighter uppercase leading-[0.85] mb-6">
              AI <br />
              <span className="text-white/40">Creative</span> <br />
              Studio
            </h1>
            <div className="h-px w-24 bg-white/20 mb-8" />
            <p className="text-lg md:text-xl text-white/60 font-light leading-relaxed max-w-xl">
              Transform your vision into reality with our advanced neural engine. 
              Describe your scene and let the machine compose the masterpiece.
            </p>
          </div>

          <div className="relative">
            {/* Decorative elements to frame the generator */}
            <div className="absolute -top-12 -left-12 w-24 h-24 border-t border-l border-white/10 pointer-events-none" />
            <div className="absolute -bottom-12 -right-12 w-24 h-24 border-b border-r border-white/10 pointer-events-none" />
            
            <div className="bg-white/[0.02] backdrop-blur-3xl border border-white/5 rounded-sm p-1 shadow-2xl">
              <ImageGenerator />
            </div>
          </div>

          {/* Bottom Info */}
          <div className="mt-24 grid grid-cols-1 md:grid-cols-3 gap-12 border-t border-white/5 pt-12">
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 block mb-4">01 / Engine</span>
              <h3 className="text-sm font-medium mb-2">Neural Composition</h3>
              <p className="text-xs text-white/40 leading-relaxed">Powered by state-of-the-art diffusion models for unparalleled detail and artistic coherence.</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 block mb-4">02 / Control</span>
              <h3 className="text-sm font-medium mb-2">Precision Ratios</h3>
              <p className="text-xs text-white/40 leading-relaxed">Optimized for cinematic 16:9, social 9:16, or classic 1:1 square formats.</p>
            </div>
            <div>
              <span className="text-[10px] uppercase tracking-[0.3em] text-white/30 block mb-4">03 / Output</span>
              <h3 className="text-sm font-medium mb-2">Studio Quality</h3>
              <p className="text-xs text-white/40 leading-relaxed">High-resolution exports ready for professional post-processing and digital display.</p>
            </div>
          </div>
        </Section>
      </main>
    </PageContainer>
  );
}
