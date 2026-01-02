"use client";
import React from "react";
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="bg-black text-white py-24 border-t border-white/5">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-start gap-12">
          <div className="max-w-sm">
            <h4 className="text-xl font-light tracking-tighter mb-6 uppercase">PhotoGen</h4>
            <p className="text-white/40 text-sm leading-relaxed font-sans">
              The intersection of artificial intelligence and professional photography. Elevating visual storytelling through intelligent tools.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-12 sm:gap-24">
            <div>
              <h5 className="text-[10px] uppercase tracking-[0.2em] text-white/20 mb-6">Navigation</h5>
              <ul className="space-y-4 text-[11px] uppercase tracking-widest text-white/60">
                <li><Link href="/presets" className="hover:text-white transition-colors">Presets</Link></li>
                <li><Link href="/studio" className="hover:text-white transition-colors">Studio</Link></li>
                <li><Link href="/gallery" className="hover:text-white transition-colors">Gallery</Link></li>
              </ul>
            </div>
            <div>
              <h5 className="text-[10px] uppercase tracking-[0.2em] text-white/20 mb-6">Social</h5>
              <ul className="space-y-4 text-[11px] uppercase tracking-widest text-white/60">
                <li><a href="https://www.instagram.com/_visualsbytalha/" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">Instagram</a></li>
                <li><a href="https://github.com/codedits" target="_blank" rel="noreferrer" className="hover:text-white transition-colors">GitHub</a></li>
              </ul>
            </div>
          </div>
        </div>
        
        <div className="mt-24 pt-8 border-t border-white/5 flex justify-between items-center">
          <p className="text-[10px] uppercase tracking-widest text-white/20">© 2025 PhotoGen</p>
          <p className="text-[10px] uppercase tracking-widest text-white/20">Built by _visualsbytalha</p>
        </div>
      </div>
    </footer>
  );
}