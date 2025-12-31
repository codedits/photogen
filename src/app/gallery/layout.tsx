import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Gallery | PhotoGen',
  description: 'A curated collection of visual stories capturing moments, emotions, and the beauty of our world.',
};

export default function GalleryLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
