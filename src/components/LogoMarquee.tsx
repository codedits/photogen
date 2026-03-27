"use client";

import React from "react";
import Image from "next/image";

const LOGOS = [
  { name: "Fujifilm", src: "/logo marquee/Fujifilm_logo.svg" },
  { name: "Adobe Lightroom", src: "/logo marquee/adobe-lightroom-svgrepo-com.svg" },
  { name: "Canon", src: "/logo marquee/canon-icon.svg" },
  { name: "Forbes", src: "/logo marquee/forbes-ar21.svg" },
  { name: "Hasselblad", src: "/logo marquee/hasselblad-2.svg" },
  { name: "Olympus", src: "/logo marquee/olympus-2.svg" },
  { name: "Picsart", src: "/logo marquee/picsart-svgrepo-com.svg" },
  { name: "Sony", src: "/logo marquee/sony-2.svg" },
];

interface LogoMarqueeProps {
  variant?: "default" | "sidebar";
}

export default function LogoMarquee({ variant = "default" }: LogoMarqueeProps) {
  // Triple the logos to ensure a seamless loop
  const displayLogos = [...LOGOS, ...LOGOS, ...LOGOS];

  const isSidebar = variant === "sidebar";

  return (
    <section className={`${isSidebar ? "py-4" : "py-12 bg-background"} overflow-hidden relative group`}>
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes marquee {
          from { transform: translateX(0); }
          to { transform: translateX(-50%); }
        }
        .animate-marquee {
          display: flex;
          animation: marquee ${isSidebar ? '25s' : '40s'} linear infinite;
        }
      `}} />
      {/* Container with relative z-index for gradients */}
      <div className="relative w-full overflow-hidden">
        
        {/* Left Gradient Fade */}
        <div className={`absolute left-0 top-0 bottom-0 ${isSidebar ? 'w-6' : 'w-12 md:w-20'} z-10 bg-gradient-to-r from-background via-background/40 to-transparent pointer-events-none`} />
        
        {/* Right Gradient Fade */}
        <div className={`absolute right-0 top-0 bottom-0 ${isSidebar ? 'w-6' : 'w-12 md:w-20'} z-10 bg-gradient-to-l from-background via-background/40 to-transparent pointer-events-none`} />

        {/* Marquee Track */}
        <div className={`flex w-fit animate-marquee items-center ${isSidebar ? 'gap-12' : 'gap-16 md:gap-24'}`}>
          {displayLogos.map((logo, index) => (
            <div 
              key={`${logo.name}-${index}`} 
              className="flex-shrink-0 grayscale brightness-0 dark:invert opacity-100"
            >
              <Image
                src={logo.src}
                alt={logo.name}
                width={isSidebar ? 80 : 120}
                height={isSidebar ? 30 : 40}
                className={`${isSidebar ? 'h-5' : 'h-8 md:h-10'} w-auto object-contain`}
              />
            </div>
          ))}
        </div>
      </div>
      
      {/* Decorative subtitle / context - Hidden in sidebar */}
      {!isSidebar && (
        <div className="mt-8 text-center">
          <p className="text-[9px] uppercase tracking-[0.4em] text-muted-foreground/50">
            Industry Partners & Gear Standards
          </p>
        </div>
      )}
    </section>
  );
}
