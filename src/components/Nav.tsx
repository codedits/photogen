"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Plus } from "lucide-react";
import { motion, AnimatePresence, LayoutGroup, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { ThemeToggle } from "./ThemeToggle";
import LiquidRiseCTA from "./LiquidRiseCTA";
import { cloudinaryPresetUrl } from "@/lib/cloudinaryUrl";

const NAV_LINKS = [
  { href: "/gallery", label: "Projects" },
  { href: "/blog", label: "Blog" },
  { href: "/presets", label: "Presets" },
  { href: "/studio", label: "Studio" },
  { href: "/wallpapers", label: "Wallpapers" },
];

export default function Nav() {
  const pathname = usePathname() || "";
  const [open, setOpen] = useState(false);
  const [navShapeExpanded, setNavShapeExpanded] = useState(false);
  const [menuContentVisible, setMenuContentVisible] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);
  const [time, setTime] = useState("");
  const prefersReducedMotion = useReducedMotion();

  // Determine if nav is in scrolled/contracted state
  const isGalleryDetail = /^\/gallery\/[0-9a-fA-F]{24}\/?$/.test(pathname);
  const isPresetDetail = /^\/presets\/[0-9a-fA-F]{24}\/?$/.test(pathname);
  const activeScrolled = isScrolled && !isGalleryDetail && !isPresetDetail;

  const activeScrolledRef = React.useRef(activeScrolled);
  useEffect(() => {
    activeScrolledRef.current = activeScrolled;
  }, [activeScrolled]);

  useEffect(() => {
    setOpen(false);

    const updateTime = () => {
      const now = new Date();
      setTime(
        now.toLocaleDateString("en-GB", { day: "2-digit", month: "short" }) +
        " / " +
        now
          .toLocaleTimeString("en-US", {
            hour: "numeric",
            minute: "2-digit",
            hour12: true,
          })
          .toLowerCase()
      );
    };

    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, [pathname]);

  useEffect(() => {
    let rafId = 0;
    const handleScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        const next = window.scrollY > 20;
        setIsScrolled((prev) => (prev === next ? prev : next));
        rafId = 0;
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    handleScroll();
    return () => {
      if (rafId) window.cancelAnimationFrame(rafId);
      window.removeEventListener("scroll", handleScroll);
    };
  }, []);

  // Orchestrate the sequential open/close animations
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (open) {
      setNavShapeExpanded(true);
      if (activeScrolledRef.current) {
        timer = setTimeout(() => {
          setMenuContentVisible(true);
        }, 450); // wait for width expansion
      } else {
        setMenuContentVisible(true);
      }
    } else {
      setMenuContentVisible(false);
      timer = setTimeout(() => {
        setNavShapeExpanded(false);
      }, 450); // wait for height collapse
    }
    return () => clearTimeout(timer);
  }, [open]);

  if (pathname.startsWith("/admin") || /^\/wallpapers\/[0-9a-fA-F]{24}\/?$/.test(pathname)) return null;

  const springConfig = {
    type: prefersReducedMotion ? "tween" as const : "spring" as const,
    stiffness: prefersReducedMotion ? undefined : 400,
    damping: prefersReducedMotion ? undefined : 30,
    duration: prefersReducedMotion ? 0.15 : undefined,
  };

  return (
    <LayoutGroup>
      <header className="fixed top-0 left-0 right-0 z-[999] pointer-events-none flex justify-center px-4">
        <motion.div
          layout
          initial={prefersReducedMotion ? { opacity: 0 } : { y: -100, opacity: 0 }}
          animate={prefersReducedMotion ? { opacity: 1 } : { y: 0, opacity: 1 }}
          transition={
            prefersReducedMotion
              ? { duration: 0.2 }
              : {
                type: "spring",
                stiffness: 400,
                damping: 30,
                opacity: { delay: 0.35, duration: 1 },
                y: { delay: 0.45, duration: 1.2 },
                layout: { duration: 0.45, ease: [0.22, 1, 0.36, 1] }
              }
          }
          className={cn(
            "pointer-events-auto relative flex flex-col overflow-hidden shadow-[0_12px_48px_rgba(0,0,0,0.32)]",
            "bg-background border border-white/10 transition-colors duration-500",
            activeScrolled && !navShapeExpanded
              ? "mt-5 w-auto rounded-full px-2"
              : "w-[98vw] md:w-[94vw] max-w-[1600px] mt-0 rounded-b-[1rem] md:rounded-b-[1.2rem]",
            navShapeExpanded && "rounded-[2.5rem] mt-4 w-[96vw] md:w-[90vw]"
          )}
        >
          {/* TOP BAR */}
          <div className={cn(
            "flex items-center justify-between relative z-20",
            activeScrolled && !navShapeExpanded ? "px-4 py-1 gap-8" : "px-6 py-1 md:px-10 md:py-2"
          )}>
            {/* Logo */}
            <motion.div layout layoutId="nav-logo" className="shrink-0 group">
              <Link
                href="/"
                className="focus-ring flex items-center gap-2 leading-none relative z-50"
              >
                <span className="text-[15px] md:text-[16px] tracking-tight text-foreground uppercase font-black transition-transform group-hover:scale-105">
                  PhotoGen®
                </span>
              </Link>
            </motion.div>

            {/* Links */}
            <motion.div
              layout
              layoutId="nav-links"
              className={cn(
                "hidden md:flex items-center relative transition-all duration-300",
                activeScrolled && !navShapeExpanded ? "gap-6 px-2" : "gap-10 ml-auto mr-12",
                navShapeExpanded && "opacity-0 pointer-events-none translate-y-2"
              )}
            >
              {NAV_LINKS.map((link) => {
                const isActive = pathname.startsWith(link.href);
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "focus-ring text-[15px] md:text-[16px] font-medium tracking-tight whitespace-nowrap transition-all duration-300 text-foreground relative py-1",
                      isActive && "drop-shadow-[0_0_8px_rgba(255,255,255,0.6)] dark:drop-shadow-[0_0_12px_rgba(255,255,255,0.5)]"
                    )}
                  >
                    {link.label}
                  </Link>
                );
              })}
            </motion.div>

            {/* Actions */}
            <motion.div layout layoutId="nav-actions" className="flex items-center gap-2 md:gap-4 shrink-0">
              <ThemeToggle className={cn(
                "transition-transform duration-300",
                activeScrolled && !navShapeExpanded ? "scale-90" : "scale-100"
              )} />

              <button
                onClick={() => setOpen(!open)}
                aria-label={open ? "Close navigation menu" : "Open navigation menu"}
                aria-expanded={open}
                aria-controls="site-nav-panel"
                className={cn(
                  "focus-ring flex items-center justify-center rounded-full bg-secondary/30 text-foreground hover:bg-secondary transition-all border border-white/5",
                  activeScrolled && !navShapeExpanded ? "w-[30px] h-[30px]" : "w-[38px] h-[38px]"
                )}
              >
                <Plus
                  className={cn(
                    "transition-transform duration-500",
                    activeScrolled && !navShapeExpanded ? "w-3.5 h-3.5" : "w-4.5 h-4.5",
                    open ? "rotate-45" : "rotate-0"
                  )}
                />
              </button>
            </motion.div>
          </div>

          {/* EXPANDED NAV PANEL */}
          <AnimatePresence initial={false}>
            {menuContentVisible && (
              <motion.div
                id="site-nav-panel"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={prefersReducedMotion ? { duration: 0.12 } : { duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
                className="overflow-hidden"
              >
                <div className="px-6 md:px-8 pb-6 pt-2">
                  <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.2fr] gap-8 md:gap-12">
                    {/* LEFT SIDE LINKS */}
                    <div className="flex flex-col">
                      <ul className="flex flex-col">
                        {[{ href: "/", label: "Home" }, ...NAV_LINKS].map(
                          (link, i) => (
                            <motion.li
                              key={link.href}
                              initial={{ opacity: 0, x: -12 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.08 + i * 0.05 }}
                              className="border-b border-white/5 last:border-0"
                            >
                              <Link
                                href={link.href}
                                onClick={() => setOpen(false)}
                                className="focus-ring group flex items-center justify-between py-4 md:py-[18px]"
                              >
                                <span className="text-[20px] md:text-[28px] lg:text-[34px] font-medium text-foreground tracking-tight group-hover:text-muted-foreground transition-colors">
                                  {link.label}
                                </span>
                                <span className="text-[12px] text-muted-foreground font-mono tracking-widest">
                                  (0{i})
                                </span>
                              </Link>
                            </motion.li>
                          )
                        )}
                      </ul>
                    </div>

                    {/* RIGHT SIDE IMAGE PANEL */}
                    <motion.div
                      initial={{ opacity: 0, scale: 0.98 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.2, duration: 0.45 }}
                      className="relative rounded-[20px] overflow-hidden sm:min-h-[220px] lg:min-h-[100%] flex flex-col justify-between p-5 border border-border bg-secondary"
                      style={{
                        backgroundImage:
                          `url("${cloudinaryPresetUrl("https://framerusercontent.com/images/8JG9l1vs1T358YK5DGjMZHom0A.jpeg?width=840&height=1200", 'card', { w: 840, h: 1200 })}")`,
                        backgroundSize: "cover",
                        backgroundPosition: "center",
                      }}
                    >
                      {/* overlay */}
                      <div className="absolute inset-0 bg-black/30" />

                      {/* top text */}
                      <div className="relative z-10 w-full flex justify-center pt-2">
                        <span className="font-semibold text-[17px] tracking-tight text-white drop-shadow-md">
                          PhotoGen® Studio
                        </span>
                      </div>

                      {/* bottom text */}
                      <div className="relative z-10 w-full flex justify-center pb-2">
                        <span className="text-[13px] font-medium text-white/90 drop-shadow-md">
                          Cinematic edits / Presets / Visual identity
                        </span>
                      </div>
                    </motion.div>
                  </div>

                  {/* FOOTER */}
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.35 }}
                    className="flex flex-col md:flex-row justify-between items-start md:items-end mt-8 text-[13px] gap-6 md:gap-0"
                  >
                    <div className="flex flex-col gap-1 text-foreground font-medium tracking-tight">
                      <a
                        href="mailto:hello@photogen.studio"
                        className="focus-ring hover:text-muted-foreground transition-colors"
                      >
                        hello@photogen.studio
                      </a>
                      <a
                        href="tel:1234567890"
                        className="focus-ring hover:text-muted-foreground transition-colors"
                      >
                        (123) 456-7890
                      </a>
                    </div>

                    <div className="flex flex-col items-start md:items-end gap-2.5">
                      <div className="flex gap-4 md:gap-5 font-medium text-foreground tracking-tight">
                        <a href="#" className="focus-ring hover:text-muted-foreground transition-colors">
                          Instagram
                        </a>
                        <a href="#" className="focus-ring hover:text-muted-foreground transition-colors">
                          Twitter/X
                        </a>
                        <a href="#" className="focus-ring hover:text-muted-foreground transition-colors">
                          Behance
                        </a>
                      </div>
                      <div className="text-muted-foreground text-[13px] tracking-tight">
                        Trusted by <span className="text-foreground">100+</span> creators
                      </div>
                    </div>
                  </motion.div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </header>
    </LayoutGroup>
  );
}