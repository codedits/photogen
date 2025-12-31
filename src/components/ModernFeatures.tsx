"use client";

import { Wand2, Zap, Layers, Download } from "lucide-react";

const features = [
  {
    icon: Wand2,
    title: "AI Enhancement",
    description: "Automatically improve lighting, color, and detail with one click."
  },
  {
    icon: Zap,
    title: "Lightning Fast",
    description: "Process high-resolution images in seconds, not minutes."
  },
  {
    icon: Layers,
    title: "Batch Processing",
    description: "Edit multiple photos at once to maintain a consistent look."
  },
  {
    icon: Download,
    title: "Easy Export",
    description: "Download your masterpieces in various formats and qualities."
  }
];

export default function ModernFeatures() {
  return (
    <section className="py-24 bg-zinc-900">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="p-6 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-colors">
              <feature.icon className="w-10 h-10 text-purple-400 mb-4" />
              <h3 className="text-xl font-bold text-white mb-2 font-sans">{feature.title}</h3>
              <p className="text-gray-400 text-sm leading-relaxed">
                {feature.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
