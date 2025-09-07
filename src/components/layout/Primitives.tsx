"use client";

import { cn } from "../../lib/utils";
import React from "react";

// PageContainer: global page padding and min-height shell
export function PageContainer({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <div className={cn("font-sans min-h-screen px-6 pb-0 sm:px-8", className)}>
      {children}
    </div>
  );
}

// FullBleed: cancel horizontal padding to allow full-bleed sections
export function FullBleed({ className, children }: { className?: string; children?: React.ReactNode }) {
  return <div className={cn("-mx-6 sm:-mx-8", className)}>{children}</div>;
}

// Section: standard content width and horizontal padding
export function Section({ className, children }: { className?: string; children?: React.ReactNode }) {
  return (
    <section className={cn("w-[1100px] max-w-full mx-auto px-4", className)}>
      {children}
    </section>
  );
}
