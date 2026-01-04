"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from 'lucide-react';

export default function Nav() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  // Hide nav on admin pages or presets detail page
  if (pathname.startsWith('/admin')) return null;
  const isPresetDetail = /^\/presets\/[0-9a-fA-F]{24}\/?$/.test(pathname);
  if (isPresetDetail) return null;

  // close on route change or escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false); };
    if (open) document.body.style.overflow = 'hidden';
    else document.body.style.overflow = '';
    window.addEventListener('keydown', onKey);
    return () => { window.removeEventListener('keydown', onKey); document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => setOpen(false), [pathname]);

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex justify-center pointer-events-none">
      {/* subtle top gradient to improve contrast against variable page backgrounds */}
      <div className="absolute top-0 left-0 right-0 h-20 pointer-events-none z-0 bg-gradient-to-b from-black/40 via-black/30 to-transparent" />
      <nav className="relative z-50 pointer-events-auto w-full px-6 sm:px-12 py-6 flex items-center justify-between bg-transparent text-white">
        {/* Brand (left) */}
        <Link href="/" className="flex items-center gap-3 leading-none">
          <span className="font-light text-xl tracking-tighter text-white uppercase">PhotoGen</span>
        </Link>

        {/* Desktop Actions (hidden on mobile) */}
        <div className="hidden md:flex items-center gap-8 justify-end leading-none">
          <Link 
            href="/presets" 
            className={`text-[10px] uppercase tracking-[0.2em] transition-colors ${pathname.startsWith('/presets') ? 'text-white font-medium' : 'text-white/60 hover:text-white'}`}
          >
            Presets
          </Link>
          <Link 
            href="/studio" 
            className={`text-[10px] uppercase tracking-[0.2em] transition-colors ${pathname.startsWith('/studio') ? 'text-white font-medium' : 'text-white/60 hover:text-white'}`}
          >
            Studio
          </Link>
          <Link 
            href="/gallery" 
            className={`text-[10px] uppercase tracking-[0.2em] transition-colors ${pathname.startsWith('/gallery') ? 'text-white font-medium' : 'text-white/60 hover:text-white'}`}
          >
            Gallery
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden flex items-center">
          <button
            onClick={() => setOpen(true)}
            aria-label="Open menu"
            aria-expanded={open}
            className="p-2 rounded-md text-white/80 hover:text-white hover:bg-white/5 transition-colors pointer-events-auto"
          >
            <Menu className="w-6 h-6" />
          </button>
        </div>
      </nav>

      {/* Off-canvas overlay */}
      <div className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 ${open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`} onClick={() => setOpen(false)} />

      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-zinc-950/95 backdrop-blur-xl border-r border-white/[0.06] transform transition-transform duration-300 ${open ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'}`} aria-hidden={!open}>
        <div className="h-16 flex items-center justify-between px-4 border-b border-white/[0.06]">
          <Link href="/" className="flex items-center gap-3 leading-none" onClick={() => setOpen(false)}>
            <span className="font-light text-lg tracking-tighter text-white uppercase">PhotoGen</span>
          </Link>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 rounded-md text-white/60 hover:text-white hover:bg-white/5">
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="p-4 space-y-2">
          <Link ref={firstLinkRef} href="/" className="block px-3 py-3 rounded-lg text-sm font-medium text-white/80 hover:bg-white/5" onClick={() => setOpen(false)}>Home</Link>
          <Link href="/presets" className="block px-3 py-3 rounded-lg text-sm font-medium text-white/80 hover:bg-white/5" onClick={() => setOpen(false)}>Presets</Link>
          <Link href="/studio" className="block px-3 py-3 rounded-lg text-sm font-medium text-white/80 hover:bg-white/5" onClick={() => setOpen(false)}>Studio</Link>
          <Link href="/gallery" className="block px-3 py-3 rounded-lg text-sm font-medium text-white/80 hover:bg-white/5" onClick={() => setOpen(false)}>Gallery</Link>
        </nav>

        <div className="mt-auto p-4 border-t border-white/[0.04]">
          <Link href="/" className="block px-3 py-2 rounded-lg text-sm text-white/60 hover:text-white hover:bg-white/5" onClick={() => setOpen(false)}>View site</Link>
        </div>
      </aside>
    </header>
  );
}
