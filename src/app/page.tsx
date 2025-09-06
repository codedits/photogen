import Image from "next/image";
import Hero from "../components/Hero";

export default function Home() {
  return (
  <div className="font-sans min-h-screen px-6 pb-0 sm:px-8">
      <div className="-mx-6 sm:-mx-8 -mt-4">{/* cancel page padding so hero is full-bleed and lift behind nav */}
        <Hero />
      </div>

      <main className="flex flex-col gap-[32px] items-center sm:items-start">
        <div className="w-[1100px] max-w-full mx-auto px-4">
          {/* About section placed just below the hero */}
          <section id="about" className="py-16 text-center sm:text-left">
            <h2 className="font-semibold text-white text-glow mb-4"
                style={{ fontSize: "clamp(1.875rem, 4vw, 2.25rem)" }}>
              About
            </h2>
            <p className="text-zinc-300 max-w-3xl mx-auto sm:mx-0"
               style={{ fontSize: "clamp(1rem, 2.2vw, 1.125rem)" }}>
              PhotoGen is a creative playground for generating, editing, and exploring images with
              modern web tools. We combine shader-backed visuals with a lightweight UI to give you
              a fast, expressive experience for image creation and discovery.
            </p>
          </section>
        </div>

  {/* PhotoGen Ai Studio lives at /studio */}
      </main>

  <footer className="mt-12 border-t border-white/6">
    <div className="w-[1100px] max-w-full mx-auto px-4 py-6 flex items-center justify-between text-sm text-zinc-400">
      <span>© {new Date().getFullYear()} PhotoGen. All rights reserved.</span>
      <div className="flex gap-6">
        <a href="/privacy" className="hover:underline hover:underline-offset-2">Privacy</a>
        <a href="/terms" className="hover:underline hover:underline-offset-2">Terms</a>
        <a href="/contact" className="hover:underline hover:underline-offset-2">Contact</a>
      </div>
    </div>
  </footer>
    </div>
  );
}
