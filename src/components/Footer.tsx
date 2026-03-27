"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from 'next/navigation';
import { motion } from "framer-motion";

export default function Footer() {
  const pathname = usePathname() || '';
  if (pathname.startsWith('/admin')) return null;

  return (
    <footer className="relative pt-32 pb-12 overflow-hidden bg-background text-foreground border-t border-white/5">
      <div className="max-w-[1800px] mx-auto px-6 md:px-12 lg:px-20">
        
        {/* Massive Editorial Headline */}
        <div className="mb-24 md:mb-32">
          <motion.h2 
            initial={{ y: 50, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1, ease: [0.16, 1, 0.3, 1] }}
            className="text-[14vw] md:text-[12vw] leading-[0.8] font-light uppercase tracking-tighter text-foreground"
          >
            PhotoGen
          </motion.h2>
        </div>

        {/* Info Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-16 md:gap-x-20 items-end">
          
          {/* Summary/Tagline */}
          <div className="md:col-span-4 lg:col-span-5">
            <p className="text-xl md:text-2xl font-light text-foreground leading-[1.1] tracking-tight max-w-sm mb-8">
              Elevating visual storytelling through intelligent, AI-powered tools.
            </p>
            <a 
              href="mailto:hello@photogen.studio" 
              className="group flex items-center gap-3 text-[10px] uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all duration-500"
            >
              <span className="w-8 h-[1px] bg-muted-foreground group-hover:bg-foreground group-hover:w-12 transition-all duration-500" />
              hello@photogen.studio
            </a>
          </div>

          {/* Links Section */}
          <div className="md:col-span-8 lg:col-span-7 grid grid-cols-2 md:grid-cols-3 gap-12">
            
            {/* Column 1: Explore */}
            <div>
              <h5 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/30 mb-8 font-mono">Explore</h5>
              <ul className="space-y-4">
                {[
                  { href: '/', label: 'Home' },
                  { href: '/presets', label: 'Presets' },
                  { href: '/gallery', label: 'Gallery' },
                ].map(link => (
                  <li key={link.href}>
                    <Link 
                      href={link.href} 
                      className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-1 inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 2: Studio */}
            <div>
              <h5 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/30 mb-8 font-mono">Studio</h5>
              <ul className="space-y-4">
                {[
                  { href: '/studio', label: 'Studio' },
                  { href: '/blog', label: 'Insights' },
                  { href: '/contact', label: 'Contact' },
                ].map(link => (
                  <li key={link.href}>
                    <Link 
                      href={link.href} 
                      className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all duration-300 hover:translate-x-1 inline-block"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Column 3: Connect */}
            <div className="col-span-2 md:col-span-1">
              <h5 className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground/30 mb-8 font-mono">Connect</h5>
              <ul className="space-y-4">
                <li>
                  <a 
                    href="https://instagram.com/_visualsbytalha/" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all duration-300 inline-block"
                  >
                    Instagram
                  </a>
                </li>
                <li>
                  <a 
                    href="https://github.com/codedits" 
                    target="_blank" 
                    rel="noreferrer" 
                    className="text-xs uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all duration-300 inline-block"
                  >
                    GitHub
                  </a>
                </li>
              </ul>
            </div>

          </div>
        </div>

        {/* Bottom Bar: Ultra Minimal */}
        <div className="mt-32 pt-8 border-t border-white/5 flex flex-col md:row items-center md:flex-row justify-between gap-6">
          <div className="flex gap-8">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40">© 2025 Photogen Studio</span>
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40 hidden md:block">All rights reserved</span>
          </div>
          
          <div className="flex items-center gap-4">
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40">Built by _visualsbytalha</span>
            <div className="w-8 h-[1px] bg-white/10" />
            <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground/40">London, UK</span>
          </div>
        </div>

      </div>
    </footer>
  );
}