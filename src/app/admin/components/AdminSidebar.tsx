"use client";

import React from 'react';
import { LayoutGrid, Image, LogOut, Home, X, ChevronRight, Sparkles, ChevronLeft } from 'lucide-react';
import { cn } from '../../../lib/utils';
import Link from 'next/link';

interface AdminSidebarProps {
  activeTab: 'presets' | 'gallery';
  setActiveTab: (tab: 'presets' | 'gallery') => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  collapsed: boolean;
  setCollapsed: (collapsed: boolean) => void;
}

export default function AdminSidebar({ 
  activeTab, 
  setActiveTab, 
  onLogout, 
  isOpen, 
  setIsOpen,
  collapsed,
  setCollapsed
}: AdminSidebarProps) {
  const navItems = [
    { id: 'presets', label: 'Presets', icon: LayoutGrid, description: 'Manage Lightroom presets' },
    { id: 'gallery', label: 'Gallery', icon: Image, description: 'Portfolio images' },
  ] as const;

  return (
    <>
      {/* Mobile Overlay */}
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-black/60 backdrop-blur-sm md:hidden transition-opacity duration-300",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 bg-zinc-950/95 backdrop-blur-xl border-r border-white/[0.06] transform transition-all duration-300 ease-out md:translate-x-0 md:static md:h-screen flex flex-col",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "w-72", // Mobile width
          collapsed ? "md:w-[80px]" : "md:w-72" // Desktop width
        )}
      >
        {/* Header */}
        <div className={cn(
          "h-16 flex items-center border-b border-white/[0.06] transition-all duration-300",
          "justify-between px-5", // Base styles
          collapsed && "md:justify-center md:px-0" // Desktop collapsed override
        )}>
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-9 h-9 min-w-[36px] rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div className={cn(
              "transition-all duration-300 overflow-hidden whitespace-nowrap",
              collapsed ? "md:w-0 md:opacity-0" : "w-auto opacity-100"
            )}>
              <span className="text-base font-semibold text-white">Photogen</span>
              <span className="ml-1.5 text-[10px] font-medium text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded">Admin</span>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 -mr-2 text-zinc-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Quick Actions */}
        <div className={cn(
          "py-4 border-b border-white/[0.06] transition-all duration-300",
          "px-4", // Base
          collapsed && "md:px-2" // Desktop collapsed override
        )}>
          <Link 
            href="/"
            className={cn(
              "flex items-center gap-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group",
              "px-3 py-2.5", // Base
              collapsed && "md:justify-center md:p-2" // Desktop collapsed override
            )}
            title={collapsed ? "View Site" : undefined}
          >
            <Home size={18} />
            <div className={cn("flex items-center gap-3 flex-1", collapsed && "md:hidden")}>
              <span className="text-sm font-medium">View Site</span>
              <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
          </Link>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 py-4 space-y-1.5 overflow-y-auto overflow-x-hidden">
          <p className={cn(
            "px-7 mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500 animate-in fade-in duration-300",
            collapsed && "md:hidden"
          )}>
            Content
          </p>
          <div className={cn("space-y-1.5", "px-4", collapsed && "md:px-2")}>
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-xl text-sm font-medium transition-all group relative overflow-hidden",
                    "px-3 py-3", // Base
                    collapsed && "md:justify-center md:p-2", // Desktop collapsed override
                    isActive 
                      ? "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-white border border-indigo-500/20" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <div className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg transition-colors shrink-0",
                    isActive ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    <Icon size={18} />
                  </div>
                  <div className={cn("text-left overflow-hidden whitespace-nowrap", collapsed && "md:hidden")}>
                    <span className="block">{item.label}</span>
                    <span className="text-[10px] text-zinc-500 font-normal">{item.description}</span>
                  </div>
                  {isActive && (
                    <div className={cn(
                      "absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-indigo-500 rounded-l-full",
                      collapsed && "md:hidden"
                    )} />
                  )}
                </button>
              );
            })}
          </div>
        </nav>

        {/* Footer / Collapse Toggle */}
        <div className="p-4 border-t border-white/[0.06] space-y-2">
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden md:flex w-full items-center gap-3 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group",
              collapsed ? "justify-center p-2" : "px-3 py-2.5"
            )}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
            <span className={cn("text-sm font-medium", collapsed && "hidden")}>Collapse Sidebar</span>
          </button>

          <button
            onClick={onLogout}
            className={cn(
              "w-full flex items-center gap-3 rounded-xl text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-all group",
              "px-3 py-2.5", // Base
              collapsed && "md:justify-center md:p-2" // Desktop collapsed override
            )}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut size={18} />
            <span className={cn("text-sm font-medium", collapsed && "md:hidden")}>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
