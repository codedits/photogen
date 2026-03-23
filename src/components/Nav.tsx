"use client";

import React, { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X } from 'lucide-react';

const NAV_LINKS = [
  { href: '/presets', label: 'Presets', count: '03' },
  { href: '/studio', label: 'Studio', count: '01' },
  { href: '/gallery', label: 'Gallery', count: '12' },
];

export default function Nav() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const firstLinkRef = useRef<HTMLAnchorElement | null>(null);

  useEffect(() => setOpen(false), [pathname]);

  // Hide nav on admin pages or presets detail page
  if (pathname.startsWith('/admin')) return null;
  const isPresetDetail = /^\/presets\/[0-9a-fA-F]{24}\/?$/.test(pathname);
  if (isPresetDetail) return null;

  return (
    <header className="fixed top-0 left-0 right-0 z-[100] pointer-events-none mix-blend-difference">
      <div className="pointer-events-auto w-full">
        <nav className="w-full px-6 sm:px-10 lg:px-16 py-6 flex items-center justify-between">
          {/* Brand */}
          <Link href="/" className="flex items-center gap-2 leading-none group">
            <span className="font-bold text-base tracking-tight text-white uppercase translate-z-0">
              PhotoGen
            </span>
          </Link>

          {/* Desktop Links */}
          <div className="hidden md:flex items-center gap-12 leading-none">
            {NAV_LINKS.map(link => {
              const isActive = pathname.startsWith(link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`relative text-[13px] uppercase tracking-[0.2em] font-medium transition-colors duration-300 ${
                    isActive 
                      ? 'text-white underline underline-offset-8' 
                      : 'text-white hover:opacity-70'
                  }`}
                >
                  {link.label}
                  <sup className="ml-1 text-[10px] font-mono opacity-40">{link.count}</sup>
                </Link>
              );
            })}
          </div>

          {/* Mobile Hamburger */}
          <div className="md:hidden flex items-center">
            <button
              onClick={() => setOpen(true)}
              aria-label="Open menu"
              aria-expanded={open}
              className="p-2 text-white hover:scale-110 transition-transform"
            >
              <Menu className="w-5 h-5" />
            </button>
          </div>
        </nav>
      </div>

      {/* Off-canvas overlay */}
      <div
        className={`fixed inset-0 z-40 bg-black/50 backdrop-blur-sm transition-opacity duration-300 ${
          open ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'
        }`}
        onClick={() => setOpen(false)}
      />

      {/* Mobile Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 bg-[#0a0a0a]/95 backdrop-blur-2xl border-r border-white/[0.06] transform transition-transform duration-300 ease-out ${
          open ? 'translate-x-0 pointer-events-auto' : '-translate-x-full pointer-events-none'
        }`}
        aria-hidden={!open}
      >
        <div className="h-16 flex items-center justify-between px-6 border-b border-white/[0.06]">
          <Link href="/" className="text-sm font-medium tracking-tight text-white uppercase" onClick={() => setOpen(false)}>
            PhotoGen
          </Link>
          <button onClick={() => setOpen(false)} aria-label="Close menu" className="p-2 text-white/50 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>

        <nav className="p-6 space-y-1">
          {[{ href: '/', label: 'Home' }, ...NAV_LINKS].map(link => (
            <Link
              key={link.href}
              ref={link.href === '/' ? firstLinkRef : undefined}
              href={link.href}
              className={`block px-4 py-3.5 rounded-lg text-[15px] uppercase tracking-[0.1em] transition-colors ${
                pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href))
                  ? 'text-white bg-white/5'
                  : 'text-white/50 hover:text-white hover:bg-white/[0.03]'
              }`}
              onClick={() => setOpen(false)}
            >
              {link.label}
            </Link>
          ))}
        </nav>
      </aside>
    </header>
  );
}
