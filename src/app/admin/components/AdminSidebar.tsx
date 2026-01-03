"use client";

import React from 'react';
import { LayoutGrid, Image, LogOut, Home, X, ChevronRight, Sparkles } from 'lucide-react';
import { cn } from '../../../lib/utils';
import Link from 'next/link';

interface AdminSidebarProps {
  activeTab: 'presets' | 'gallery';
  setActiveTab: (tab: 'presets' | 'gallery') => void;
  onLogout: () => void;
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
}

export default function AdminSidebar({ activeTab, setActiveTab, onLogout, isOpen, setIsOpen }: AdminSidebarProps) {
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
          "fixed inset-y-0 left-0 z-50 w-72 bg-zinc-950/95 backdrop-blur-xl border-r border-white/[0.06] transform transition-transform duration-300 ease-out md:translate-x-0 md:static md:h-screen",
          isOpen ? "translate-x-0" : "-translate-x-full"
        )}
      >
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="h-16 flex items-center justify-between px-5 border-b border-white/[0.06]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div>
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
          <div className="px-4 py-4 border-b border-white/[0.06]">
            <Link 
              href="/"
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-zinc-400 hover:text-white hover:bg-white/5 transition-all group"
            >
              <Home size={18} />
              <span className="text-sm font-medium">View Site</span>
              <ChevronRight size={14} className="ml-auto opacity-0 group-hover:opacity-100 transition-opacity" />
            </Link>
          </div>

          {/* Main Nav */}
          <nav className="flex-1 px-4 py-4 space-y-1.5 overflow-y-auto">
            <p className="px-3 mb-3 text-[10px] font-semibold uppercase tracking-wider text-zinc-500">Content</p>
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
                    "w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium transition-all group relative overflow-hidden",
                    isActive 
                      ? "bg-gradient-to-r from-indigo-500/10 to-purple-500/10 text-white border border-indigo-500/20" 
                      : "text-zinc-400 hover:text-white hover:bg-white/5 border border-transparent"
                  )}
                >
                  <div className={cn(
                    "flex items-center justify-center w-9 h-9 rounded-lg transition-colors",
                    isActive ? "bg-indigo-500/20 text-indigo-400" : "bg-white/5 text-zinc-500 group-hover:text-zinc-300"
                  )}>
                    <Icon size={18} />
                  </div>
                  <div className="text-left">
                    <span className="block">{item.label}</span>
                    <span className={cn(
                      "text-[11px] transition-colors",
                      isActive ? "text-indigo-400/70" : "text-zinc-600 group-hover:text-zinc-500"
                    )}>
                      {item.description}
                    </span>
                  </div>
                  {isActive && (
                    <div className="absolute right-3 w-1.5 h-8 rounded-full bg-gradient-to-b from-indigo-500 to-purple-500" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Footer */}
          <div className="p-4 border-t border-white/[0.06]">
            <button
              onClick={onLogout}
              className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-medium text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-all group"
            >
              <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-white/5 text-zinc-500 group-hover:bg-red-500/10 group-hover:text-red-400 transition-colors">
                <LogOut size={18} />
              </div>
              <span>Sign Out</span>
            </button>
            
            {/* Version Badge */}
            <div className="mt-4 px-3 py-2 rounded-lg bg-white/[0.02] border border-white/[0.04]">
              <p className="text-[10px] text-zinc-600">Photogen Admin v1.0</p>
              <p className="text-[10px] text-zinc-700">© 2026 All rights reserved</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
