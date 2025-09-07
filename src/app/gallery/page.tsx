import { PageContainer, Section } from "../../components/layout/Primitives";
import GallerySection from "../../components/GallerySection";

export default function GalleryPage() {
  return (
    <PageContainer>
      <Section className="py-8">
        <GallerySection />
      </Section>
    </PageContainer>
  );
}
