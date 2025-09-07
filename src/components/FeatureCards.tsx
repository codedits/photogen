"use client";

import React from 'react';
import CountUp from './CountUp';

export default function FeatureCards() {
  return (
    <section className="mt-8 sm:mt-12 relative z-10 w-full">
      <div className="w-full max-w-6xl mx-auto">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="grid grid-rows-2 gap-6">
            <article className="rounded-lg border border-white/6 p-6 bg-[rgba(255,255,255,0.02)] hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-6">
                <div className="text-5xl md:text-6xl font-extrabold text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#a855f7,#7c3aed)' }}>
                  <CountUp end={100} suffix="%" duration={2200} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white glow-sm">Free & Open Source</h4>
                  <p className="text-sm text-zinc-400 mt-1">For everyone</p>
                </div>
              </div>
            </article>

            <article className="rounded-lg border border-white/6 p-6 bg-[rgba(255,255,255,0.02)] hover:shadow-lg transition-shadow">
              <div className="flex items-start gap-6">
                <div className="text-4xl md:text-5xl font-extrabold text-violet-400  ">
                  <CountUp end={4} duration={1400} decimals={1} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold text-white glow-sm">Component Variants</h4>
                  <p className="text-sm text-zinc-400 mt-1">Premium Presets</p>
                </div>
              </div>
            </article>
          </div>

          <article className="rounded-lg border border-white/6 p-8 bg-[rgba(255,255,255,0.01)] hover:shadow-2xl transition-shadow flex items-end" style={{ minHeight: 240 }}>
            <div>
              <div className="text-6xl md:text-7xl font-extrabold text-transparent bg-clip-text" style={{ backgroundImage: 'linear-gradient(90deg,#a855f7,#7c3aed)', WebkitBackgroundClip: 'text', color: 'transparent' }}>
                <CountUp end={50} suffix="+" duration={2400} />
              </div>
              <h4 className="text-2xl font-semibold text-white  mt-2 glow-sm">Creative Presets</h4>
              <p className="text-sm text-zinc-400 mt-2">Growing weekly & only getting better</p>
            </div>
          </article>
        </div>
      </div>
    </section>
  );
}
