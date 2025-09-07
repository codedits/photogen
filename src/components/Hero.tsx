"use client";

import { Wand2 } from "lucide-react";
import DarkVeil from "./DarkVeil";
import { useEffect, useRef } from "react";
import { motion } from "framer-motion";

export default function Hero() {
  // Preserve exact original text but animate its reveal
  const FULL_TEXT = "PhotoGen Created by _visualsbytalha";
  const typedEl = useRef<HTMLSpanElement | null>(null);
  const caretEl = useRef<HTMLSpanElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const caretIntervalRef = useRef<number | null>(null);

  useEffect(() => {
    // DOM-driven typing using requestAnimationFrame to avoid React re-renders per character.
    const targetDuration = 3500; // total ms to reveal full text
    const start = performance.now();

    const step = (now: number) => {
      const t = Math.min(1, (now - start) / targetDuration);
      const chars = Math.floor(t * FULL_TEXT.length);
      if (typedEl.current) typedEl.current.textContent = FULL_TEXT.slice(0, chars);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
        // ensure full text is present at the end
        if (typedEl.current) typedEl.current.textContent = FULL_TEXT;
        // stop caret blinking
        if (caretIntervalRef.current) {
          clearInterval(caretIntervalRef.current);
          caretIntervalRef.current = null;
        }
        if (caretEl.current) caretEl.current.textContent = '';
      }
    };

    // start caret blinking by toggling textContent directly
    if (caretEl.current) caretEl.current.textContent = '▌';
    caretIntervalRef.current = window.setInterval(() => {
      if (!caretEl.current) return;
      caretEl.current.textContent = caretEl.current.textContent ? '' : '▌';
    }, 500);

    rafRef.current = requestAnimationFrame(step);

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (caretIntervalRef.current) clearInterval(caretIntervalRef.current);
    };
    // run once on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="w-full relative overflow-hidden z-0 h-screen sm:h-[640px] md:h-[720px] mt-0">
      <DarkVeil
        hueShift={10}
        noiseIntensity={0.01}
        scanlineIntensity={0.05}
        speed={1.5}
        warpAmount={0.03}
        resolutionScale={typeof window !== "undefined" ? Math.min(1, window.devicePixelRatio || 1) : 1}
      />
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
        <div className="w-full max-w-[420px] mx-auto px-4 text-center">
          <motion.h1
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="text-white text-glow drop-shadow-lg leading-tight md:leading-snug"
            style={{ fontWeight: 550, fontSize: "clamp(2rem, 3.5vw, 2.5rem)", lineHeight: 0.9 }}
          >
            {/* Render the typed text but keep the original exact content as the source */}
            <span aria-live="polite">
              <span ref={typedEl} />
              <span aria-hidden className="ml-1" ref={caretEl}>{'▌'}</span>
            </span>
            {/* Provide screen-reader text with the full content so semantics remain unchanged */}
            <span className="sr-only">PhotoGen for Photo Enthusiasts</span>
          </motion.h1>

          <motion.div
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.25 }}
            className="mt-8 flex flex-row items-center justify-center gap-3 sm:gap-4 pointer-events-auto"
          >
            <motion.a
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              href="/studio"
              className="inline-flex items-center justify-center w-auto bg-white text-black rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-sm font-medium shadow-lg hover:brightness-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 text-center btn-violet"
            >
              <Wand2 size={16} className="mr-2 text-white" />
              AI Studio
            </motion.a>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
