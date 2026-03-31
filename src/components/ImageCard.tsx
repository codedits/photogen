import Image from 'next/image';

export interface ImageCardProps {
  src: string;
  alt: string;
  caption?: string;
  width?: number;
  height?: number;
  priority?: boolean;
  onError?: () => void;
}

export default function ImageCard({
  src,
  alt,
  caption,
  width = 1000,
  height = 600,
  priority = false,
  onError,
}: ImageCardProps) {
  return (
    <figure className="my-8 space-y-3">
      <div className="rounded-xl border border-border bg-card/50 overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        <div className="relative aspect-video w-full bg-muted">
          <Image
            src={src}
            alt={alt}
            width={width}
            height={height}
            priority={priority}
            className="w-full h-full object-cover"
            onError={onError}
            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 92vw, 960px"
          />
        </div>
      </div>
      {caption && (
        <figcaption className="text-center text-sm text-muted-foreground italic px-2">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
