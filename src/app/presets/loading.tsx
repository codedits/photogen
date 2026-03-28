export default function PresetsLoading() {
  return (
    <main className="min-h-screen w-full text-foreground bg-background relative">
      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 pt-32 pb-24">
        <header className="mb-16 pb-8 border-b border-border">
          <div className="h-3 w-16 bg-card/60 border border-border animate-pulse" />
          <div className="mt-6 h-10 w-56 bg-card/60 border border-border animate-pulse" />
          <div className="mt-4 h-4 w-72 bg-card/60 border border-border animate-pulse" />
        </header>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 9 }).map((_, i) => (
            <div key={i} className="border border-border bg-card/40 rounded-xl overflow-hidden">
              <div className="aspect-[4/5] bg-background/60 animate-pulse" />
              <div className="p-4 space-y-3">
                <div className="h-4 w-2/3 bg-background/60 animate-pulse" />
                <div className="h-3 w-full bg-background/60 animate-pulse" />
                <div className="h-3 w-3/4 bg-background/60 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
