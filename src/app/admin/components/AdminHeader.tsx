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
  onRevalidate?: () => void;
  revalidating?: boolean;
}

export default function AdminHeader({ 
  title, 
  onMenuClick, 
  breadcrumb, 
  onRevalidate, 
  revalidating 
}: AdminHeaderProps) {
  return (
    <header className="h-14 flex items-center justify-between px-4 md:px-6 border-b border-zinc-800 bg-zinc-950 sticky top-0 z-30">
      <div className="flex items-center gap-3 min-w-0">
        <button 
          onClick={onMenuClick}
          className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-100 rounded-md hover:bg-zinc-900"
        >
          <Menu size={20} />
        </button>
        
        <div className="hidden md:flex items-center gap-2 min-w-0">
          {breadcrumb ? (
            <nav className="flex items-center gap-1.5 text-sm text-zinc-400">
              {breadcrumb.map((item, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <ChevronRight size={14} className="text-zinc-700" />}
                  {item.onClick ? (
                    <button 
                      onClick={item.onClick}
                      className="hover:text-zinc-100"
                    >
                      {item.label}
                    </button>
                  ) : (
                    <span className="text-zinc-100 font-medium">{item.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          ) : (
            <h1 className="text-base font-semibold text-zinc-100 capitalize">{title}</h1>
          )}
        </div>
        
        <h1 className="md:hidden text-base font-semibold text-zinc-100 capitalize truncate">{title}</h1>
      </div>
      
      <div className="flex items-center gap-3">
        <button
          onClick={onRevalidate}
          disabled={revalidating}
          className="flex items-center gap-2 rounded-md border border-zinc-800 bg-zinc-900 px-2.5 py-1 text-xs text-zinc-400 hover:border-zinc-700 hover:text-zinc-200 disabled:opacity-50 transition-colors"
        >
          <div className={`h-1.5 w-1.5 rounded-full ${revalidating ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`} />
          {revalidating ? 'Syncing...' : 'Sync Content'}
        </button>
      </div>
    </header>
  );
}
