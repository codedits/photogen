"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Nav() {
  const pathname = usePathname() || '';

  // Hide nav on presets detail page like /presets/:id where id is a 24-char hex ObjectId
  const isPresetDetail = /^\/presets\/[0-9a-fA-F]{24}\/?$/.test(pathname);
  if (isPresetDetail) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      {/* subtle top gradient to improve contrast against variable page backgrounds */}
      <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none z-0 bg-gradient-to-b from-black/40 via-black/30 to-transparent" />
      <nav className="relative z-50 pointer-events-auto w-full px-6 sm:px-12 py-6 flex items-center justify-between bg-transparent text-white">
        {/* Brand (left) */}
        <Link href="/" className="flex items-center gap-3 leading-none">
          <span className="font-light text-xl tracking-tighter text-white uppercase">PhotoGen</span>
        </Link>

        {/* Actions (right) */}
        <div className="flex items-center gap-8 justify-end leading-none">
          <Link href="/presets" className="text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors">
            Presets
          </Link>
          <Link href="/studio" className="text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors">
            Studio
          </Link>
          <Link href="/gallery" className="text-[10px] uppercase tracking-[0.2em] text-white/60 hover:text-white transition-colors">
            Gallery
          </Link>
        </div>
      </nav>
    </header>
  );
}
