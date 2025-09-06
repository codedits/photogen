"use client";

import { Wand2 } from "lucide-react";
import DarkVeil from "./DarkVeil";
import { useEffect, useState, useRef } from "react";

export default function Hero() {
  // Preserve exact original text but animate its reveal
  const FULL_TEXT = "PhotoGen Created by _visualsbytalha";
  const [typed, setTyped] = useState("");
  const [caretVisible, setCaretVisible] = useState(true);
  const idxRef = useRef(0);
  const typingRef = useRef<number | null>(null);
  const caretRef = useRef<number | null>(null);

  useEffect(() => {
    // typing interval: compute per-character delay so full text finishes in ~2500ms
    const targetDuration = 3500; // ms total for full text
    const perChar = Math.max(8, Math.round(targetDuration / Math.max(1, FULL_TEXT.length)));
    typingRef.current = window.setInterval(() => {
      const i = idxRef.current;
      if (i < FULL_TEXT.length) {
        idxRef.current = i + 1;
        setTyped(FULL_TEXT.slice(0, i + 1));
        if (i + 1 === FULL_TEXT.length) {
          // finished typing this mount — stop typing interval
          if (typingRef.current) { clearInterval(typingRef.current); typingRef.current = null; }
          // stop caret blinking and hide it
          if (caretRef.current) { clearInterval(caretRef.current); caretRef.current = null; }
          setCaretVisible(false);
        }
      } else {
        // safety: if somehow exceeded, clear interval
        if (typingRef.current) { clearInterval(typingRef.current); typingRef.current = null; }
      }
    }, perChar);

    // caret blink
    caretRef.current = window.setInterval(() => {
      setCaretVisible((v) => !v);
    }, 200);

    return () => {
      if (typingRef.current) clearInterval(typingRef.current);
      if (caretRef.current) clearInterval(caretRef.current);
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
          <h1
            className="text-white text-glow drop-shadow-lg leading-tight md:leading-snug"
            style={{ fontWeight: 550, fontSize: "clamp(1.75rem, 3.5vw, 2rem)", lineHeight: 0.9 }}
          >
            {/* Render the typed text but keep the original exact content as the source */}
            <span aria-live="polite">{typed || ""}<span aria-hidden className="ml-1">{caretVisible ? '▌' : ''}</span></span>
            {/* Provide screen-reader text with the full content so semantics remain unchanged */}
            <span className="sr-only">PhotoGen Created by _visualsbytalha</span>
          </h1>

          <div className="mt-8 flex flex-row items-center justify-center gap-3 sm:gap-4 pointer-events-auto">
            <a
              href="/studio"
              className="inline-flex items-center justify-center w-auto bg-white text-black rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-sm font-medium shadow-lg hover:brightness-95 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 text-center btn-violet"
            >
              <Wand2 size={16} className="mr-2 text-white" />
              AI Studio
            </a>

            <a
              href="#portfolio"
              className="inline-block w-auto border border-white/10 text-white rounded-full px-4 sm:px-6 py-1.5 sm:py-2 text-sm font-medium bg-transparent hover:bg-white/5 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-400 text-center"
            >
              portfolio
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
