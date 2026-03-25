"use client";

import React from 'react';
import { LayoutGrid, Image, LogOut, Home, X, ChevronLeft, ChevronRight, Settings, Mail } from 'lucide-react';
import { cn } from '../../../lib/utils';
import Link from 'next/link';

interface AdminSidebarProps {
  activeTab: 'presets' | 'gallery' | 'contact';
  setActiveTab: (tab: 'presets' | 'gallery' | 'contact') => void;
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
    { id: 'presets', label: 'Presets', icon: LayoutGrid },
    { id: 'gallery', label: 'Gallery', icon: Image },
    { id: 'contact', label: 'Contact Page', icon: Mail },
  ] as const;

  return (
    <>
      <div 
        className={cn(
          "fixed inset-0 z-40 bg-background/60 md:hidden transition-opacity duration-200",
          isOpen ? "opacity-100" : "opacity-0 pointer-events-none"
        )}
        onClick={() => setIsOpen(false)}
      />

      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex h-full flex-col border-r border-zinc-800 bg-background transform transition-all duration-200 md:translate-x-0 md:static md:h-screen",
          isOpen ? "translate-x-0" : "-translate-x-full",
          "w-64",
          collapsed ? "md:w-20" : "md:w-64"
        )}
      >
        <div className={cn(
          "h-14 flex items-center border-b border-zinc-800",
          collapsed ? "justify-center px-0" : "justify-between px-4"
        )}>
          <div className="flex items-center gap-2 overflow-hidden">
            <div className="h-8 w-8 rounded-lg border border-zinc-700 bg-zinc-900 flex items-center justify-center text-zinc-200 text-xs font-normal">
              PG
            </div>
            <div className={cn(
              "overflow-hidden whitespace-nowrap transition-all",
              collapsed ? "md:w-0 md:opacity-0" : "w-auto opacity-100"
            )}>
              <span className="text-sm font-normal text-zinc-100">Photogen Admin</span>
            </div>
          </div>
          <button 
            onClick={() => setIsOpen(false)}
            className="md:hidden p-2 -mr-2 text-zinc-500 hover:text-zinc-100 rounded-md hover:bg-zinc-900"
          >
            <X size={20} />
          </button>
        </div>

        <div className={cn(
          "border-b border-zinc-800 py-3",
          collapsed ? "md:px-2" : "px-3"
        )}>
          <Link 
            href="/"
            className={cn(
              "flex items-center gap-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900",
              collapsed ? "justify-center p-2" : "px-3 py-2"
            )}
            title={collapsed ? "View Site" : undefined}
          >
            <Home size={16} />
            <div className={cn("flex items-center gap-2 flex-1", collapsed && "md:hidden")}>
              <span className="text-sm">View Site</span>
              <ChevronRight size={14} className="ml-auto" />
            </div>
          </Link>
        </div>

        <nav className="flex-1 py-3 space-y-1 overflow-y-auto overflow-x-hidden">
          <p className={cn(
            "px-6 mb-2 text-[10px] font-normal uppercase tracking-wide text-zinc-500",
            collapsed && "md:hidden"
          )}>
            Content
          </p>
          <div className={cn("space-y-1", collapsed ? "px-2" : "px-3")}>
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
                    "w-full flex items-center gap-2 rounded-md text-sm transition-colors",
                    collapsed ? "justify-center p-2" : "px-3 py-2",
                    isActive 
                      ? "bg-zinc-900 text-zinc-100 border border-zinc-700" 
                      : "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900 border border-transparent"
                  )}
                  title={collapsed ? item.label : undefined}
                >
                  <div className={cn(
                    "flex items-center justify-center h-7 w-7 rounded-md transition-colors shrink-0",
                    isActive ? "bg-zinc-800 text-zinc-100" : "bg-zinc-900 text-zinc-400"
                  )}>
                    <Icon size={16} />
                  </div>
                  <div className={cn("text-left overflow-hidden whitespace-nowrap", collapsed && "md:hidden")}>
                    <span className="block">{item.label}</span>
                  </div>
                </button>
              );
            })}
          </div>
        </nav>

        <div className={cn("border-t border-zinc-800 p-3 space-y-1", collapsed && "px-2")}>
          <button
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "hidden md:flex w-full items-center gap-2 rounded-md text-zinc-400 hover:text-zinc-100 hover:bg-zinc-900",
              collapsed ? "justify-center p-2" : "px-3 py-2"
            )}
            title={collapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            <span className={cn("text-sm", collapsed && "hidden")}>Collapse</span>
          </button>

          <button
            onClick={onLogout}
            className={cn(
              "w-full flex items-center gap-2 rounded-md text-zinc-400 hover:text-red-300 hover:bg-red-500/10",
              collapsed ? "justify-center p-2" : "px-3 py-2"
            )}
            title={collapsed ? "Sign Out" : undefined}
          >
            <LogOut size={16} />
            <span className={cn("text-sm", collapsed && "md:hidden")}>Sign Out</span>
          </button>
        </div>
      </aside>
    </>
  );
}
