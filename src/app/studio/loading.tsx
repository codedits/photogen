export default function StudioLoading() {
  return (
    <main className="min-h-screen w-full bg-background text-foreground px-6 md:px-10 pt-28 pb-20">
      <div className="max-w-6xl mx-auto">
        <div className="mb-10">
          <div className="h-3 w-28 bg-card/60 border border-border animate-pulse" />
          <div className="mt-4 h-12 w-72 max-w-full bg-card/60 border border-border animate-pulse" />
        </div>

        <div className="relative overflow-hidden border border-border bg-card/40 rounded-2xl p-5 md:p-8 min-h-[62vh]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="h-10 w-full bg-background/60 border border-border animate-pulse" />
              <div className="h-10 w-3/4 bg-background/60 border border-border animate-pulse" />
              <div className="h-32 w-full bg-background/60 border border-border animate-pulse" />
            </div>
            <div className="h-[360px] w-full bg-background/60 border border-border animate-pulse" />
          </div>

          <div className="mt-7 text-[10px] uppercase tracking-[0.35em] text-muted-foreground">
            Preparing studio tools
          </div>
        </div>
      </div>
    </main>
  );
}
