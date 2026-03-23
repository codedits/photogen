"use client";
import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, Suspense, lazy } from "react";
import { usePresets } from '../../lib/usePresets';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import { Eye, EyeOff, Loader2 } from 'lucide-react';

// Lazy load heavy components
const PresetsManagement = lazy(() => import('./PresetsManagement'));
const GalleryManagement = lazy(() => import('./GalleryManagement'));
const PresetForm = lazy(() => import('./components/PresetForm'));
const GalleryForm = lazy(() => import('./components/GalleryForm'));

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
    <div className="fixed bottom-4 right-4 z-[100] flex max-w-sm flex-col gap-2">
      {toasts.map(toast => (
        <div
          key={toast.id}
          className={`rounded-md border px-3 py-2 text-sm shadow-xl ${toast.type === 'success' ? 'border-zinc-600 bg-zinc-900 text-zinc-100' : ''} ${toast.type === 'error' ? 'border-red-900 bg-red-950/50 text-red-200' : ''} ${toast.type === 'info' ? 'border-zinc-700 bg-zinc-900 text-zinc-200' : ''}`}
          onClick={() => removeToast(toast.id)}
        >
          <p>{toast.message}</p>
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const toastContextValue = useMemo(() => ({ addToast }), [addToast]);

  const { items: list, loading: listLoading, hasMore, loadMore, refresh } = usePresets({ 
    limit: 50, 
    staleMs: 20000, 
    enabled: authed === true && view.type === 'list' && view.tab === 'presets'
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

  const handleLogout = useCallback(async () => {
    await fetch('/api/admin/logout', { method: 'POST' });
    setAuthed(false);
    addToast('Logged out successfully', 'info');
  }, [addToast]);

  const handleSavePreset = useCallback(async (data: any) => {
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
    
    if (data.removePublicIds) {
      data.removePublicIds.forEach((pid: string) => form.append('removePublicIds', pid));
    }

    const res = await fetch(url, { method, body: form });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to save preset');
    refresh();
    addToast('Preset saved successfully', 'success');
  }, [addToast, refresh, view]);

  const handleDeletePreset = useCallback(async (preset: PresetRow) => {
    const res = await fetch(`/api/presets/${preset.id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    refresh();
    addToast('Preset deleted', 'info');
  }, [addToast, refresh]);

  const handleSaveGallery = useCallback(async (data: any) => {
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
  }, [addToast, view]);

  const handleDeleteGallery = useCallback(async (item: any) => {
    const res = await fetch(`/api/gallery/${item._id}`, { method: 'DELETE' });
    if (!res.ok) throw new Error('Delete failed');
    addToast('Gallery item deleted', 'info');
  }, [addToast]);

  const handleSetActiveTab = useCallback((tab: 'presets' | 'gallery') => {
    setView({ type: 'list', tab });
  }, []);

  const openCreatePreset = useCallback(() => setView({ type: 'create-preset' }), []);
  const openEditPreset = useCallback((preset: PresetRow) => setView({ type: 'edit-preset', preset }), []);
  const openCreateGallery = useCallback(() => setView({ type: 'create-gallery' }), []);
  const openEditGallery = useCallback((item: any) => setView({ type: 'edit-gallery', item }), []);
  const backToPresets = useCallback(() => setView({ type: 'list', tab: 'presets' }), []);
  const backToGallery = useCallback(() => setView({ type: 'list', tab: 'gallery' }), []);

  const [revalidating, setRevalidating] = useState(false);
  const handleManualRevalidate = useCallback(async () => {
    setRevalidating(true);
    try {
      const res = await fetch('/api/admin/revalidate', { 
        method: 'POST', 
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}) // Default revalidates core paths
      });
      if (!res.ok) throw new Error('Refresh failed');
      addToast('Content refreshed successfully', 'success');
    } catch (err) {
      addToast('Failed to refresh content', 'error');
    } finally {
      setRevalidating(false);
    }
  }, [addToast]);

  useEffect(() => { if (authed) { refresh(); } }, [authed, refresh]);

  if (authed === false) {
    return (
      <div className="min-h-screen bg-zinc-950 px-4 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-md">
          <form onSubmit={doLogin} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-6 sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Photogen</p>
              <h1 className="mt-1 text-xl font-semibold text-zinc-100">Admin Login</h1>
              <p className="mt-1 text-sm text-zinc-500">Sign in to manage presets and gallery content.</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input 
                  type={showPwd ? "text" : "password"}
                  value={pwd} 
                  onChange={(e)=>setPwd(e.target.value)} 
                  placeholder="Enter password" 
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 pr-11 text-sm text-zinc-100 outline-none focus:border-zinc-500" 
                  required 
                />
                <button
                  type="button"
                  onClick={() => setShowPwd(!showPwd)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-zinc-500 hover:text-zinc-200"
                >
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              <label className="flex items-center gap-2 text-sm text-zinc-400">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e)=>setRemember(e.target.checked)}
                  className="h-4 w-4 rounded border-zinc-700 bg-zinc-950"
                />
                Keep me logged in
              </label>
            </div>

            {authMsg && (
              <div className="mt-4 rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
                {authMsg}
              </div>
            )}

            <button 
              disabled={loginLoading}
              className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border border-zinc-700 bg-zinc-100 px-4 py-2.5 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-50"
            >
              {loginLoading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Signing in
                </>
              ) : (
                'Sign in'
              )}
            </button>
          </form>
        </div>
      </div>
    );
  }

  if (authed === null) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-black">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
          <p className="text-zinc-400 text-sm">Checking session...</p>
        </div>
      </div>
    );
  }

  const activeTab = view.type === 'list' ? view.tab : (view.type.includes('preset') ? 'presets' : 'gallery');

  return (
    <ToastContext.Provider value={toastContextValue}>
      <div className="min-h-screen bg-zinc-950 flex">
        <AdminSidebar 
          activeTab={activeTab} 
          setActiveTab={handleSetActiveTab} 
          onLogout={handleLogout}
          isOpen={sidebarOpen}
          setIsOpen={setSidebarOpen}
          collapsed={sidebarCollapsed}
          setCollapsed={setSidebarCollapsed}
        />
        
        <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          <AdminHeader 
            title={view.type === 'list' ? activeTab : (view.type.includes('preset') ? 'Edit Preset' : 'Edit Gallery')} 
            onMenuClick={() => setSidebarOpen(true)}
            onRevalidate={handleManualRevalidate}
            revalidating={revalidating}
            breadcrumb={view.type !== 'list' ? [
              { label: view.type.includes('preset') ? 'Presets' : 'Gallery', onClick: () => setView({ type: 'list', tab: view.type.includes('preset') ? 'presets' : 'gallery' }) },
              { label: view.type.includes('create') ? 'Create New' : 'Editing' }
            ] : undefined}
          />
          
          <main className="flex-1 overflow-y-auto bg-zinc-950">
            <div className="mx-auto w-full max-w-[1400px] p-4 md:p-6">
              <Suspense fallback={
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
                </div>
              }>
                {view.type === 'list' && view.tab === 'presets' && (
                  <PresetsManagement 
                    list={list}
                    listLoading={listLoading}
                    hasMore={hasMore}
                    loadMore={loadMore}
                    onCreate={openCreatePreset}
                    onEdit={openEditPreset}
                    onDelete={handleDeletePreset}
                  />
                )}
                {view.type === 'list' && view.tab === 'gallery' && (
                  <GalleryManagement 
                    onCreate={openCreateGallery}
                    onEdit={openEditGallery}
                    onDelete={handleDeleteGallery}
                  />
                )}
                {view.type === 'create-preset' && (
                  <PresetForm 
                    onBack={backToPresets}
                    onSave={handleSavePreset}
                  />
                )}
                {view.type === 'edit-preset' && (
                  <PresetForm 
                    preset={view.preset}
                    onBack={backToPresets}
                    onSave={handleSavePreset}
                    onDelete={handleDeletePreset}
                  />
                )}
                {view.type === 'create-gallery' && (
                  <GalleryForm 
                    onBack={backToGallery}
                    onSave={handleSaveGallery}
                  />
                )}
                {view.type === 'edit-gallery' && (
                  <GalleryForm 
                    item={view.item}
                    onBack={backToGallery}
                    onSave={handleSaveGallery}
                    onDelete={handleDeleteGallery}
                  />
                )}
              </Suspense>
            </div>
          </main>
        </div>
        
        <ToastContainer toasts={toasts} removeToast={removeToast} />
      </div>
    </ToastContext.Provider>
  );
}
