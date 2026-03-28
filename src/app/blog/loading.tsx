export default function BlogLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-7xl px-6 pt-24 pb-12 md:pt-32 md:pb-16">
        <div className="h-3 w-20 bg-card/60 border border-border animate-pulse" />
        <div className="mt-5 h-12 w-[min(720px,90%)] bg-card/60 border border-border animate-pulse" />
        <div className="mt-4 h-5 w-[min(560px,88%)] bg-card/60 border border-border animate-pulse" />
      </section>

      <section className="mx-auto max-w-7xl px-6 pb-24">
        <div className="space-y-8">
          <div className="relative rounded-2xl overflow-hidden min-h-[400px] md:min-h-[500px] bg-card border border-border animate-pulse" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
                <div className="aspect-[16/10] bg-background/60 animate-pulse" />
                <div className="p-5 space-y-3">
                  <div className="h-5 w-4/5 bg-background/60 animate-pulse" />
                  <div className="h-4 w-full bg-background/60 animate-pulse" />
                  <div className="h-4 w-2/3 bg-background/60 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
