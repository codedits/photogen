"use client";
import React, { useState, useEffect, useCallback, useMemo, createContext, useContext, useRef, Suspense, lazy } from "react";
import { usePresets, clearPresetCache } from '../../lib/usePresets';
import AdminSidebar from './components/AdminSidebar';
import AdminHeader from './components/AdminHeader';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import ConfirmDialog from './components/ConfirmDialog';

// Lazy load heavy components
const PresetsManagement = lazy(() => import('./PresetsManagement'));
const GalleryManagement = lazy(() => import('./GalleryManagement'));
const BlogManagement = lazy(() => import('./BlogManagement'));
const PresetForm = lazy(() => import('./components/PresetForm'));
const GalleryForm = lazy(() => import('./components/GalleryForm'));
const BlogForm = lazy(() => import('./components/BlogForm'));
const SettingsManagement = lazy(() => import('./SettingsManagement'));
const HeroSettingsManagement = lazy(() => import('./HeroSettingsManagement'));
const ThemeSettingsManagement = lazy(() => import('./ThemeSettingsManagement'));

type PresetRow = {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  images?: { url: string; public_id: string }[];
  dng?: { url?: string; public_id?: string; format?: string } | null;
};

type BlogRow = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  contentHtml: string;
  tags: string[];
  status: 'draft' | 'published';
  coverImage?: { url: string; public_id: string } | null;
  inlineImages?: { url: string; public_id: string }[];
  seoTitle?: string;
  seoDescription?: string;
};

export type AdminView = 
  | { type: 'list'; tab: 'presets' | 'gallery' | 'blog' | 'contact' | 'hero' | 'theme' }
  | { type: 'create-preset' }
  | { type: 'edit-preset'; preset: PresetRow }
  | { type: 'create-gallery' }
  | { type: 'edit-gallery'; item: any }
  | { type: 'create-blog' }
  | { type: 'edit-blog'; post: BlogRow };

type ViewChangeOptions = {
  skipUnsavedGuard?: boolean;
};

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
  const [formDirty, setFormDirty] = useState(false);
  const [pendingView, setPendingView] = useState<AdminView | null>(null);
  const [showUnsavedDialog, setShowUnsavedDialog] = useState(false);
  const viewRef = useRef<AdminView>(view);
  const formDirtyRef = useRef(false);
  
  // Toast state
  const [toasts, setToasts] = useState<Toast[]>([]);
  const toastTimeoutsRef = useRef<number[]>([]);
  const addToast = useCallback((message: string, type: Toast['type']) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    const timeoutId = window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
      toastTimeoutsRef.current = toastTimeoutsRef.current.filter((tid) => tid !== timeoutId);
    }, 4000);
    toastTimeoutsRef.current.push(timeoutId);
  }, []);
  const removeToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);
  const toastContextValue = useMemo(() => ({ addToast }), [addToast]);

  useEffect(() => {
    viewRef.current = view;
  }, [view]);

  useEffect(() => {
    formDirtyRef.current = formDirty;
  }, [formDirty]);

  const handleFormDirtyChange = useCallback((dirty: boolean) => {
    formDirtyRef.current = dirty;
    setFormDirty(dirty);
  }, []);

  const { items: list, loading: listLoading, hasMore, loadMore, refresh } = usePresets({ 
    limit: 50, 
    staleMs: 20000, 
    enabled: authed === true && view.type === 'list' && view.tab === 'presets'
  });

  // Debounce double-click deletes
  const deletingIdRef = useRef<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetch('/api/admin/session', { cache: 'no-store', signal: controller.signal })
      .then(r => r.json())
      .then(d => {
        if (!controller.signal.aborted) {
          setAuthed(!!d?.ok);
        }
      })
      .catch((err) => {
        if ((err as Error)?.name !== 'AbortError') {
          setAuthed(false);
        }
      });

    return () => {
      controller.abort();
      for (const timeoutId of toastTimeoutsRef.current) {
        window.clearTimeout(timeoutId);
      }
      toastTimeoutsRef.current = [];
    };
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

  const handleSavePreset = useCallback(async (data: any, presetId?: string) => {
    const isEdit = Boolean(presetId);
    const url = isEdit ? `/api/presets/${presetId}` : '/api/presets';
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
    
    if (data.removePublicIds && isEdit) {
      data.removePublicIds.forEach((pid: string) => form.append('removePublicIds', pid));
    }

    const res = await fetch(url, { method, body: form });
    const result = await res.json();
    if (!res.ok) throw new Error(result.error || 'Failed to save preset');
    refresh();
    addToast('Preset saved successfully', 'success');
  }, [addToast, refresh]);

  const handleDeletePreset = useCallback(async (preset: PresetRow) => {
    if (deletingIdRef.current === preset.id) return; // debounce
    deletingIdRef.current = preset.id;
    try {
      const res = await fetch(`/api/presets/${preset.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      clearPresetCache();
      refresh();
      addToast('Preset deleted', 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete preset', 'error');
      throw err; // re-throw so callers can handle
    } finally {
      deletingIdRef.current = null;
    }
  }, [addToast, refresh]);

  const handleSaveGallery = useCallback(async (data: any, itemId?: string) => {
    const isEdit = Boolean(itemId);
    const url = isEdit ? `/api/gallery/${itemId}` : '/api/gallery';
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
  }, [addToast]);

  const handleDeleteGallery = useCallback(async (item: any) => {
    if (deletingIdRef.current === item._id) return; // debounce
    deletingIdRef.current = item._id;
    try {
      const res = await fetch(`/api/gallery/${item._id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Delete failed');
      addToast('Gallery item deleted', 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete gallery item', 'error');
      throw err; // re-throw so callers can handle rollback
    } finally {
      deletingIdRef.current = null;
    }
  }, [addToast]);

  const requestViewChange = useCallback((nextView: AdminView, options?: ViewChangeOptions) => {
    const currentView = viewRef.current;
    const isEditingForm =
      currentView.type !== 'list' ||
      (currentView.type === 'list' && (currentView.tab === 'contact' || currentView.tab === 'hero' || currentView.tab === 'theme'));

    if (!options?.skipUnsavedGuard && isEditingForm && formDirtyRef.current) {
      setPendingView(nextView);
      setShowUnsavedDialog(true);
      return;
    }

    formDirtyRef.current = false;
    setFormDirty(false);
    setShowUnsavedDialog(false);
    setPendingView(null);
    viewRef.current = nextView;
    setView(nextView);
  }, []);

  const confirmDiscardAndNavigate = useCallback(() => {
    if (!pendingView) return;
    formDirtyRef.current = false;
    setFormDirty(false);
    setShowUnsavedDialog(false);
    viewRef.current = pendingView;
    setView(pendingView);
    setPendingView(null);
  }, [pendingView]);

  const cancelDiscardNavigation = useCallback(() => {
    setShowUnsavedDialog(false);
    setPendingView(null);
  }, []);

  const handleSetActiveTab = useCallback((tab: 'presets' | 'gallery' | 'blog' | 'contact' | 'hero' | 'theme') => {
    requestViewChange({ type: 'list', tab });
  }, [requestViewChange]);

  const openCreatePreset = useCallback(() => requestViewChange({ type: 'create-preset' }), [requestViewChange]);
  const openEditPreset = useCallback((preset: PresetRow) => requestViewChange({ type: 'edit-preset', preset }), [requestViewChange]);
  const openCreateGallery = useCallback(() => requestViewChange({ type: 'create-gallery' }), [requestViewChange]);
  const openEditGallery = useCallback((item: any) => requestViewChange({ type: 'edit-gallery', item }), [requestViewChange]);
  const openCreateBlog = useCallback(() => requestViewChange({ type: 'create-blog' }), [requestViewChange]);
  const openEditBlog = useCallback(async (post: { id: string }) => {
    try {
      const res = await fetch(`/api/blog/${post.id}`, { cache: 'no-store' });
      const result = await res.json().catch(() => null);
      if (!res.ok || !result?.post) {
        throw new Error(result?.error || 'Failed to load blog post');
      }
      requestViewChange({ type: 'edit-blog', post: result.post });
    } catch (err: any) {
      addToast(err?.message || 'Failed to load blog post', 'error');
    }
  }, [addToast, requestViewChange]);
  const backToPresets = useCallback((options?: ViewChangeOptions) => requestViewChange({ type: 'list', tab: 'presets' }, options), [requestViewChange]);
  const backToGallery = useCallback((options?: ViewChangeOptions) => requestViewChange({ type: 'list', tab: 'gallery' }, options), [requestViewChange]);
  const backToBlog = useCallback((options?: ViewChangeOptions) => requestViewChange({ type: 'list', tab: 'blog' }, options), [requestViewChange]);

  const handleSaveBlog = useCallback(async (data: any, postId?: string) => {
    const isEdit = Boolean(postId);
    const url = isEdit ? `/api/blog/${postId}` : '/api/blog';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    const result = await res.json().catch(() => null);
    if (!res.ok) {
      throw new Error(result?.error || 'Failed to save blog post');
    }

    addToast(isEdit ? 'Blog post updated' : 'Blog post created', 'success');
  }, [addToast]);

  const handleDeleteBlog = useCallback(async (post: { id: string }) => {
    if (deletingIdRef.current === post.id) return; // debounce
    deletingIdRef.current = post.id;
    try {
      const res = await fetch(`/api/blog/${post.id}`, { method: 'DELETE' });
      const result = await res.json().catch(() => null);
      if (!res.ok) throw new Error(result?.error || 'Delete failed');
      addToast('Blog post deleted', 'info');
    } catch (err) {
      addToast(err instanceof Error ? err.message : 'Failed to delete blog post', 'error');
      throw err; // re-throw so callers can handle rollback
    } finally {
      deletingIdRef.current = null;
    }
  }, [addToast]);

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
      <div className="dark min-h-screen bg-background px-4 py-10 sm:py-16">
        <div className="mx-auto w-full max-w-md">
          <form onSubmit={doLogin} className="rounded-lg border border-zinc-800 bg-zinc-900/70 p-6 sm:p-7">
            <div className="mb-6">
              <p className="text-xs font-normal uppercase tracking-wide text-zinc-500">Photogen</p>
              <h1 className="mt-1 text-xl font-normal text-zinc-100">Admin Login</h1>
              <p className="mt-1 text-sm text-zinc-500">Sign in to manage presets and gallery content.</p>
            </div>

            <div className="space-y-4">
              <div className="relative">
                <input 
                  type={showPwd ? "text" : "password"}
                  value={pwd} 
                  onChange={(e)=>setPwd(e.target.value)} 
                  placeholder="Enter password" 
                  className="w-full rounded-md border border-zinc-700 bg-background px-3 py-2.5 pr-11 text-sm text-zinc-100 outline-none focus:border-zinc-500" 
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
                  className="h-4 w-4 rounded border-zinc-700 bg-background"
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
      <div className="dark min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="w-8 h-8 text-zinc-300 animate-spin" />
          <p className="text-zinc-400 text-sm">Checking session...</p>
        </div>
      </div>
    );
  }

  const activeTab = view.type === 'list'
    ? view.tab
    : view.type.includes('preset')
      ? 'presets'
      : view.type.includes('gallery')
        ? 'gallery'
        : view.type.includes('blog')
          ? 'blog'
          : 'presets';

  const title = view.type === 'list'
    ? activeTab === 'presets'
      ? 'Presets'
      : activeTab === 'gallery'
        ? 'Gallery'
        : activeTab === 'blog'
          ? 'Blog'
          : activeTab === 'contact'
            ? 'Contact Page'
            : activeTab === 'hero'
              ? 'Hero Section'
              : 'Theme System'
    : view.type.includes('preset')
      ? 'Edit Preset'
      : view.type.includes('gallery')
        ? 'Edit Gallery'
        : 'Edit Blog';

  const breadcrumb = view.type !== 'list'
    ? [
        {
          label: view.type.includes('preset') ? 'Presets' : view.type.includes('gallery') ? 'Gallery' : 'Blog',
          onClick: () => requestViewChange({
            type: 'list',
            tab: view.type.includes('preset') ? 'presets' : view.type.includes('gallery') ? 'gallery' : 'blog',
          }),
        },
        { label: view.type.includes('create') ? 'Create New' : 'Editing' },
      ]
    : undefined;

  return (
    <ToastContext.Provider value={toastContextValue}>
      <div className="dark min-h-screen bg-background flex">
        <ConfirmDialog
          isOpen={showUnsavedDialog}
          title="Discard unsaved changes?"
          message="You have unsaved edits in this form. Leaving now will lose those changes."
          confirmText="Discard and continue"
          cancelText="Stay on form"
          onConfirm={confirmDiscardAndNavigate}
          onCancel={cancelDiscardNavigation}
        />

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
            title={title}
            onMenuClick={() => setSidebarOpen(true)}
            onRevalidate={handleManualRevalidate}
            revalidating={revalidating}
            breadcrumb={breadcrumb}
          />
          
          <main className="flex-1 overflow-y-auto bg-background">
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
                {view.type === 'list' && view.tab === 'blog' && (
                  <BlogManagement
                    onCreate={openCreateBlog}
                    onEdit={openEditBlog}
                    onDelete={handleDeleteBlog}
                  />
                )}
                {view.type === 'list' && (activeTab as string) === 'contact' && (
                  <SettingsManagement onDirtyChange={handleFormDirtyChange} />
                )}
                {view.type === 'list' && (activeTab as string) === 'hero' && (
                  <HeroSettingsManagement onDirtyChange={handleFormDirtyChange} />
                )}
                {view.type === 'list' && (activeTab as string) === 'theme' && (
                  <ThemeSettingsManagement onDirtyChange={handleFormDirtyChange} />
                )}
                {view.type === 'create-preset' && (
                  <PresetForm 
                    key="create"
                    onBack={backToPresets}
                    onSave={(data) => handleSavePreset(data)}
                    onDirtyChange={handleFormDirtyChange}
                  />
                )}
                {view.type === 'edit-preset' && (
                  <PresetForm 
                    key={view.preset.id}
                    preset={view.preset}
                    onBack={backToPresets}
                    onSave={(data) => handleSavePreset(data, view.preset.id)}
                    onDelete={handleDeletePreset}
                    onDirtyChange={handleFormDirtyChange}
                  />
                )}
                {view.type === 'create-gallery' && (
                  <GalleryForm 
                    key="create"
                    onBack={backToGallery}
                    onSave={(data) => handleSaveGallery(data)}
                    onDirtyChange={handleFormDirtyChange}
                  />
                )}
                {view.type === 'edit-gallery' && (
                  <GalleryForm 
                    key={view.item._id || view.item.id}
                    item={view.item}
                    onBack={backToGallery}
                    onSave={(data) => handleSaveGallery(data, view.item._id || view.item.id)}
                    onDelete={handleDeleteGallery}
                    onDirtyChange={handleFormDirtyChange}
                  />
                )}
                {view.type === 'create-blog' && (
                  <BlogForm
                    key="create"
                    onBack={backToBlog}
                    onSave={(data) => handleSaveBlog(data)}
                    onDirtyChange={handleFormDirtyChange}
                  />
                )}
                {view.type === 'edit-blog' && (
                  <BlogForm
                    key={view.post.id}
                    post={view.post}
                    onBack={backToBlog}
                    onSave={(data) => handleSaveBlog(data, view.post.id)}
                    onDelete={handleDeleteBlog}
                    onDirtyChange={handleFormDirtyChange}
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
