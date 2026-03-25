import PresetCard, { Preset } from "./PresetCard";
import Link from "next/link";

interface PresetsSectionProps {
  presets: Preset[];
}

export default function PresetsSection({ presets }: PresetsSectionProps) {
  return (
    <section className="py-24 bg-background border-t border-border">
      <div className="max-w-7xl mx-auto px-6 sm:px-10 lg:px-16">
        <div className="flex justify-between items-end mb-12">
          <div>
            <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground mb-3 flex items-center gap-2">
              <span className="w-4 h-px bg-foreground/20" />
              Collection
            </p>
            <h2 className="text-2xl font-normal tracking-tight text-foreground">Featured Presets</h2>
          </div>
          <Link 
            href="/presets" 
            className="text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors duration-300"
          >
            View All →
          </Link>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {presets.map((preset, index) => (
            <Link key={preset.id} href={`/presets/${preset.id}`} className="group inline-block rounded-sm overflow-hidden">
              <PresetCard preset={preset} priority={index === 0} />
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
