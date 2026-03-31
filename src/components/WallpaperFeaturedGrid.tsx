"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import ImageWithLqip from "./ImageWithLqip";
import { cn } from "../lib/utils";

interface WallpaperItem {
  _id: string;
  name: string;
  category: string;
  images: Array<{ url: string; public_id: string }>;
  uploadDate?: string | Date;
}

interface WallpaperFeaturedGridProps {
  items: WallpaperItem[];
  titleTop?: React.ReactNode;
  titleBottom?: React.ReactNode;
  description?: React.ReactNode;
  viewAllLink?: string;
  viewAllText?: string;
}

const WallpaperCard = ({ item, index }: { item: WallpaperItem; index: number }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true }}
      transition={{ duration: 1, delay: index * 0.1 }}
      className="relative w-full h-[50vh] lg:h-[100vh] group overflow-hidden bg-neutral-900"
    >
      <Link href={`/wallpapers/${item._id}`} className="block w-full h-full">
        <motion.article
          initial="rest"
          whileHover="hover"
          animate="rest"
          className="relative w-full h-full overflow-hidden"
        >
          {/* Background Image with Blur */}
          <motion.div
            className="w-full h-full relative"
            variants={{
              rest: { scale: 1, filter: 'blur(0px)' },
              hover: {
                scale: 1.02,
                filter: 'blur(5px)'
              },
            }}
            transition={{ duration: 0.8, ease: [0.33, 1, 0.68, 1] }}
          >
            <ImageWithLqip
              src={item.images[0]?.url}
              alt={item.name}
              fill
              className="object-cover"
              priority={index < 2}
              noBlur={true}
              transformOpts={{ w: 1200, h: 1800, q: "auto:best", g: 'auto:subject' }}
            />
          </motion.div>

          {/* Dark Overlay Fade */}
          <motion.div
            className="absolute inset-0 bg-black/0 group-hover:bg-black/60 transition-colors duration-700 pointer-events-none z-10"
          />

          {/* Centered Content Overlay (GalleryCard Style) - Responsive Sizing */}
          <div className="absolute inset-0 z-20 flex flex-col items-center justify-center p-4 md:p-6 text-center pointer-events-none">
            <motion.div
              variants={{
                rest: { opacity: 0 },
                hover: {
                  opacity: 1,
                  transition: { staggerChildren: 0.05, delayChildren: 0.1 }
                }
              }}
              className="flex flex-col items-center"
            >
              <motion.h3
                variants={{
                  rest: { y: -10, opacity: 0 },
                  hover: { y: 0, opacity: 1 }
                }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-lg md:text-2xl lg:text-3xl font-light text-white uppercase tracking-[-0.06em] mb-1 leading-[0.95]"
              >
                {item.name}
              </motion.h3>

              <motion.p
                variants={{
                  rest: { y: 10, opacity: 0 },
                  hover: { y: 0, opacity: 1 }
                }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                className="text-[8px] md:text-[9px] text-white/40 font-mono uppercase tracking-[0.2em]"
              >
                {item.category}
              </motion.p>

              {/* View/Download prompt - Hidden or smaller on mobile if needed */}
              <motion.div
                variants={{
                  rest: { y: 15, opacity: 0 },
                  hover: { y: 0, opacity: 1 }
                }}
                transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                className="mt-3 md:mt-4 flex items-center gap-2"
              >

              </motion.div>
            </motion.div>
          </div>

          {/* Reference Info Corner */}
          <div className="absolute bottom-6 right-8 z-20 opacity-0 group-hover:opacity-40 transition-opacity duration-700 hidden md:block">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white">
              REF_{item._id.substring(item._id.length - 4).toUpperCase()}
            </span>
          </div>
        </motion.article>
      </Link>
    </motion.div>
  );
};

export default function WallpaperFeaturedGrid({
  items,
  titleTop = "Exclusive",
  titleBottom = "Wallpapers",
  description,
  viewAllLink = "/wallpapers",
  viewAllText = "Explore Wallpapers"
}: WallpaperFeaturedGridProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="relative bg-background w-full flex flex-col overflow-hidden">
      {/* Header Area - Centered Layout */}
      <div className="relative w-full flex flex-col items-center text-center gap-4 px-6 md:px-10 lg:px-16 z-20 bg-background pt-12 pb-10 border-b border-white/5">
        <div className="space-y-4 max-w-3xl flex flex-col items-center">
          <motion.h2
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-3xl md:text-5xl lg:text-6xl font-normal tracking-tighter text-foreground leading-[0.95] uppercase"
          >
            {titleTop} <br />
            <span className="text-muted-foreground">{titleBottom}</span>
          </motion.h2>

          {description && (
            <motion.p
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-base md:text-lg text-muted-foreground font-medium max-w-xl mx-auto"
            >
              {description}
            </motion.p>
          )}
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: 0.2 }}
        >
          <Link
            href={viewAllLink}
            className="group flex flex-row items-center gap-3 text-foreground/40 hover:text-foreground transition-all duration-500"
          >
            <div className="w-8 h-8 rounded-full border border-white/10 flex items-center justify-center group-hover:border-white/20 transition-all duration-500 group-hover:bg-white/5">
              <ArrowRight size={14} />
            </div>
            <span className="text-[10px] uppercase tracking-[0.4em] font-bold">{viewAllText}</span>
          </Link>
        </motion.div>
      </div>

      {/* Grid Container - Each card is 100vh tall */}
      <div className="flex-1 grid grid-cols-2 lg:grid-cols-4 gap-0">
        {items.slice(0, 4).map((item, idx) => (
          <WallpaperCard key={item._id} item={item} index={idx} />
        ))}
      </div>
    </section>
  );
}
