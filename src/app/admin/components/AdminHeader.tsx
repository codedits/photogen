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
      
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <div className="hidden sm:flex items-center gap-2 px-2.5 py-1 rounded-md border border-zinc-800 bg-zinc-900">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Online</span>
        </div>
      </div>
    </header>
  );
}
