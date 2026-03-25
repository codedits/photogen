"use client";

import React from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowRight } from "lucide-react";
import GalleryCard from "./GalleryCard";

interface FeaturedItem {
  _id: string;
  name: string;
  description?: string;
  images: Array<{ url: string; public_id: string }>;
  category: string;
  uploadDate?: string | Date;
}

interface FeaturedGalleryProps {
  items: FeaturedItem[];
}

export default function FeaturedGallery({ items }: FeaturedGalleryProps) {
  if (!items || items.length === 0) return null;

  return (
    <section className="py-24 px-0 md:px-0 bg-background overflow-hidden font-sans">
      <div className="max-w-[100vw] mx-auto space-y-16">
        
        {/* Header Area */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-8 px-6 md:px-12">
          <div className="space-y-4 max-w-2xl">
            <motion.h2 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              className="text-4xl md:text-6xl font-normal tracking-tight text-white leading-[1.1]"
            >
              Curated <br />
              <span className="text-zinc-500">Masterpieces</span>
            </motion.h2>
            <motion.p 
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              className="text-lg text-zinc-400 font-medium"
            >
              A selection of our most evocative captures, defined by light, <br className="hidden md:block" />
              shadow, and the soul of the subject.
            </motion.p>
          </div>
          
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
          >
            <Link 
              href="/gallery" 
              className="group flex items-center gap-3 text-white font-normal text-lg hover:text-zinc-400 transition-colors"
            >
              View Full Gallery
              <div className="w-10 h-10 rounded-full border border-white/20 flex items-center justify-center group-hover:border-white transition-all group-hover:translate-x-1">
                <ArrowRight size={18} />
              </div>
            </Link>
          </motion.div>
        </div>

        {/* Responsive 2-Column Grid Layout */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-[2px]">
          {items.slice(0, 4).map((item, idx) => (
            <GalleryCard
              key={item._id}
              item={item}
              index={idx}
              aspectRatio="4/5"
              className="w-full"
              sizes="(max-width: 768px) 100vw, 50vw"
              parallax={true}
            />
          ))}
        </div>

        {/* Bottom Banner Area */}
        <motion.div 
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="pt-12 border-t border-zinc-800/50 flex flex-col md:flex-row gap-8 items-center justify-between"
        >
          <div className="flex gap-12 items-center">
            <div className="space-y-1">
              <div className="text-white text-3xl font-normal">140+</div>
              <div className="text-zinc-500 text-xs font-normal uppercase tracking-wider">Public Captures</div>
            </div>
            <div className="space-y-1">
              <div className="text-white text-3xl font-normal">24</div>
              <div className="text-zinc-500 text-xs font-normal uppercase tracking-wider">Premium Presets</div>
            </div>
          </div>
          
          <p className="text-zinc-600 text-sm max-w-xs text-center md:text-right font-medium">
            Every image tells a unique story, processed with precision using our signature workflow.
          </p>
        </motion.div>

      </div>
    </section>
  );
}
