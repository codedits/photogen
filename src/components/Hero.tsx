"use client";

import { Wand2 } from "lucide-react";
import DarkVeil from "./DarkVeil";

export default function Hero() {
  return (
  <div className="w-full relative overflow-hidden z-0 h-[520px] sm:h-[640px] md:h-[720px] mt-16 sm:mt-0">
      <DarkVeil
        hueShift={10}
        noiseIntensity={0.01}
        scanlineIntensity={0.05}
        speed={0.7}
        warpAmount={0.03}
        resolutionScale={typeof window !== 'undefined' ? Math.min(1, window.devicePixelRatio || 1) : 1}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-[420px] mx-auto px-4 text-center">
            <h1 className="text-white text-glow drop-shadow-lg leading-tight md:leading-snug"
            style={{ fontWeight: 500, fontSize: "clamp(1.75rem, 3.5vw, 2rem)" }}>
              Ever imagined beyond the Reality, Lets Create it.
            </h1>

           <div className="mt-8 flex flex-col sm:flex-row justify-center gap-3 sm:gap-4 pointer-events-auto">
  <a
    href="/studio"
    className="inline-flex items-center justify-center w-full sm:w-auto bg-white text-black rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-sm font-medium shadow-lg hover:brightness-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 text-center"
  >
    <Wand2 size={16} className="mr-2 text-black" />
    AI Studio
  </a>

              <a
                href="#portfolio"
                className="inline-block w-full sm:w-auto border border-white/10 text-white rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-sm font-medium bg-transparent hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 text-center mt-2 sm:mt-0"
              >
                portfolio
              </a>
            </div>
        </div>
      </div>
    </div>
  );
}
