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

  {/* footer removed from homepage - global Footer component in layout.tsx is used instead */}
    </PageContainer>
  );
}
