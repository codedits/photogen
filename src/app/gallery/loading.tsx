import { Skeleton, GallerySkeleton } from "@/components/ui/Skeleton";

export default function GalleryLoading() {
  return (
    <main className="min-h-screen bg-background text-foreground">
      <section className="mx-auto max-w-7xl px-6 pt-32 pb-16">
        <Skeleton className="h-4 w-24 mb-4" />
        <Skeleton className="h-14 w-[min(600px,90%)] mb-6" />
        <Skeleton className="h-6 w-[min(400px,85%)] mb-12" />
        
        <div className="flex flex-wrap gap-2 mb-12">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-24 rounded-full" />
          ))}
        </div>
        
        <GallerySkeleton />
      </section>
    </main>
  );
}
