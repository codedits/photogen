import ImageGenerator from "../../components/ImageGenerator";
import DarkVeil from "../../components/DarkVeil";
import Hero from "@/components/Hero";

export const metadata = {
  title: "PhotoGen AI Studio",
  description: "Generate images from text prompts.",
};

export default function StudioPage() {
  const resolutionScale = typeof window !== 'undefined' ? Math.min(1, window.devicePixelRatio || 1) : 1;
  return (
    <div className="relative min-h-screen font-sans">
      <div className="absolute inset-0 -z-10">
        
        <div className="absolute inset-0 bg-black/40" />
      </div>

      {/* Left-aligned content within a centered max-width container */}
      <main className="min-h-screen px-6 sm:px-8 pt-24 pb-16 max-w-7xl mx-auto flex items-start justify-start">
        <ImageGenerator />
      </main>
    </div>
  );
}
