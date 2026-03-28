"use client";

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Upload, Save, ArrowLeft, Trash2, Image as ImageIcon, Link2, Info, Loader2, ArrowUp, ArrowDown, Star, RotateCcw } from 'lucide-react';
import ImageWithLqip from '../../../components/ImageWithLqip';
import RichTextEditor from './RichTextEditor';
import ConfirmDialog from './ConfirmDialog';

type PresetRow = {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  images?: { url: string; public_id: string }[];
  dng?: { url?: string; public_id?: string; format?: string } | null;
};

interface PresetFormProps {
  preset?: PresetRow;
  onBack: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: (preset: PresetRow) => Promise<void>;
  onDirtyChange?: (dirty: boolean) => void;
}

type UploadItem = {
  id: string;
  previewUrl: string;
  file?: File;
  progress: number;
  status: 'idle' | 'uploading' | 'done' | 'error' | 'cancelled';
  error?: string;
  public_id?: string;
  xhr?: XMLHttpRequest | null;
};

function moveItem<T>(arr: T[], from: number, to: number): T[] {
  if (from === to || from < 0 || to < 0 || from >= arr.length || to >= arr.length) return arr;
  const next = [...arr];
  const [picked] = next.splice(from, 1);
  next.splice(to, 0, picked);
  return next;
}

export default function PresetForm({ preset, onBack, onSave, onDelete, onDirtyChange }: PresetFormProps) {
  const [name, setName] = useState(preset?.name || '');
  const [description, setDescription] = useState(preset?.description || '');
  const [tags, setTags] = useState((preset?.tags || []).join(', '));
  const [dngUrl, setDngUrl] = useState(preset?.dng?.url || '');
  const [imagesLocal, setImagesLocal] = useState(preset?.images || []);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [removePublicIds, setRemovePublicIds] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; dngUrl?: string }>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState(false);
  const [notice, setNotice] = useState<{ type: 'success' | 'info'; message: string } | null>(null);

  const dropRef = useRef<HTMLDivElement>(null);
  const uploadItemsRef = useRef<UploadItem[]>([]);
  const initialSnapshotRef = useRef(
    JSON.stringify({
      name: preset?.name || '',
      description: preset?.description || '',
      tags: (preset?.tags || []).join(', '),
      dngUrl: preset?.dng?.url || '',
      images: (preset?.images || []).map((img) => ({ url: img.url, public_id: img.public_id })),
    })
  );

  useEffect(() => {
    uploadItemsRef.current = uploadItems;
  }, [uploadItems]);

  const currentSnapshot = useMemo(
    () =>
      JSON.stringify({
        name,
        description,
        tags,
        dngUrl,
        images: imagesLocal.map((img) => ({ url: img.url, public_id: img.public_id })),
      }),
    [name, description, tags, dngUrl, imagesLocal]
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
    return () => {
      for (const it of uploadItemsRef.current) URL.revokeObjectURL(it.previewUrl);
    };
  }, []);

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
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 8);
    const items = list.map((file, i) => ({
      id: `${Date.now()}_${i}`,
      previewUrl: URL.createObjectURL(file),
      file,
      progress: 0,
      status: 'idle' as const,
      xhr: null,
    }));
    setUploadItems((prev) => [...prev, ...items]);
    items.forEach((it, idx) => setTimeout(() => startUpload(it), idx * 120));
  };

  const startUpload = async (item: UploadItem) => {
    if (!item.file) return;
    try {
      const signatureRes = await fetch('/api/admin/cloudinary-signature', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ folder: 'photogen/presets' }),
      });
      const signatureData = await signatureRes.json();
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
        if (!ev.lengthComputable) return;
        const pct = Math.round((ev.loaded / ev.total) * 100);
        setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, progress: pct } : p)));
      };

      xhr.onload = () => {
        try {
          const data = JSON.parse(xhr.responseText || '{}');
          if (xhr.status >= 200 && xhr.status < 300 && data?.secure_url && data?.public_id) {
            URL.revokeObjectURL(item.previewUrl);
            setUploadItems((prev) => prev.filter((p) => p.id !== item.id));
            setImagesLocal((prev) => [...prev, { url: data.secure_url, public_id: data.public_id }]);
          } else {
            const errMsg = data?.error?.message || 'Upload failed';
            setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: errMsg, xhr: null } : p)));
          }
        } catch {
          setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: 'Upload failed', xhr: null } : p)));
        }
      };

      xhr.onerror = () => {
        setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: 'Network error', xhr: null } : p)));
      };

      setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'uploading', xhr } : p)));
      xhr.send(form);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Upload failed';
      setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: message, xhr: null } : p)));
    }
  };

  const cancelUpload = async (id: string) => {
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
    setImagesLocal((prev) => moveItem(prev, index, nextIndex));
  };

  const setCover = (index: number) => {
    setImagesLocal((prev) => moveItem(prev, index, 0));
  };

  const handleDeleteImage = async (pid: string) => {
    if (deleting.includes(pid)) return;
    setDeleting((s) => [...s, pid]);
    
    // Check if it's an existing image from DB
    const isExisting = preset?.images?.some((i: any) => i.public_id === pid);
    
    if (!isExisting) {
       // Newly uploaded during this session, delete immediately from Cloudinary
       try {
         await fetch('/api/upload-image', { 
           method: 'DELETE', 
           headers: { 'Content-Type': 'application/json' },
           body: JSON.stringify({ public_id: pid })
         });
       } catch (err) {
         console.error('Failed to instantly delete unsaved image', err);
       }
    } else {
       // It's an existing image, queue it for server-side Cloudinary destruction on save
       setRemovePublicIds(prev => [...prev, pid]);
    }
    
    setImagesLocal((list: any) => list.filter((i: any) => i.public_id !== pid));
    setDeleting((s) => s.filter((x) => x !== pid));
    setNotice({ type: 'info', message: 'Image removed from current draft.' });
  };

  const validateForm = () => {
    const newErrors: { name?: string; dngUrl?: string } = {};
    if (!name.trim()) newErrors.name = 'Preset name is required';
    if (!dngUrl.trim()) newErrors.dngUrl = 'Download URL is required';
    else if (!/^https?:\/\/.+/.test(dngUrl.trim())) newErrors.dngUrl = 'Please enter a valid URL';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;
    setSubmitError(null);

    setBusy(true);
    try {
      const data = {
        name,
        description,
        tags: tags.split(',').map((s) => s.trim()).filter(Boolean),
        dngUrl: dngUrl.trim(),
        imageUrls: imagesLocal.map((img) => JSON.stringify(img)),
        orderPublicIds: imagesLocal.map((i) => i.public_id),
        removePublicIds,
      };
      await onSave(data);
      onBack();
    } catch (err: unknown) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to save preset');
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!preset || !onDelete || busy) return;
    try {
      setBusy(true);
      await onDelete(preset);
      onBack();
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Failed to delete preset');
    } finally {
      setBusy(false);
      setPendingDelete(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <ConfirmDialog
        isOpen={pendingDelete}
        title="Delete preset"
        message={preset ? `This will permanently delete preset "${preset.name}".` : 'This will permanently delete this preset.'}
        confirmText="Delete"
        loading={busy}
        onConfirm={confirmDelete}
        onCancel={() => setPendingDelete(false)}
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-zinc-800 bg-zinc-900 text-zinc-300 hover:bg-zinc-800"
            aria-label="Go back"
          >
            <ArrowLeft size={16} />
          </button>
          <div>
            <h2 className="text-lg font-normal text-zinc-100">{preset ? 'Edit Preset' : 'Create Preset'}</h2>
            <p className="text-sm text-zinc-500">Clean metadata, clear previews, and ordered image set.</p>
            {isDirty && <p className="text-xs text-amber-300 mt-1">Unsaved changes</p>}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {preset && onDelete && (
            <button
              onClick={() => setPendingDelete(true)}
              className="rounded-md border border-red-900 bg-red-950/40 px-3 py-2 text-sm text-red-300 hover:bg-red-950"
            >
              Delete
            </button>
          )}
          <button
            onClick={handleSubmit}
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="space-y-5 lg:col-span-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-normal uppercase tracking-wide text-zinc-500 flex items-center gap-2">
              <Info size={14} />
              Preset Details
            </h3>

            <div>
              <label className="mb-1.5 block text-sm text-zinc-300">Name</label>
              <input
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }));
                }}
                placeholder="e.g. Golden Portrait"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
              {errors.name && <p className="mt-1 text-xs text-red-400">{errors.name}</p>}
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-zinc-300">Description</label>
              <RichTextEditor
                content={description}
                onChange={setDescription}
                placeholder="Describe this preset look"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-zinc-300">Tags</label>
              <input
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="portrait, warm, indoor"
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-normal uppercase tracking-wide text-zinc-500 flex items-center gap-2">
                <ImageIcon size={14} />
                Preview Images
              </h3>
              <span className="text-xs text-zinc-500">{imagesLocal.length} images</span>
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
                multiple
                accept="image/*"
                onChange={(e) => handleFiles(e.target.files)}
                className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              />
              <Upload size={18} className="mx-auto mb-2 text-zinc-500" />
              <p className="text-sm text-zinc-300">Drop or click to upload</p>
              <p className="text-xs text-zinc-500 mt-1">Direct upload to Cloudinary</p>
            </div>

            {(imagesLocal.length > 0 || uploadItems.length > 0) && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {imagesLocal.map((img, idx) => (
                  <div key={img.public_id} className="rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
                    <div className="relative aspect-square">
                      <ImageWithLqip src={img.url} alt="preset" fill className="object-cover" transformOpts={{ w: 300, h: 300, fit: 'cover' }} />
                      {idx === 0 && (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-normal text-zinc-900">
                          <Star size={10} /> Cover
                        </span>
                      )}
                    </div>
                    <div className="grid grid-cols-2 gap-1 p-1.5">
                      <button
                        type="button"
                        onClick={() => moveImage(idx, idx - 1)}
                        disabled={idx === 0}
                        className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
                        title="Move up"
                      >
                        <ArrowUp size={12} className="mx-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, idx + 1)}
                        disabled={idx === imagesLocal.length - 1}
                        className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
                        title="Move down"
                      >
                        <ArrowDown size={12} className="mx-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCover(idx)}
                        disabled={idx === 0}
                        className="col-span-1 rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 disabled:opacity-40"
                      >
                        Cover
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.public_id)}
                        disabled={deleting.includes(img.public_id)}
                        className="col-span-1 rounded border border-red-900 bg-red-950/40 px-2 py-1 text-[11px] text-red-300 disabled:opacity-40"
                      >
                        {deleting.includes(img.public_id) ? '...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                ))}

                {uploadItems.map((it) => (
                  <div key={it.id} className="rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
                    <div className="relative aspect-square">
                      <img src={it.previewUrl} alt="upload" className="h-full w-full object-cover opacity-50" />
                      <div className="absolute inset-0 flex items-center justify-center p-3">
                        {it.status === 'uploading' && (
                          <div className="w-full space-y-1">
                            <div className="h-1.5 w-full rounded-full bg-zinc-800">
                              <div className="h-full rounded-full bg-zinc-300" style={{ width: `${it.progress}%` }} />
                            </div>
                            <p className="text-center text-[11px] text-zinc-200">{it.progress}%</p>
                          </div>
                        )}
                        {it.status === 'error' && <p className="text-xs text-red-400 text-center">{it.error || 'Upload failed'}</p>}
                      </div>
                    </div>
                    {(it.status === 'uploading' || it.status === 'error') && (
                      <div className="grid grid-cols-2 border-t border-zinc-800">
                        {it.status === 'error' ? (
                          <button
                            type="button"
                            onClick={() => retryUpload(it.id)}
                            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-xs text-zinc-200 hover:bg-zinc-900 border-r border-zinc-800"
                          >
                            <RotateCcw size={11} />
                            Retry
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => cancelUpload(it.id)}
                            className="px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900 border-r border-zinc-800"
                          >
                            Cancel
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => cancelUpload(it.id)}
                          className="px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900"
                        >
                          Remove
                        </button>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-normal uppercase tracking-wide text-zinc-500 flex items-center gap-2">
              <Link2 size={14} />
              Download
            </h3>
            <div>
              <label className="mb-1.5 block text-sm text-zinc-300">DNG URL</label>
              <input
                type="url"
                value={dngUrl}
                onChange={(e) => {
                  setDngUrl(e.target.value);
                  if (errors.dngUrl) setErrors((prev) => ({ ...prev, dngUrl: undefined }));
                }}
                placeholder="https://..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
              {errors.dngUrl && <p className="mt-1 text-xs text-red-400">{errors.dngUrl}</p>}
            </div>
          </div>

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 text-xs text-zinc-400 space-y-2">
            <p className="font-normal uppercase tracking-wide text-zinc-500">Tips</p>
            <p>Use 4 to 8 preview images and place the strongest image as cover.</p>
            <p>Reorder controls define the exact public gallery sequence.</p>
          </div>
        </aside>
      </form>
    </div>
  );
}
