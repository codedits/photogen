"use client";
import dynamic from "next/dynamic";
import React from "react";

const Carousel = dynamic(() => import("./Carousel"), {
  ssr: false,
  loading: () => <div className="w-full h-[280px] rounded-lg bg-slate-800/60 animate-pulse" />,
});

export default Carousel;
