import React from 'react';
import { ArrowUpRight } from 'lucide-react';
import Link from 'next/link';
import { cn } from '@/lib/utils';

interface LiquidRiseCTAProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  href?: string;
  children?: React.ReactNode;
  icon?: React.ReactNode;
}

export default function LiquidRiseCTA({ href, className, children, icon, ...props }: LiquidRiseCTAProps) {
  const content = (
    <>
      {/* Liquid Fill - Only triggers on group-hover/cta */}
      <div className="absolute inset-0 bg-foreground translate-y-[100%] rounded-t-[100%] group-hover/cta:translate-y-0 group-hover/cta:rounded-t-none transition-all duration-500 ease-[cubic-bezier(0.76,0,0.24,1)]" />
      
      <div className="relative z-10 flex items-center justify-center gap-2 transition-colors duration-300 w-full h-full px-6 group-hover/cta:text-background text-sm font-medium tracking-wide uppercase">
        <span>{children || 'Get in touch'}</span>
        {icon ? (
            <div className="group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5 transition-transform duration-300 shrink-0">
                {icon}
            </div>
        ) : (
            <ArrowUpRight className="w-4 h-4 group-hover/cta:translate-x-0.5 group-hover/cta:-translate-y-0.5 transition-transform duration-300 shrink-0" />
        )}
      </div>
    </>
  );

  const baseClass = cn(
    'group/cta focus-ring relative overflow-hidden rounded-full border border-border bg-background w-48 h-14 flex transition-colors text-foreground',
    className
  );

  if (href) {
    return (
      <Link href={href} className={baseClass}>
        {content}
      </Link>
    );
  }

  return (
    <button className={baseClass} {...props}>
      {content}
    </button>
  );
}
