import PresetCard, { Preset } from "./PresetCard";
import Link from "next/link";

interface PresetsSectionProps {
  presets: Preset[];
}

export default function PresetsSection({ presets }: PresetsSectionProps) {
  return (
    <section className="py-24 bg-black">
      <div className="container mx-auto px-6">
        <div className="flex justify-between items-end mb-12">
          <div>
            <h2 className="text-3xl font-light tracking-tight text-white mb-2 font-sans">Featured Presets</h2>
            <p className="text-white/40 text-sm uppercase tracking-widest">Professional Lightroom Collections</p>
          </div>
          <Link 
            href="/presets" 
            className="text-white/60 hover:text-white text-sm uppercase tracking-widest transition-colors border-b border-white/10 pb-1"
          >
            View All
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
          {presets.map((preset, index) => (
            <Link key={preset.id} href={`/presets/${preset.id}`} className="group inline-block rounded-2xl">
              <PresetCard preset={preset} priority={index === 0} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
