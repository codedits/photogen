"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Upload, Save, ArrowLeft, Trash2, Eye, EyeOff, MapPin, Info, Loader2, Image as ImageIcon, Settings, ArrowUp, ArrowDown, Star } from 'lucide-react';
import ImageWithLqip from '../../../components/ImageWithLqip';

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

interface GalleryFormProps {
  item?: any;
  onBack: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: (item: any) => Promise<void>;
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

export default function GalleryForm({ item, onBack, onSave, onDelete }: GalleryFormProps) {
  const [formData, setFormData] = useState({
    name: item?.name || '',
    description: item?.description || '',
    category: item?.category || 'portrait',
    tags: (item?.tags || []).join(', '),
    featured: item?.featured || false,
    visibility: item?.visibility || 'public',
    photographer: item?.photographer || '',
    location: item?.location || '',
    equipment: item?.equipment || '',
    metadata: {
      aperture: item?.metadata?.aperture || '',
      shutter: item?.metadata?.shutter || '',
      iso: item?.metadata?.iso?.toString() || '',
      focal_length: item?.metadata?.focal_length || '',
    },
  });

  const [imagesLocal, setImagesLocal] = useState(item?.images || []);
  const [uploadItems, setUploadItems] = useState<UploadItem[]>([]);
  const [busy, setBusy] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  const [deleting, setDeleting] = useState<string[]>([]);
  const [removePublicIds, setRemovePublicIds] = useState<string[]>([]);

  const dropRef = useRef<HTMLDivElement>(null);
  const uploadItemsRef = useRef<UploadItem[]>([]);

  useEffect(() => {
    uploadItemsRef.current = uploadItems;
  }, [uploadItems]);

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
    const list = Array.from(files).filter((f) => f.type.startsWith('image/')).slice(0, 10);
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
        body: JSON.stringify({ folder: 'photogen/gallery' }),
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
        setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'error', error: 'Network error', xhr: null } : p)));
      };

      setUploadItems((prev) => prev.map((p) => (p.id === item.id ? { ...p, status: 'uploading', xhr } : p)));
      xhr.send(form);
    } catch (err: unknown) {
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
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    if (imagesLocal.length === 0) {
      alert('Please upload at least one image');
      return;
    }

    setBusy(true);
    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map((t: string) => t.trim()).filter(Boolean),
        images: imagesLocal,
        removePublicIds,
        metadata: {
          ...formData.metadata,
          iso: formData.metadata.iso ? parseInt(formData.metadata.iso, 10) : undefined,
        },
      };
      await onSave(payload);
      onBack();
    } catch (err: any) {
      alert(err.message || 'Failed to save gallery item');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
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
            <h2 className="text-lg font-semibold text-zinc-100">{item ? 'Edit Gallery Item' : 'Add Gallery Item'}</h2>
            <p className="text-sm text-zinc-500">Minimal publishing flow with clear ordering controls.</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {item && onDelete && (
            <button
              onClick={() => {
                if (confirm(`Delete "${item.name}"?`)) onDelete(item).then(onBack);
              }}
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

      <form onSubmit={handleSubmit} className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <section className="space-y-5 lg:col-span-2">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-2">
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
              <textarea
                value={formData.description}
                onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
                className="min-h-[100px] w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
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

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-2">
                <ImageIcon size={14} />
                Images
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
              <p className="text-xs text-zinc-500 mt-1">Images are uploaded directly to Cloudinary</p>
            </div>

            {(imagesLocal.length > 0 || uploadItems.length > 0) && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
                {imagesLocal.map((img: any, idx: number) => (
                  <div key={img.public_id} className="rounded-md border border-zinc-800 bg-zinc-950 overflow-hidden">
                    <div className="relative aspect-square">
                      <ImageWithLqip src={img.url} alt="gallery" fill className="object-cover" transformOpts={{ w: 300, h: 300, fit: 'cover' }} />
                      {idx === 0 && (
                        <span className="absolute left-2 top-2 inline-flex items-center gap-1 rounded bg-zinc-100 px-1.5 py-0.5 text-[10px] font-semibold text-zinc-900">
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
                      >
                        <ArrowUp size={12} className="mx-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveImage(idx, idx + 1)}
                        disabled={idx === imagesLocal.length - 1}
                        className="rounded border border-zinc-700 px-2 py-1 text-xs text-zinc-300 disabled:opacity-40"
                      >
                        <ArrowDown size={12} className="mx-auto" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setCover(idx)}
                        disabled={idx === 0}
                        className="rounded border border-zinc-700 px-2 py-1 text-[11px] text-zinc-300 disabled:opacity-40"
                      >
                        Cover
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeleteImage(img.public_id)}
                        disabled={deleting.includes(img.public_id)}
                        className="rounded border border-red-900 bg-red-950/40 px-2 py-1 text-[11px] text-red-300 disabled:opacity-40"
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
                      <button
                        type="button"
                        onClick={() => cancelUpload(it.id)}
                        className="w-full border-t border-zinc-800 px-2 py-1.5 text-xs text-zinc-300 hover:bg-zinc-900"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </section>

        <aside className="space-y-5">
          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500">Details</h3>

            <div>
              <label className="mb-1.5 block text-sm text-zinc-300">Photographer</label>
              <input
                value={formData.photographer}
                onChange={(e) => setFormData((prev) => ({ ...prev, photographer: e.target.value }))}
                className="w-full rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-zinc-300">Location</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input
                  value={formData.location}
                  onChange={(e) => setFormData((prev) => ({ ...prev, location: e.target.value }))}
                  className="w-full rounded-md border border-zinc-700 bg-zinc-950 pl-8 pr-3 py-2.5 text-sm text-zinc-100 outline-none focus:border-zinc-500"
                />
              </div>
            </div>

            <div>
              <label className="mb-1.5 block text-sm text-zinc-300">Equipment</label>
              <input
                value={formData.equipment}
                onChange={(e) => setFormData((prev) => ({ ...prev, equipment: e.target.value }))}
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

          <div className="rounded-lg border border-zinc-800 bg-zinc-900/60 p-4 sm:p-5 space-y-3">
            <h3 className="text-xs font-semibold uppercase tracking-wide text-zinc-500 flex items-center gap-2">
              <Settings size={14} />
              Camera Metadata
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <input
                value={formData.metadata.aperture}
                onChange={(e) => setFormData((prev) => ({ ...prev, metadata: { ...prev.metadata, aperture: e.target.value } }))}
                placeholder="Aperture"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
              <input
                value={formData.metadata.shutter}
                onChange={(e) => setFormData((prev) => ({ ...prev, metadata: { ...prev.metadata, shutter: e.target.value } }))}
                placeholder="Shutter"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
              <input
                value={formData.metadata.iso}
                onChange={(e) => setFormData((prev) => ({ ...prev, metadata: { ...prev.metadata, iso: e.target.value } }))}
                placeholder="ISO"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
              <input
                value={formData.metadata.focal_length}
                onChange={(e) => setFormData((prev) => ({ ...prev, metadata: { ...prev.metadata, focal_length: e.target.value } }))}
                placeholder="Focal length"
                className="rounded-md border border-zinc-700 bg-zinc-950 px-3 py-2 text-sm text-zinc-100 outline-none focus:border-zinc-500"
              />
            </div>
          </div>
        </aside>
      </form>
    </div>
  );
}
