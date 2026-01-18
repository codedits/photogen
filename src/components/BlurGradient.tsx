import React from "react";

type Direction = "toBottom" | "toTop" | "toLeft" | "toRight";

interface BlurGradientProps {
  blur?: number;
  borderRadius?: number;
  direction?: Direction;
  hideOnMobile?: boolean;
}

function dirToCss(d: Direction) {
  switch (d) {
    case "toTop":
      return "to top";
    case "toLeft":
      return "to left";
    case "toRight":
      return "to right";
    case "toBottom":
    default:
      return "to bottom";
  }
}

export default function BlurGradient({ blur = 10, borderRadius = 0, direction = "toBottom", hideOnMobile = false }: BlurGradientProps) {
  // Layers with progressively smaller blur radii and stepped gradient masks
  const layers = [
    { blur: `${blur / 128}px`, gradient: "rgba(0, 0, 0, 0) 0%, rgba(0, 0, 0, 1) 12.5%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 0) 37.5%" },
    { blur: `${blur / 64}px`, gradient: "rgba(0, 0, 0, 0) 12.5%, rgba(0, 0, 0, 1) 25%, rgba(0, 0, 0, 1) 37.5%, rgba(0, 0, 0, 0) 50%" },
    { blur: `${blur / 32}px`, gradient: "rgba(0, 0, 0, 0) 25%, rgba(0, 0, 0, 1) 37.5%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 0) 62.5%" },
    { blur: `${blur / 16}px`, gradient: "rgba(0, 0, 0, 0) 37.5%, rgba(0, 0, 0, 1) 50%, rgba(0, 0, 0, 1) 62.5%, rgba(0, 0, 0, 0) 75%" },
    { blur: `${blur / 8}px`, gradient: "rgba(0, 0, 0, 0) 50%, rgba(0, 0, 0, 1) 62.5%, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 0) 87.5%" },
    { blur: `${blur / 4}px`, gradient: "rgba(0, 0, 0, 0) 62.5%, rgba(0, 0, 0, 1) 75%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 0) 100%" },
    { blur: `${blur / 2}px`, gradient: "rgba(0, 0, 0, 0) 75%, rgba(0, 0, 0, 1) 87.5%, rgba(0, 0, 0, 1) 100%" },
    { blur: `${blur}px`, gradient: "rgba(0, 0, 0, 0) 87.5%, rgba(0, 0, 0, 1) 100%" },
  ];

  const dirCss = dirToCss(direction);

  return (
    <div style={{ position: "relative", width: "100%", height: "100%", borderRadius: `${borderRadius}px` }} className={hideOnMobile ? "hidden md:block" : ""}>
      {layers.map((layer, idx) => (
        <div
          key={idx}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: idx + 1,
            backdropFilter: `blur(${layer.blur})`,
            WebkitBackdropFilter: `blur(${layer.blur})`,
            maskImage: `linear-gradient(${dirCss}, ${layer.gradient})`,
            WebkitMaskImage: `linear-gradient(${dirCss}, ${layer.gradient})`,
            borderRadius: `${borderRadius}px`,
            pointerEvents: "none",
          }}
        />
      ))}
    </div>
  );
}

export const __FramerMetadata__ = { title: "BlurGradient" };