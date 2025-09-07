import Hero from "../components/Hero";
import { PageContainer, FullBleed, Section } from "../components/layout/Primitives";
import FeatureCards from "../components/FeatureCards";
// GallerySection moved to its own page at /gallery

export default function Home() {
  return (
    <PageContainer>
      <FullBleed className="-mt-4">{/* cancel page padding so hero is full-bleed and lift behind nav */}
        <Hero />
      </FullBleed>

  {/* Flowing menu removed per request */}

      <main className="flex flex-col gap-[32px] items-center sm:items-start">
        <FeatureCards />
        <Section>
          {/* Primary page content (no inline gallery) */}
        </Section>
        {/* PhotoGen Ai Studio lives at /studio */}
      </main>

      <footer className="mt-12 border-t border-white/6">
        <Section className="py-6 flex items-center justify-between text-sm text-zinc-400">
          <span>© {new Date().getFullYear()} PhotoGen. All rights reserved.</span>
          <div className="flex gap-6">
            <a href="/privacy" className="hover:underline hover:underline-offset-2">Privacy</a>
            <a href="/terms" className="hover:underline hover:underline-offset-2">Terms</a>
            <a href="/contact" className="hover:underline hover:underline-offset-2">Contact</a>
          </div>
        </Section>
      </footer>
    </PageContainer>
  );
}
