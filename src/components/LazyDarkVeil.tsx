"use client";
import dynamic from "next/dynamic";
import React from "react";

type DarkVeilProps = {
  hueShift?: number;
  noiseIntensity?: number;
  scanlineIntensity?: number;
  speed?: number;
  scanlineFrequency?: number;
  warpAmount?: number;
  resolutionScale?: number;
};

const DarkVeil = dynamic(() => import("./DarkVeil"), {
  ssr: false,
  loading: () => null,
});

export default function LazyDarkVeil(props: DarkVeilProps) {
  return <DarkVeil {...props} />;
}
