"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import Image from 'next/image';
import { Home, Image as ImageIcon, Wand2 } from "lucide-react";

export default function Nav() {
  return (
    <motion.header
      initial={{ y: -8, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.45, ease: 'easeOut' }}
      className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none"
    >
      <motion.nav
        initial={{ scale: 0.995 }}
        animate={{ scale: 1 }}
        transition={{ duration: 0.35 }}
        className="relative pointer-events-auto w-full max-w-[880px] rounded-full px-4 sm:px-8 py-3 h-14 flex items-center justify-between bg-black/40 text-white backdrop-blur-sm border border-white/10 shadow-lg"
      >
        {/* Brand (left) */}
        <Link href="/" className="flex items-center gap-3 leading-none">
            <motion.div
            initial={{ scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="flex items-center gap-2"
          >
            <Image src="/gen.svg" alt="PhotoGen logo" width={24} height={24} className="sm:w-6 sm:h-6 w-5 h-5" />
            <span className="font-semibold text-white text-glow" style={{ fontSize: "clamp(0.95rem, 1.3vw, 1.15rem)" }}>PhotoGen</span>
          </motion.div>
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

  <Link href="/presets" className="flex items-center">
            <motion.div
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
        className="flex items-center gap-3 sm:gap-4 h-8 px-3 sm:px-4 rounded-full hover:bg-white/10 transition-colors text-white"
            >
              <ImageIcon size={16} />
      <span className="hidden sm:inline font-medium">Presets</span>
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
      </motion.nav>
    </motion.header>
  );
}
