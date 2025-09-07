"use client";

import React, { useEffect, useRef } from "react";

type CountUpProps = {
  end: number;
  duration?: number; // ms
  suffix?: string;
  start?: number;
  decimals?: number;
};

export default function CountUp({ end, duration = 1200, suffix = "", start = 0, decimals = 0 }: CountUpProps) {
  const ref = useRef<HTMLSpanElement | null>(null);
  const started = useRef(false);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const format = (n: number) => {
      if (decimals > 0) return n.toFixed(decimals);
      // use simple integer formatting
      return Math.round(n).toString();
    };

    // Stabilize layout while the number animates:
    // - use tabular numbers so digit widths are constant
    // - reserve a minimum width based on the larger of start/end
    // - make the element an inline-block and promote it to its own layer
    try {
      const formattedStart = format(start);
      const formattedEnd = format(end);
      const maxChars = Math.max(formattedStart.length, formattedEnd.length) + (suffix ? suffix.length : 0);
      el.style.minWidth = `${maxChars}ch`;
      el.style.display = 'inline-block';
  el.style.willChange = 'opacity';
  // fontVariantNumeric ensures digits use tabular (fixed) widths in supporting browsers
  // use a safe typed cast for extensible style properties
  const style = el.style as CSSStyleDeclaration & { fontVariantNumeric?: string; webkitBackgroundClip?: string };
  style.fontVariantNumeric = 'tabular-nums';
      // copy parent's background image and clipping so gradient text remains visible
      const parent = el.parentElement;
      if (parent) {
        const parentStyle = window.getComputedStyle(parent);
        const bg = parentStyle.backgroundImage;
        if (bg && bg !== 'none') {
          el.style.backgroundImage = bg;
          el.style.backgroundClip = 'text';
      // WebKit prefix for broader compatibility
      style.webkitBackgroundClip = 'text';
          el.style.color = 'transparent';
        }
      }
    } catch {
      // non-fatal: styling hints are best-effort
    }

    const onIntersect: IntersectionObserverCallback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !started.current) {
          started.current = true;
          const t0 = performance.now();
          const from = start;
          const to = end;
          const diff = to - from;

          const step = (now: number) => {
            const t = Math.min(1, (now - t0) / duration);
            // easeOutQuart for a smoother, gentler finish
            const eased = 1 - Math.pow(1 - t, 4);
            const current = from + diff * eased;
            // write directly to DOM for smoother updates
            el.textContent = `${format(current)}${suffix}`;
            if (t < 1) {
              rafRef.current = requestAnimationFrame(step);
            } else {
              rafRef.current = null;
            }
          };

          rafRef.current = requestAnimationFrame(step);
        }
      });
    };

    const obs = new IntersectionObserver(onIntersect, { threshold: 0.35 });
    obs.observe(el);
    return () => {
      obs.disconnect();
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [end, duration, start, decimals, suffix]);

  return (
    <span ref={ref} aria-live="polite">{start}{suffix}</span>
  );
}
