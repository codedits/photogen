import Hero from "../components/Hero";

export default function Home() {
  return (
  <div className="font-sans min-h-screen px-6 pb-0 sm:px-8">
      <div className="-mx-6 sm:-mx-8 -mt-4">{/* cancel page padding so hero is full-bleed and lift behind nav */}
        <Hero />
      </div>

      <main className="flex flex-col gap-[32px] items-center sm:items-start">
        <div className="w-[1100px] max-w-full mx-auto px-4">
          {/* About section removed per request */}
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
