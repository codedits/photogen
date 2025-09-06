import ImageGenerator from "../../components/ImageGenerator";

export const metadata = {
  title: "PhotoGen AI Studio",
  description: "Generate images from text prompts.",
};

export default function StudioPage() {
  return (
    <div className="font-sans min-h-screen px-6 pb-16 sm:px-8 pt-24">
      <ImageGenerator />
    </div>
  );
}
