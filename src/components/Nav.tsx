"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Menu, X, Plus } from 'lucide-react';
import { motion, AnimatePresence, LayoutGroup } from 'framer-motion';
import { cn } from "@/lib/utils";

const NAV_LINKS = [
  { href: '/gallery', label: 'Projects' },
  { href: '/presets', label: 'Presets' },
  { href: '/studio', label: 'Studio' },
  { href: '/contact', label: 'About' },
];

export default function Nav() {
  const pathname = usePathname() || '';
  const [open, setOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [time, setTime] = useState("");

  useEffect(() => {
    setOpen(false);
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleDateString('en-GB', { day: '2-digit', month: 'short' }) + " / " + 
               now.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true }).toLowerCase());
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
  }, [open]);

  if (pathname.startsWith('/admin')) return null;
  const isPresetDetail = /^\/presets\/[0-9a-fA-F]{24}\/?$/.test(pathname);
  if (isPresetDetail) return null;

  const springConfig = { type: "spring" as const, stiffness: 400, damping: 30 };

  return (
    <LayoutGroup>
      <header className="fixed top-0 left-0 right-0 z-[999] pointer-events-none flex justify-center pt-0">
        <motion.div
          layout
          initial={false}
          transition={springConfig}
          className={cn(
            "pointer-events-auto relative flex items-center justify-between shadow-[0_4px_24px_rgba(0,0,0,0.3)]",
            "w-[98vw] md:w-[90vw] max-w-[1550px] px-5 py-1 md:px-8 md:py-1.5",
            "bg-[#111111] backdrop-blur-xl border-x border-b border-white/10 rounded-b-xl md:rounded-b-2xl",
            isScrolled ? "opacity-98" : "opacity-100"
          )}
        >
          {/* Left Section: Logo & Time */}
          <div className="flex items-center gap-4">
            <Link href="/" className="flex items-center gap-2 leading-none relative z-50">
              <span className="text-[13px] md:text-[14px] tracking-tight text-white uppercase font-semibold">
                PhotoGen®
              </span>
            </Link>
            <span className="hidden sm:block text-[10px] md:text-[11px] font-mono text-zinc-500 uppercase tracking-wider mt-0.5">
              {time}
            </span>
          </div>

          {/* Right Section: Links & CTA */}
          <div className="flex items-center gap-4 md:gap-10">
            <nav className="hidden md:flex items-center gap-4 lg:gap-5">
              {NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "px-3 py-1.5 text-[15px] md:text-[16px] font-medium transition-colors hover:text-white tracking-tight",
                      isActive ? "text-white" : "text-white"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </nav>

            <div className="flex items-center gap-3 md:gap-4">
              <Link
                href="/contact"
                className="hidden sm:block px-5 py-2 bg-white text-black text-[10px] uppercase tracking-[0.15em] font-bold rounded-full hover:bg-zinc-200 transition-colors"
                title="Book an Inquiry"
              >
                Inquiry
              </Link>
              <button
                onClick={() => setOpen(true)}
                className="flex items-center justify-center rounded-full p-2 bg-zinc-900 text-white hover:bg-zinc-800 transition-colors border border-white/5"
              >
                <Plus className={cn("w-4 h-4 transition-transform", open ? "rotate-45" : "rotate-0")} />
              </button>
            </div>
          </div>
        </motion.div>
      </header>

      {/* Full-screen Overlay Menu */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[1000] bg-black/60 backdrop-blur-md pointer-events-auto overflow-y-auto"
            onClick={() => setOpen(false)}
          >
            <motion.div
              layoutId="nav-island"
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ ...springConfig, damping: 35 }}
              className="absolute inset-4 md:inset-8 bg-background backdrop-blur-3xl rounded-[2rem] md:rounded-[3rem] border border-white/10 flex flex-col justify-center px-8 md:px-24 overflow-hidden min-h-[500px]"
              onClick={(e) => e.stopPropagation()}
            >
              <button 
                 onClick={() => setOpen(false)}
                 className="absolute top-8 right-8 md:top-12 md:right-12 p-3 text-white/20 hover:text-white transition-colors"
              >
                 <X size={28} strokeWidth={1} />
              </button>

              <nav className="space-y-4 md:space-y-8 max-w-4xl">
                {[{ href: '/', label: 'Home', count: '00' }, ...NAV_LINKS.map((l, i) => ({ ...l, count: `0${i+1}` }))].map((link, i) => (
                  <motion.div
                    key={link.href}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    transition={{ duration: 0.6, delay: 0.1 + i * 0.05, ease: [0.16, 1, 0.3, 1] }}
                  >
                    <Link
                      href={link.href}
                      className="group inline-flex items-center gap-4 md:gap-8 text-5xl sm:text-6xl md:text-8xl lg:text-9xl font-normal text-white uppercase tracking-tighter hover:text-zinc-500 transition-colors"
                      onClick={() => setOpen(false)}
                    >
                      <span className="text-[10px] md:text-xs font-mono text-zinc-800 mt-2 md:mt-4 self-start">{link.count}</span>
                      <span className="relative">
                        {link.label}
                      </span>
                    </Link>
                  </motion.div>
                ))}
              </nav>

              <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 transition={{ delay: 0.5 }}
                 className="absolute bottom-8 left-8 md:bottom-12 md:left-24 flex flex-wrap gap-x-8 md:gap-x-12 gap-y-2 text-[9px] md:text-[10px] uppercase tracking-[0.3em] text-zinc-600 font-mono"
              >
                 <Link href="#" className="hover:text-white transition-colors">Instagram</Link>
                 <Link href="#" className="hover:text-white transition-colors">Twitter</Link>
                 <Link href="#" className="hover:text-white transition-colors">Studio_25</Link>
              </motion.div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </LayoutGroup>
  );
}
