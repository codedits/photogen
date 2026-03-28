"use client";

import { useEffect } from "react";
import { AlertCircle } from "lucide-react";

export default function StudioError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Studio route error:", error);
  }, [error]);

  return (
    <main className="min-h-screen w-full bg-background text-foreground px-6 md:px-10 pt-28 pb-20">
      <div className="max-w-3xl mx-auto border border-border bg-card/40 p-8 md:p-12 rounded-2xl text-center">
        <AlertCircle className="w-10 h-10 mx-auto mb-4 text-destructive/80" />
        <h1 className="text-xl md:text-2xl tracking-tight mb-2">Studio is temporarily unavailable</h1>
        <p className="text-sm text-muted-foreground mb-6">
          The generation workspace failed to load. Please retry and we will restore your session.
        </p>
        <button
          onClick={reset}
          className="focus-ring px-6 py-3 border border-border rounded-full text-[11px] uppercase tracking-[0.2em] hover:bg-foreground hover:text-background transition-colors"
        >
          Retry Studio
        </button>
      </div>
    </main>
  );
}
