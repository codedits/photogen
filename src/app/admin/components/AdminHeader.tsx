import React from 'react';
import { Menu, ChevronRight } from 'lucide-react';

interface BreadcrumbItem {
  label: string;
  onClick?: () => void;
}

interface AdminHeaderProps {
  title: string;
  onMenuClick: () => void;
  breadcrumb?: BreadcrumbItem[];
}

export default function AdminHeader({ title, onMenuClick, breadcrumb }: AdminHeaderProps) {
  return (
    <header className="h-16 flex items-center justify-between px-4 md:px-6 border-b border-white/[0.06] bg-zinc-950/80 backdrop-blur-xl sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
        >
          <Menu size={20} />
        </button>
        
        {/* Desktop Title with Breadcrumb */}
        <div className="hidden md:flex items-center gap-2 min-w-0">
          {breadcrumb ? (
            <nav className="flex items-center gap-1.5 text-sm">
              {breadcrumb.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight size={14} className="text-zinc-600" />}
                  {item.onClick ? (
                    <button 
                      onClick={item.onClick}
                      className="text-zinc-400 hover:text-white transition-colors"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span className="text-white font-medium">{item.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          ) : (
            <h1 className="text-lg font-semibold text-white capitalize">{title}</h1>
          )}
        </div>
        
        {/* Mobile Title */}
        <h1 className="md:hidden text-base font-semibold text-white capitalize truncate">{title}</h1>
      </div>
      
      {/* Right Side - could add notifications, search, etc. */}
      <div className="flex items-center gap-2">
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white/5 border border-white/[0.06]">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs text-zinc-400">System Online</span>
        </div>
      </div>
    </header>
  );
}
