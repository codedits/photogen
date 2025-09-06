"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";
import { Home, Search, Image as ImageIcon, Wand2 } from "lucide-react";

export default function Nav() {
  return (
    <header className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
  <nav className="relative pointer-events-auto w-full max-w-[880px] rounded-full px-4 sm:px-8 py-3 h-14 flex items-center justify-between bg-black/40 text-white backdrop-blur-sm border border-white/10 shadow-lg">
        {/* Brand (left) */}
        <Link href="/" className="flex items-center gap-3 leading-none">
          <Image src="/gen.svg" alt="PhotoGen logo" width={28} height={28} priority className="sm:w-8 sm:h-8 w-7 h-7" />
          <span className="font-semibold text-white text-glow">PhotoGen</span>
        </Link>

        {/* Actions (right) */}
        <div className="flex items-center gap-1 sm:gap-3 justify-end leading-none">
          {/* mobile menu removed */}

      <Link href="/" className="flex items-center">
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
        className="flex items-center gap-3 sm:gap-4 h-8 px-3 sm:px-4 rounded-full hover:bg-white/10 transition-colors text-white"
            >
              <Home size={16} />
              <span className="hidden sm:inline font-medium">Home</span>
            </motion.div>
          </Link>

      <Link href="/gallery" className="flex items-center">
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
        className="flex items-center gap-3 sm:gap-4 h-8 px-3 sm:px-4 rounded-full hover:bg-white/10 transition-colors text-white"
            >
              <ImageIcon size={16} />
              <span className="hidden sm:inline font-medium">Gallery</span>
            </motion.div>
          </Link>

      <Link href="/search" className="flex items-center">
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
        className="flex items-center gap-3 sm:gap-4 h-8 px-3 sm:px-4 rounded-full hover:bg-white/10 transition-colors text-white"
            >
              <Search size={16} />
              <span className="hidden sm:inline font-medium">Search</span>
            </motion.div>
          </Link>

      <Link href="/studio" className="flex items-center">
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
        className="flex items-center gap-3 sm:gap-4 h-8 px-3 sm:px-4 rounded-full hover:bg-white/10 transition-colors text-white"
            >
              <Wand2 size={16} />
              <span className="hidden sm:inline font-medium">Studio</span>
            </motion.div>
          </Link>
        </div>
      </nav>
    </header>
  );
}
