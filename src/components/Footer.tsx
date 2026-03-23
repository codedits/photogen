"use client";
import React from "react";
import Link from "next/link";

import { usePathname } from 'next/navigation';

export default function Footer() {
  const pathname = usePathname() || '';
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="bg-[#050505] text-white border-t border-white/[0.06]">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        
        {/* Main Grid */}
        <div className="py-20 grid grid-cols-1 md:grid-cols-12 gap-12 md:gap-8">
          
          {/* Brand & Description */}
          <div className="md:col-span-5">
            <h4 className="text-sm font-medium tracking-tight mb-5 uppercase">PhotoGen</h4>
            <p className="text-[13px] text-white/40 leading-relaxed max-w-sm">
              The intersection of artificial intelligence and professional photography. Elevating visual storytelling through intelligent tools.
            </p>
            <a 
              href="mailto:hello@photogen.studio" 
              className="inline-block mt-6 text-[11px] uppercase tracking-[0.15em] text-white/50 hover:text-white transition-colors border-b border-white/10 pb-0.5"
            >
              hello@photogen.studio →
            </a>
          </div>
          
          {/* Navigation */}
          <div className="md:col-span-3 md:col-start-7">
            <h5 className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-6">Navigate</h5>
            <ul className="space-y-3.5">
              {[
                { href: '/', label: 'Home' },
                { href: '/presets', label: 'Presets' },
                { href: '/studio', label: 'Studio' },
                { href: '/gallery', label: 'Gallery' },
              ].map(link => (
                <li key={link.href}>
                  <Link href={link.href} className="text-[12px] text-white/50 hover:text-white transition-colors duration-300">
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          
          {/* Social */}
          <div className="md:col-span-2">
            <h5 className="text-[10px] uppercase tracking-[0.2em] text-white/25 mb-6">Connect</h5>
            <ul className="space-y-3.5">
              <li>
                <a href="https://www.instagram.com/_visualsbytalha/" target="_blank" rel="noreferrer" className="text-[12px] text-white/50 hover:text-white transition-colors duration-300">
                  Instagram
                </a>
              </li>
              <li>
                <a href="https://github.com/codedits" target="_blank" rel="noreferrer" className="text-[12px] text-white/50 hover:text-white transition-colors duration-300">
                  GitHub
                </a>
              </li>
            </ul>
          </div>

        </div>
        
        {/* Bottom Bar */}
        <div className="py-6 border-t border-white/[0.04] flex flex-col sm:flex-row justify-between items-center gap-2">
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/20">© 2025 PhotoGen</p>
          <p className="text-[10px] uppercase tracking-[0.15em] text-white/20">Built by _visualsbytalha</p>
        </div>
      </div>
    </footer>
  );
}