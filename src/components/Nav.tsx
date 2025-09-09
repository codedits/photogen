import Link from "next/link";
import Image from 'next/image';
import { Home, Image as ImageIcon, Wand2 } from "lucide-react";

export default function Nav() {
  return (
    <header className="fixed top-4 left-4 right-4 z-50 flex justify-center pointer-events-none">
      <nav className="relative pointer-events-auto w-full max-w-[880px] rounded-full px-4 sm:px-8 py-3 h-14 flex items-center justify-between bg-black/40 text-white backdrop-blur-sm border border-white/10 shadow-lg will-change-transform transition-transform">
        {/* Brand (left) */}
        <Link href="/" className="flex items-center gap-3 leading-none">
          <div className="flex items-center gap-2">
            <Image src="/gen.svg" alt="PhotoGen logo" width={24} height={24} className="sm:w-6 sm:h-6 w-5 h-5" />
            <span className="font-semibold text-white text-glow" style={{ fontSize: "clamp(0.95rem, 1.3vw, 1.15rem)" }}>PhotoGen</span>
          </div>
        </Link>

        {/* Actions (right) */}
  <div className="flex items-center gap-1 sm:gap-3 justify-end leading-none">
          {/* mobile menu removed */}

      <Link href="/" className="flex items-center">
            <div className="flex items-center gap-3 sm:gap-4 h-8 px-3 sm:px-4 rounded-full hover:bg-white/10 transition-transform duration-150 ease-out hover:scale-[1.02] active:scale-95 text-white">
              <Home size={16} />
              <span className="hidden sm:inline font-medium">Home</span>
            </div>
          </Link>

  <Link href="/presets" className="flex items-center">
            <div className="flex items-center gap-3 sm:gap-4 h-8 px-3 sm:px-4 rounded-full hover:bg-white/10 transition-transform duration-150 ease-out hover:scale-[1.02] active:scale-95 text-white">
              <ImageIcon size={16} />
      <span className="hidden sm:inline font-medium">Presets</span>
            </div>
          </Link>

          

  <Link href="/studio" className="flex items-center">
    <div className="flex items-center gap-3 sm:gap-4 h-8 px-3 sm:px-4 rounded-full hover:bg-white/10 transition-transform duration-150 ease-out hover:scale-[1.02] active:scale-95 text-white">
              <Wand2 size={16} />
              <span className="hidden sm:inline font-medium">Studio</span>
    </div>
          </Link>
        </div>
  </nav>
    </header>
  );
}
