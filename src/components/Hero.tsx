"use client";

import { Wand2, Image } from "lucide-react";
import Link from "next/link";
import dynamic from "next/dynamic";
const DarkVeil = dynamic(() => import("./DarkVeil"), { ssr: false, loading: () => null });
import { useEffect, useRef } from "react";

export default function Hero() {
  // Dynamic typing: cycle through three phrases, type, wait 3s, delete, then next
  const typedEl = useRef<HTMLSpanElement | null>(null);
  const caretEl = useRef<HTMLSpanElement | null>(null);
  const caretIntervalRef = useRef<number | null>(null);

  const phrases = [
    "PhotoGen Created by _visualsbytalha",
    "Next-Level visuals.",
    "Level up your Edits",
  ];

  useEffect(() => {
    const TYPE_SPEED = 100; // ms per char when typing
    const DELETE_SPEED = 60; // ms per char when deleting
    const PAUSE_AFTER_FULL = 4000; // ms pause when full text shown

    let current = 0;
    let charIndex = 0;
    let typingTimer: number | null = null;
    let deletingTimer: number | null = null;
    let pauseTimeout: number | null = null;

    const startCaret = () => {
      if (caretIntervalRef.current) return;
      if (caretEl.current) caretEl.current.textContent = '▌';
      caretIntervalRef.current = window.setInterval(() => {
        if (!caretEl.current) return;
        caretEl.current.textContent = caretEl.current.textContent ? '' : '▌';
      }, 500);
    };

    const stopCaret = () => {
      if (caretIntervalRef.current) {
        clearInterval(caretIntervalRef.current);
        caretIntervalRef.current = null;
      }
      if (caretEl.current) caretEl.current.textContent = '';
    };

    const typeCurrent = () => {
      const text = phrases[current];
      charIndex = 0;
      if (typedEl.current) typedEl.current.textContent = '';
      startCaret();
      typingTimer = window.setInterval(() => {
        charIndex++;
        if (typedEl.current) typedEl.current.textContent = text.slice(0, charIndex);
        if (charIndex >= text.length) {
          if (typingTimer) { clearInterval(typingTimer); typingTimer = null; }
          pauseTimeout = window.setTimeout(() => startDeleting(), PAUSE_AFTER_FULL);
        }
      }, TYPE_SPEED);
    };

    const startDeleting = () => {
      const text = phrases[current];
      deletingTimer = window.setInterval(() => {
        charIndex--;
        if (typedEl.current) typedEl.current.textContent = text.slice(0, charIndex);
        if (charIndex <= 0) {
          if (deletingTimer) { clearInterval(deletingTimer); deletingTimer = null; }
          pauseTimeout = window.setTimeout(() => {
            current = (current + 1) % phrases.length;
            typeCurrent();
          }, 250);
        }
      }, DELETE_SPEED);
    };

    typeCurrent();

    return () => {
      if (typingTimer) clearInterval(typingTimer);
      if (deletingTimer) clearInterval(deletingTimer);
      if (pauseTimeout) clearTimeout(pauseTimeout);
      stopCaret();
    };
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
          <h1
            className="text-white text-glow drop-shadow-lg leading-tight md:leading-snug"
            style={{ fontWeight: 500, fontSize: "clamp(2rem, 3.5vw, 2.5rem)", lineHeight: 0.9 }}
          >
            {/* Render the typed text but keep the original exact content as the source */}
            <span aria-live="polite">
              <span ref={typedEl} />
              <span aria-hidden className="ml-1" ref={caretEl} style={{ fontSize: '0.72em', lineHeight: 1 }}>{'▌'}</span>
            </span>
            {/* Provide screen-reader text with the full content so semantics remain unchanged */}
            <span className="sr-only">PhotoGen for Photo Enthusiasts</span>
          </h1>

          <div className="mt-8 flex flex-row items-center justify-center gap-3 sm:gap-4 pointer-events-auto">
            <div className="inline-flex items-center justify-center w-auto">
              <Link href="/studio" prefetch className="inline-flex items-center justify-center w-auto bg-white text-black rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-sm font-medium shadow-lg hover:brightness-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 text-center btn-violet">
                <Wand2 size={16} className="mr-2 text-white" />
                AI Studio
              </Link>
            </div>
            <div className="inline-flex items-center justify-center w-auto">
              <Link href="/presets" prefetch className="inline-flex items-center justify-center w-auto bg-white/10 text-white rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-sm font-medium shadow hover:brightness-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 text-center ">
                <Image size={16} className="mr-2 text-white" />
                Lightroom Presets
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
