"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { flushSync } from 'react-dom';
import { Upload, Save, ArrowLeft, Trash2, Eye, EyeOff, MapPin, Info, Loader2, Image as ImageIcon, Settings, ArrowUp, ArrowDown, Star, RotateCcw } from 'lucide-react';
import ImageWithLqip from '../../../components/ImageWithLqip';
import RichTextEditor from './RichTextEditor';
import ConfirmDialog from './ConfirmDialog';

const CATEGORIES = [
  { id: 'portrait', label: 'Portrait' },
  { id: 'landscape', label: 'Landscape' },
  { id: 'architecture', label: 'Architecture' },
  { id: 'street', label: 'Street' },
  { id: 'nature', label: 'Nature' },
  { id: 'fashion', label: 'Fashion' },
  { id: 'event', label: 'Event' },
  { id: 'commercial', label: 'Commercial' },
];

const MAX_WALLPAPER_IMAGES = 1;

type BackNavigationOptions = {
  skipUnsavedGuard?: boolean;
};

interface WallpaperFormProps {
  item?: any;
  onBack: (options?: BackNavigationOptions) => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: (item: any) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

type UploadItem = {
  id: string;
  previewUrl: string;
  file?: File;
  progress: number;
  status: 'idle' | 'uploading' | 'done' | 'error' | 'cancelled';
  error?: string;
  xhr?: XMLHttpRequest | null;
};

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [picked] = next.splice(from, 1);
  next.splice(to, 0, picked);
  return next;
}

// PERFORMANCE: Memoized sub-component for upload progress to isolate re-renders
const UploadCard = React.memo(({ item, onCancel, onRetry }: { item: UploadItem; onCancel: () => void; onRetry: () => void }) => {
  return (
    <div className="rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
      <div className="relative aspect-square">
        <img src={item.previewUrl} alt="upload" className="h-full w-full object-cover opacity-50" />
        <div className="absolute inset-0 flex items-center justify-center p-3">
          {item.status === 'uploading' && (
            <div className="w-full space-y-1">
              <div className="h-1.5 w-full rounded-full bg-zinc-800">
                <div
                  className="h-full rounded-full bg-zinc-300 transition-all duration-300"
                  style={{ width: `${item.progress}%` }}
                />
              </div>
              <p className="text-center text-[11px] text-zinc-200">{item.progress}%</p>
            </div>
          )}
          {item.status === 'error' && <p className="text-xs text-red-400 text-center">{item.error || 'Upload failed'}</p>}
        </div>
      </div>
      {(item.status === 'uploading' || item.status === 'error') && (
        <div className="grid grid-cols-2 border-t border-zinc-800">
          {item.status === 'error' ? (
            <button
              type="button"
              onClick={onRetry}
              className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900 border-r border-zinc-800"
            >
              <RotateCcw size={11} />
              Retry
            </button>
          ) : (
            <button
              type="button"
              onClick={onCancel}
              className="px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 border-r border-zinc-800"
            >
              <ArrowLeft size={11} className="rotate-90" />
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={onCancel}
            className="px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900"
          >
            Remove
          </button>
        </div>
      )}
    </div>
  );
});
UploadCard.displayName = 'UploadCard';


export default function WallpaperForm({ item, onBack, onSave, onDelete, onDirtyChange }: WallpaperFormProps) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    category: item?.category || 'portrait',
    tags: (item?.tags || []).join(', '),
    featured: item?.featured || false,
    visibility: item?.visibility || 'public',
    photographer: item?.photographer || '',
  });

  const [imagesLocal, setImagesLocal] = useState(item?.images || []);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [deleting, setDeleting] = useState<string[]>([]);
  const [removePublicIds, setRemovePublicIds] = useState<string[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const dropRef = useRef<HTMLDivElement>(null);
  const uploadItemsRef = useRef<UploadItem[]>([]);
  const isMountedRef = useRef(true);
  const uploadTimerIdsRef = useRef<number[]>([]);
  const sessionUploadedPublicIdsRef = useRef<Set<string>>(new Set());
  const initialSnapshotRef = useRef(
    JSON.stringify({
      formData: {
        name: item?.name || '',
        description: item?.description || '',
        category: item?.category || 'portrait',
        tags: (item?.tags || []).join(', '),
        featured: item?.featured || false,
        visibility: item?.visibility || 'public',
        photographer: item?.photographer || '',
      },
      images: (item?.images || []).map((img: any) => ({ url: img.url, public_id: img.public_id })),
    })
  );

  // PERFORMANCE: Track last progress to throttle state updates
  const lastProgressRef = useRef<Record<string, number>>({});


  useEffect(() => {
    uploadItemsRef.current = uploadItems;
  }, [uploadItems]);

  const cleanupCloudinaryUpload = useCallback((publicId: string) => {
    if (!publicId) return;
    fetch('/api/upload-image', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ public_id: publicId }),
    }).catch(() => {});
  }, []);

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        formData,
        images: imagesLocal.map((img: any) => ({ url: img.url, public_id: img.public_id })),
      }),
    [formData, imagesLocal]
  );

  const isDirty = currentSnapshot !== initialSnapshotRef.current || uploadItems.length > 0;

  useEffect(() => {
    onDirtyChange?.(isDirty);
    return () => onDirtyChange?.(false);
  }, [isDirty, onDirtyChange]);

  useEffect(() => {
    if (!isDirty) return;
    const onBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };
    window.addEventListener('beforeunload', onBeforeUnload);
    return () => window.removeEventListener('beforeunload', onBeforeUnload);
  }, [isDirty]);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      for (const timerId of uploadTimerIdsRef.current) {
        window.clearTimeout(timerId);
      }
      uploadTimerIdsRef.current = [];
      for (const it of uploadItemsRef.current) {
        if (it.xhr) {
          try {
            it.xhr.abort();
          } catch {}
        }
        URL.revokeObjectURL(it.previewUrl);
      }

      const orphanedPublicIds = Array.from(sessionUploadedPublicIdsRef.current);
      sessionUploadedPublicIdsRef.current.clear();
      for (const publicId of orphanedPublicIds) {
        cleanupCloudinaryUpload(publicId);
      }
    };
  }, [cleanupCloudinaryUpload]);

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropRef.current) setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    const files = e.dataTransfer.files;
    if (files && files.length > 0) handleFiles(files);
  }, []);

  const handleFiles = (files?: FileList | null) => {
    if (!files || !files.length) return;
    const imageFiles = Array.from(files).filter((f) => f.type.startsWith('image/'));
    const usedSlots = imagesLocal.length + uploadItemsRef.current.length;
    const availableSlots = Math.max(0, MAX_WALLPAPER_IMAGES - usedSlots);

    if (availableSlots <= 0) {
      setNotice({ type: 'info', message: `Maximum ${MAX_WALLPAPER_IMAGES} image allowed per wallpaper.` });
      return;
    }

    const list = imageFiles.slice(0, availableSlots);
    if (list.length < imageFiles.length) {
      setNotice({ type: 'info', message: `Only ${availableSlots} image added. Max ${MAX_WALLPAPER_IMAGES} allowed.` });
    }

    setSubmitError(null);
    const items = list.map((file, i) => ({
      id: `${Date.now()}_${i}`,
      previewUrl: URL.createObjectURL(file),
      file,
      progress: 0,
      status: 'idle' as const,
      xhr: null,
    }));
    setUploadItems((prev) => [...prev, ...items]);
    items.forEach((it, idx) => {
      const timerId = window.setTimeout(() => {
        uploadTimerIdsRef.current = uploadTimerIdsRef.current.filter((id) => id !== timerId);
        startUpload(it);
      }, idx * 120);
      uploadTimerIdsRef.current.push(timerId);
    });
  };

  const startUpload = async (item: UploadItem) => {
    if (!item.file || !isMountedRef.current) return;
    try {
      const signatureRes = await fetch('/api/admin/cloudinary-signature', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ folder: 'photogen/wallpaper' }),
      });
      const signatureData = await signatureRes.json();
      if (!isMountedRef.current) return;
      if (!signatureRes.ok || !signatureData?.ok) {
        throw new Error(signatureData?.error || 'Failed to initialize upload');
      }

      const form = new FormData();
      form.append('file', item.file, item.file.name);
      form.append('api_key', signatureData.apiKey);
      form.append('timestamp', String(signatureData.timestamp));
      form.append('signature', signatureData.signature);
      form.append('folder', signatureData.folder);
      form.append('resource_type', signatureData.resourceType || 'image');

      const xhr = new XMLHttpRequest();
      xhr.open('POST', `https://api.cloudinary.com/v1_1/${signatureData.cloudName}/${signatureData.resourceType || 'image'}/upload`);

      xhr.upload.onprogress = (ev) => {
        if (!isMountedRef.current) return;
        if (!ev.lengthComputable) return;
        const pct = Math.round((ev.loaded / ev.total) * 100);
        
        // PERFORMANCE: Throttle progress updates to prevent UI lag
        const last = lastProgressRef.current[item.id] || 0;
        if (pct === 100 || (pct - last >= 4)) {
            lastProgressRef.current[item.id] = pct;
            setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, progress: pct, status: 'uploading' } : p)));
        }
      };

      xhr.onload = () => {
        if (!isMountedRef.current) return;
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url && data?.public_id) {
            URL.revokeObjectURL(item.previewUrl);
            setUploadItems((prev) => prev.filter((p) => p.id !== item.id));
            sessionUploadedPublicIdsRef.current.add(data.public_id);
            setImagesLocal((prev: any) => [...prev, { url: data.secure_url, public_id: data.public_id }]);
          } else {
            const errMsg = data?.error?.message || 'Upload failed';
            setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: errMsg, xhr: null } : p)));
          }
        } catch {
          setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: 'Upload failed', xhr: null } : p)));
        }
      };

      xhr.onerror = () => {
        if (!isMountedRef.current) return;
        setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: 'Network error', xhr: null } : p)));
      };

      if (!isMountedRef.current) {
        try {
          xhr.abort();
        } catch {}
        return;
      }
      setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'uploading', xhr } : p)));
      xhr.send(form);
    } catch (err: unknown) {
      if (!isMountedRef.current) return;
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: message, xhr: null } : p)));
    }
  };

  const cancelUpload = (id: string) => {
    const it = uploadItems.find((u) => u.id === id);
    if (!it) return;
    if (it.xhr) {
      try {
        it.xhr.abort();
      } catch {}
    }
    URL.revokeObjectURL(it.previewUrl);
    setUploadItems((prev) => prev.filter((p) => p.id !== id));
    setNotice({ type: 'info', message: 'Upload removed.' });
  };

  const retryUpload = (id: string) => {
    const it = uploadItemsRef.current.find((u) => u.id === id);
    if (!it || !it.file || it.status === 'uploading') return;
    setUploadItems((prev) => prev.map((p) => (p.id === id ? { ...p, status: 'idle', error: undefined, progress: 0 } : p)));
    setSubmitError(null);
    startUpload(it);
  };

  const moveImage = (index: number, nextIndex: number) => {
    setImagesLocal((prev: any) => moveItem(prev, index, nextIndex));
  };

  const setCover = (index: number) => {
    setImagesLocal((prev: any) => moveItem(prev, index, 0));
  };

  const validateForm = () => {
    const newErrors: { name?: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Title is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleDeleteImage = async (pid: string) => {
    if (deleting.includes(pid)) return;
    setDeleting((s) => [...s, pid]);
    
    // Check if it's an existing image from DB
    const isExisting = item?.images?.some((i: any) => i.public_id === pid);
    
    if (!isExisting) {
       // Newly uploaded during this session, delete immediately from Cloudinary
       cleanupCloudinaryUpload(pid);
    } else {
       // It's an existing image, queue it for server-side Cloudinary destruction on save
       if (isMountedRef.current) {
         setRemovePublicIds(prev => [...prev, pid]);
       }
    }

    sessionUploadedPublicIdsRef.current.delete(pid);

    if (!isMountedRef.current) return;
    setImagesLocal((list: any) => list.filter((i: any) => i.public_id !== pid));
    setDeleting((s) => s.filter((x) => x !== pid));
    setNotice({ type: 'info', message: 'Image removed from current draft.' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (busy) return;
    if (!validateForm()) return;
    setSubmitError(null);

    if (imagesLocal.length === 0) {
      setSubmitError('Please upload at least one image before saving.');
      return;
    }

    if (imagesLocal.length > MAX_WALLPAPER_IMAGES) {
      setSubmitError(`Please keep images at exactly 1.`);
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        images: imagesLocal,
        removePublicIds,
      };
      await onSave(payload);
      initialSnapshotRef.current = currentSnapshot;
      sessionUploadedPublicIdsRef.current.clear();
      if (isMountedRef.current) {
        flushSync(() => onDirtyChange?.(false));
        onBack({ skipUnsavedGuard: true });
      }
    } catch (err: unknown) {
      if (isMountedRef.current) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to save wallpaper');
      }
    } finally {
      if (isMountedRef.current) {
        setBusy(false);
      }
    }
  };

  const confirmDelete = async () => {
    if (!item || !onDelete || busy) return;
    try {
      setBusy(true);
      await onDelete(item);
      const orphanedPublicIds = Array.from(sessionUploadedPublicIdsRef.current);
      sessionUploadedPublicIdsRef.current.clear();
      for (const publicId of orphanedPublicIds) {
        cleanupCloudinaryUpload(publicId);
      }
      initialSnapshotRef.current = currentSnapshot;
      if (isMountedRef.current) {
        flushSync(() => onDirtyChange?.(false));
        onBack({ skipUnsavedGuard: true });
      }
    } catch (err) {
      if (isMountedRef.current) {
        setSubmitError(err instanceof Error ? err.message : 'Failed to delete wallpaper');
      }
    } finally {
      if (isMountedRef.current) {
        setBusy(false);
        setPendingDelete(false);
      }
    }
  };

  // PERFORMANCE: Memoize heavy form sections to avoid re-rendering during upload progress
  const basicInfoSection = useMemo(() => (
    <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
      <h3 className="text-xs font-normal uppercase tracking-wide text-zinc-500 flex items-center gap-2">
        <Info size={14} />
        Basic Info
      </h3>

      <div>
        <label className="mb-1.5 block text-sm text-zinc-300">Title</label>
        <input
          value={formData.name}
          onChange={(e) => {
            setFormData((prev) => ({ ...prev, name: e.target.value }));
            if (errors.name) setErrors({});
          }}
          placeholder="e.g. Evening Street Portrait"
          className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
        />
        {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
      </div>

      <div>
        <label className="mb-1.5 block text-sm text-zinc-300">Description</label>
        <RichTextEditor
          content={formData.description}
          onChange={(content) => setFormData((prev) => ({ ...prev, description: content }))}
          placeholder="Story, context, or style notes"
        />
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1.5 block text-sm text-zinc-300">Category</label>
          <select
            value={formData.category}
            onChange={(e) => setFormData((prev) => ({ ...prev, category: e.target.value }))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
          >
            {CATEGORIES.map((cat) => (
              <option key={cat.id} value={cat.id}>{cat.label}</option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-300">Visibility</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, visibility: 'public' }))}
              className={`inline-flex items-center justify-center gap-1 rounded-md border px-3 py-2 text-sm ${
                formData.visibility === 'public' ? 'border-zinc-500 bg-zinc-800 text-zinc-100' : 'border-zinc-700 bg-zinc-950 text-zinc-400'
              }`}
            >
              <Eye size={14} /> Public
            </button>
            <button
              type="button"
              onClick={() => setFormData((prev) => ({ ...prev, visibility: 'private' }))}
              className={`inline-flex items-center justify-center gap-1 rounded-md border px-3 py-2 text-sm ${
                formData.visibility === 'private' ? 'border-zinc-500 bg-zinc-800 text-zinc-100' : 'border-zinc-700 bg-zinc-950 text-zinc-400'
              }`}
            >
              <EyeOff size={14} /> Private
            </button>
          </div>
        </div>
      </div>
    </div>
  ), [formData.name, formData.description, formData.category, formData.visibility, errors.name]);

  const asideSection = useMemo(() => (
    <aside className="space-y-5">
      <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-3">
        <h3 className="text-xs font-normal uppercase tracking-wide text-zinc-500">Details</h3>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-300">Photographer</label>
          <input
            value={formData.photographer}
            onChange={(e) => setFormData((prev) => ({ ...prev, photographer: e.target.value }))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
          />
        </div>

        <div>
          <label className="mb-1.5 block text-sm text-zinc-300">Tags</label>
          <input
            value={formData.tags}
            onChange={(e) => setFormData((prev) => ({ ...prev, tags: e.target.value }))}
            className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setFormData((prev) => ({ ...prev, featured: !prev.featured }))}
          className={`w-full rounded-md border px-3 py-2.5 text-sm ${
            formData.featured ? 'border-zinc-500 bg-zinc-800 text-zinc-100' : 'border-zinc-700 bg-zinc-950 text-zinc-400'
          }`}
        >
          {formData.featured ? 'Featured: On' : 'Featured: Off'}
        </button>
      </div>
    </aside>
  ), [formData.photographer, formData.tags, formData.featured]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <ConfirmDialog
        isOpen={pendingDelete}
        title="Delete wallpaper"
        message={item ? `This will permanently delete "${item.name}".` : 'This will permanently delete this wallpaper.'}
        confirmText="Delete"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(false)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => onBack()}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-normal text-zinc-100">{item ? 'Edit Wallpaper Item' : 'Add Wallpaper Item'}</h2>
            <p className="text-sm text-zinc-500">Minimal publishing flow with clear ordering controls.</p>
            {isDirty && <p className="text-xs text-amber-300 mt-1">Unsaved changes</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {item && onDelete && (
            <button
              type="button"
              onClick={() => setPendingDelete(true)}
              className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300 hover:bg-red-950"
            >
              Delete
            </button>
          )}
          <button
            form="wallpaper-form"
            type="submit"
            disabled={busy}
            className="inline-flex items-center gap-2 rounded-md border border-zinc-700 bg-zinc-100 px-4 py-2 text-sm font-medium text-zinc-900 hover:bg-white disabled:opacity-60"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
            {busy ? 'Saving' : 'Save'}
          </button>
        </div>
      </div>

      {submitError && (
        <div aria-live="polite" className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300">
          {submitError}
        </div>
      )}

      {notice && (
        <div
          aria-live="polite"
          className={`rounded-md px-3 py-2 text-sm border ${notice.type === 'success' ? 'border-emerald-900 bg-emerald-950/40 text-emerald-300' : 'border-zinc-700 bg-zinc-900/60 text-zinc-300'}`}
        >
          {notice.message}
        </div>
      )}

      <form id="wallpaper-form" onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          {basicInfoSection}

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-normal uppercase tracking-wide text-zinc-500 flex items-center gap-2">
                <ImageIcon size={14} />
                Image
              </h3>
              <span className="text-xs text-zinc-500">{imagesLocal.length}/{MAX_WALLPAPER_IMAGES} image</span>
            </div>

            <div
              ref={dropRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`relative rounded-md border border-dashed p-6 text-center ${isDragging ? 'border-zinc-400 bg-zinc-800' : 'border-zinc-700 bg-zinc-950'}`}
            >
              <input
                type="file"
                accept="image/*"
                onChange={(e) => handleFiles(e.target.files)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <Upload size={18} className="mx-auto mb-2 text-zinc-500" />
              <p className="text-sm text-zinc-300">Drop or click to upload</p>
              <p className="text-xs text-zinc-500 mt-1">Images are uploaded directly to Cloudinary</p>
            </div>

            {(imagesLocal.length > 0 || uploadItems.length > 0) && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {imagesLocal.map((img: any, idx: number) => (
                  <div key={img.public_id} className="rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
                    <div className="relative aspect-square">
                      <ImageWithLqip src={img.url} alt="wallpaper" fill className="object-cover" transformOpts={{ w: 300, h: 300, fit: 'cover' }} />
                      {idx === 0 && (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-normal text-zinc-900">
                          <Star size={10} /> Cover
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-1 p-1.5">
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.public_id)}
                        disabled={deleting.includes(img.public_id)}
                        className="rounded border border-red-900 bg-red-950/40 px-2 py-1 text-[11px] text-red-300 disabled:opacity-40"
                      >
                        {deleting.includes(img.public_id) ? 'Removing...' : 'Remove'}
                      </button>
                    </div>
                  </div>
                ))}

                {uploadItems.map((it) => (
                  <UploadCard key={it.id} item={it} onCancel={() => cancelUpload(it.id)} onRetry={() => retryUpload(it.id)} />
                ))}
              </div>
            )}
          </div>
        </div>

        {asideSection}
      </form>
    </div>
  );
}
