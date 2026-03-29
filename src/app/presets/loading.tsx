import { Skeleton, GallerySkeleton } from "@/components/ui/Skeleton";

export default function PresetsLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-7xl px-6 pt-32 pb-16">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-14 w-[min(600px,90%)] mb-6" />
        <Skeleton className="h-6 w-[min(400px,85%)] mb-12" />
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-8 mt-12">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="rounded-2xl border border-border bg-card overflow-hidden">
              <Skeleton className="aspect-video w-full rounded-none" />
              <div className="p-6 space-y-4">
                <div className="flex justify-between items-start">
                  <Skeleton className="h-7 w-1/3" />
                  <Skeleton className="h-5 w-16" />
                </div>
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-2/3" />
                <div className="flex gap-2 pt-2">
                  <Skeleton className="h-6 w-16 rounded-full" />
                  <Skeleton className="h-6 w-16 rounded-full" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}
