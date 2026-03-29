import { Skeleton } from "@/components/ui/Skeleton";

export default function Loading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      {/* Hero Skeleton */}
      <section className="relative h-[80vh] w-full bg-muted/20 animate-pulse overflow-hidden">
        <div className="absolute inset-0 flex flex-col items-center justify-center p-6 space-y-6">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-16 w-[min(800px,90%)]" />
          <div className="flex gap-4">
            <Skeleton className="h-12 w-32 rounded-full" />
            <Skeleton className="h-12 w-32 rounded-full" />
          </div>
        </div>
      </section>

      {/* Sections Skeleton */}
      <section className="mx-auto max-w-7xl px-6 py-24 space-y-12">
        <div className="flex justify-between items-end">
          <div className="space-y-4">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-10 w-24 rounded-full" />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="aspect-[3/4] rounded-2xl bg-muted/20 border border-border/50 animate-pulse" />
          ))}
        </div>
      </section>
    </main>
  );
}
