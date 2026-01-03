"use client";
import React, { useState, useEffect, useCallback, memo, createContext, useContext } from "react";
import { usePresets } from '../../lib/usePresets';
import PresetsManagement from './PresetsManagement';
import GalleryManagement from './GalleryManagement';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import PresetForm from './components/PresetForm';
import GalleryForm from './components/GalleryForm';
import { Eye, EyeOff, Loader2, Sparkles } from 'lucide-react';

type PresetRow = {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  images?: { url: string; public_id: string }[];
  dng?: { url?: string; public_id?: string; format?: string } | null;
};

export type AdminView = 
  | { type: 'list'; tab: 'presets' | 'gallery' }
  | { type: 'create-preset' }
  | { type: 'edit-preset'; preset: PresetRow }
  | { type: 'create-gallery' }
  | { type: 'edit-gallery'; item: any };

// Toast Context for global notifications
type Toast = { id: string; message: string; type: 'success' | 'error' | 'info' };
const ToastContext = createContext<{ addToast: (message: string, type: Toast['type']) => void }>({ addToast: () => {} });
export const useToast = () => useContext(ToastContext);

function ToastContainer({ toasts, removeToast }: { toasts: Toast[]; removeToast: (id: string) => void }) {
  return (
    <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`
            px-4 py-3 rounded-xl shadow-2xl backdrop-blur-md border animate-in slide-in-from-right-5 fade-in duration-300
            ${toast.type === 'success' ? 'bg-emerald-500/90 border-emerald-400/50 text-white' : ''}
            ${toast.type === 'error' ? 'bg-red-500/90 border-red-400/50 text-white' : ''}
            ${toast.type === 'info' ? 'bg-white/10 border-white/20 text-white' : ''}
          `}
          onClick={() => removeToast(toast.id)}
        >
          <p className="text-sm font-medium">{toast.message}</p>
        </div>
      ))}
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [pwd, setPwd] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [authMsg, setAuthMsg] = useState<string | null>(null);
  const [remember, setRemember] = useState(true);
  const [loginLoading, setLoginLoading] = useState(false);
  
  const [view, setView] = useState<AdminView>({ type: 'list', tab: 'presets' });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const { items: list, loading: listLoading, hasMore, loadMore, refresh } = usePresets({ 
    limit: 50, 
    staleMs: 20000, 
    enabled: authed === true 
  });

  useEffect(() => {
    fetch('/api/admin/session', { cache: 'no-store' })
      .then(r => r.json()).then(d => setAuthed(!!d?.ok)).catch(()=>setAuthed(false));
  }, []);

  const doLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthMsg(null);
    setLoginLoading(true);
    try {
      const res = await fetch('/api/admin/login', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ password: pwd, remember }) });
      const data = await res.json().catch(() => null);
      if (res.ok && data?.ok) {
        setAuthed(true);
        addToast('Welcome back!', 'success');
      } else {
        setAuthMsg(data?.error || 'Login failed');
      }
    } catch (err: unknown) {
      setAuthMsg(err instanceof Error ? err.message : String(err));
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    addToast('Logged out successfully', 'info');
  };

  const handleSavePreset = async (data: any) => {
    const isEdit = view.type === 'edit-preset';
    const url = isEdit ? `/api/presets/${(view as any).preset.id}` : '/api/presets';
    const method = isEdit ? 'PATCH' : 'POST';

    const form = new FormData();
    form.set('name', data.name);
    form.set('description', data.description);
    form.set('tags', data.tags.join(', '));
    form.set('dngUrl', data.dngUrl);
    
    data.imageUrls.forEach((img: string) => {
      try {
        // If it's already a stringified object, use it, otherwise stringify it
        JSON.parse(img);
        form.append('imageUrls', img);
      } catch {
        form.append('imageUrls', img);
      }
    });
    
    if (data.orderPublicIds) {
      data.orderPublicIds.forEach((pid: string) => form.append('orderPublicIds', pid));
    }

    const res = await fetch(url, { method, body: form });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to save preset');
    refresh();
    addToast('Preset saved successfully', 'success');
  };

  const handleDeletePreset = async (preset: PresetRow) => {
    const res = await fetch(`/api/presets/${preset.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    refresh();
    addToast('Preset deleted', 'info');
  };

  const handleSaveGallery = async (data: any) => {
    const isEdit = view.type === 'edit-gallery';
    const url = isEdit ? `/api/gallery/${(view as any).item._id}` : '/api/gallery';
    const method = isEdit ? 'PUT' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) {
      const result = await res.json();
      throw new Error(result.error || 'Failed to save gallery item');
    }
    addToast('Gallery item saved successfully', 'success');
  };

  const handleDeleteGallery = async (item: any) => {
    const res = await fetch(`/api/gallery/${item._id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    addToast('Gallery item deleted', 'info');
  };

  useEffect(() => { if (authed) { refresh(); } }, [authed, refresh]);

  if (authed === false) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black relative overflow-hidden">
        {/* Animated gradient background */}
        <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/20 via-purple-500/10 to-pink-500/20 opacity-50" />
        <div className="absolute top-1/4 -left-32 w-96 h-96 bg-indigo-500/30 rounded-full blur-3xl animate-pulse" />
        <div className="absolute bottom-1/4 -right-32 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-pulse delay-1000" />
        
        <div className="relative z-10 w-full max-w-md px-4">
          <form onSubmit={doLogin} className="bg-zinc-900/80 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            {/* Logo/Brand */}
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 mb-4 shadow-lg shadow-indigo-500/25">
                <Sparkles className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white">Photogen Admin</h1>
              <p className="text-zinc-400 text-sm mt-1">Sign in to manage your content</p>
            </div>

            {/* Password Input */}
            <div className="space-y-4">
              <div className="relative">
                <input 
                  type={showPwd ? "text" : "password"}
                  value={pwd} 
                  onChange={(e)=>setPwd(e.target.value)} 
                  placeholder="Enter password" 
                  className="w-full px-4 py-3.5 pr-12 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-zinc-500 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all" 
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 p-1.5 text-zinc-400 hover:text-white transition-colors"
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* Remember Me */}
              <label className="flex items-center gap-3 cursor-pointer group">
                <div className="relative">
                  <input 
                    type="checkbox" 
                    checked={remember} 
                    onChange={(e)=>setRemember(e.target.checked)} 
                    className="peer sr-only" 
                  />
                  <div className="w-5 h-5 rounded-md border border-white/20 bg-black/50 peer-checked:bg-indigo-500 peer-checked:border-indigo-500 transition-all flex items-center justify-center">
                    <svg className="w-3 h-3 text-white opacity-0 peer-checked:opacity-100 transition-opacity" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                </div>
                <span className="text-sm text-zinc-400 group-hover:text-zinc-300 transition-colors">Keep me logged in</span>
              </label>
            </div>

            {/* Error Message */}
            {authMsg && (
              <div className="mt-4 px-4 py-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-sm flex items-center gap-2">
                <svg className="w-4 h-4 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                {authMsg}
              </div>
            )}

            {/* Submit Button */}
            <button 
              disabled={loginLoading}
              className="mt-6 w-full py-3.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/25 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in...
                </>
              ) : (
                'Sign in'
              )}
            </button>

            {/* Footer */}
            <p className="mt-6 text-center text-xs text-zinc-500">
              Protected area · Unauthorized access prohibited
            </p>
          </form>
        </div>
      </div>
    );
  }

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
          <p className="text-zinc-400 text-sm">Checking session…</p>
        </div>
      </div>
    );
  }

  const activeTab = view.type === 'list' ? view.tab : (view.type.includes('preset') ? 'presets' : 'gallery');

  return (
    <ToastContext.Provider value={{ addToast }}>
      <div className="min-h-screen bg-black flex">
        <AdminSidebar 
          activeTab={activeTab} 
          setActiveTab={(tab) => setView({ type: 'list', tab })} 
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
        />
        
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <AdminHeader 
            title={view.type === 'list' ? activeTab : (view.type.includes('preset') ? 'Edit Preset' : 'Edit Gallery')} 
            onMenuClick={() => setSidebarOpen(true)}
            breadcrumb={view.type !== 'list' ? [
              { label: view.type.includes('preset') ? 'Presets' : 'Gallery', onClick: () => setView({ type: 'list', tab: view.type.includes('preset') ? 'presets' : 'gallery' }) },
              { label: view.type.includes('create') ? 'Create New' : 'Editing' }
            ] : undefined}
          />
          
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 md:p-6 lg:p-10">
              <div className="max-w-7xl mx-auto">
                {view.type === 'list' && view.tab === 'presets' && (
                  <PresetsManagement 
                    list={list}
                    listLoading={listLoading}
                    hasMore={hasMore}
                    loadMore={loadMore}
                    onCreate={() => setView({ type: 'create-preset' })}
                    onEdit={(preset) => setView({ type: 'edit-preset', preset })}
                    onDelete={handleDeletePreset}
                  />
                )}
                {view.type === 'list' && view.tab === 'gallery' && (
                  <GalleryManagement 
                    onCreate={() => setView({ type: 'create-gallery' })}
                    onEdit={(item) => setView({ type: 'edit-gallery', item })}
                    onDelete={handleDeleteGallery}
                  />
                )}
                {view.type === 'create-preset' && (
                  <PresetForm 
                    onBack={() => setView({ type: 'list', tab: 'presets' })}
                    onSave={handleSavePreset}
                  />
                )}
                {view.type === 'edit-preset' && (
                  <PresetForm 
                    preset={view.preset}
                    onBack={() => setView({ type: 'list', tab: 'presets' })}
                    onSave={handleSavePreset}
                    onDelete={handleDeletePreset}
                  />
                )}
                {view.type === 'create-gallery' && (
                  <GalleryForm 
                    onBack={() => setView({ type: 'list', tab: 'gallery' })}
                    onSave={handleSaveGallery}
                  />
                )}
                {view.type === 'edit-gallery' && (
                  <GalleryForm 
                    item={view.item}
                    onBack={() => setView({ type: 'list', tab: 'gallery' })}
                    onSave={handleSaveGallery}
                    onDelete={handleDeleteGallery}
                  />
                )}
              </div>
            </div>
          </main>
        </div>
        
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </ToastContext.Provider>
  );
}
