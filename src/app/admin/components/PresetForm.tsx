"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, Save, ArrowLeft, Trash2, Plus, GripVertical, Image as ImageIcon, Link2, Info, Loader2 } from 'lucide-react';
import ImageWithLqip from '../../../components/ImageWithLqip';

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
}

export default function PresetForm({ preset, onBack, onSave, onDelete }: PresetFormProps) {
  const [name, setName] = useState(preset?.name || '');
  const [description, setDescription] = useState(preset?.description || '');
  const [tags, setTags] = useState((preset?.tags || []).join(', '));
  const [dngUrl, setDngUrl] = useState(preset?.dng?.url || '');
  const [imagesLocal, setImagesLocal] = useState(preset?.images || []);
  const [uploadItems, setUploadItems] = useState<Array<{ 
    id: string; 
    preview: string; 
    file?: File; 
    progress: number; 
    status: 'idle'|'uploading'|'done'|'error'|'cancelled'; 
    error?: string;
    public_id?: string; 
    url?: string; 
    xhr?: XMLHttpRequest | null 
  }>>([]);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState<string[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<{ name?: string; dngUrl?: string }>({});
  
  const dragFrom = useRef<string | null>(null);
  const dragOver = useRef<string | null>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.currentTarget === dropRef.current) {
      setIsDragging(false);
    }
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
    if (files && files.length > 0) {
      handleFiles(files);
    }
  }, []);

  const handleFiles = (files?: FileList | null) => {
    if (!files || !files.length) return;
    const list = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 8);
    const readers = list.map((f) => new Promise<{ preview: string; file: File }>((resolve) => {
      const r = new FileReader();
      r.onload = () => resolve({ preview: String(r.result), file: f });
      r.readAsDataURL(f);
    }));
    Promise.all(readers).then((arr) => {
      const items = arr.map((a, i) => ({ 
        id: `${Date.now()}_${i}`, 
        preview: a.preview, 
        file: a.file, 
        progress: 0, 
        status: 'idle' as const, 
        xhr: null 
      }));
      setUploadItems((prev) => [...prev, ...items]);
      items.forEach((it, idx) => setTimeout(() => startUpload(it), idx * 120));
    });
  };

  const startUpload = (item: { id: string; preview: string; file?: File }) => {
    if (!item.file) return;
    const form = new FormData();
    form.append('image', item.file, item.file.name);
    const xhr = new XMLHttpRequest();
    xhr.open('POST', '/api/upload-image');
    xhr.upload.onprogress = (ev) => {
      if (!ev.lengthComputable) return;
      const pct = Math.round((ev.loaded / ev.total) * 100);
      setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, progress: pct } : p));
    };
    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText || '{}');
        if (xhr.status >= 200 && xhr.status < 300 && data?.ok) {
          setUploadItems((prev) => prev.map((p) => p.id === item.id ? { 
            ...p, 
            status: 'done', 
            progress: 100, 
            public_id: data.public_id, 
            url: data.url, 
            xhr: null 
          } : p));
          setImagesLocal((prev) => [...prev, { url: data.url, public_id: data.public_id }]);
        } else {
          const errMsg = data?.error || (xhr.status === 413 ? 'File too large for server' : 'Upload failed');
          setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'error', error: errMsg, xhr: null } : p));
        }
      } catch {
        const errMsg = xhr.status === 413 ? 'File too large for server' : 'Upload failed';
        setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'error', error: errMsg, xhr: null } : p));
      }
    };
    xhr.onerror = () => {
      setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'error', error: 'Network error', xhr: null } : p));
    };
    setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'uploading', xhr } : p));
    xhr.send(form);
  };

  const cancelUpload = async (id: string) => {
    const it = uploadItems.find((u) => u.id === id);
    if (!it) return;
    if (it.xhr) try { it.xhr.abort(); } catch {}
    if (it.public_id) {
      try {
        await fetch('/api/upload-image', { 
          method: 'DELETE', 
          body: JSON.stringify({ public_id: it.public_id }), 
          headers: { 'content-type': 'application/json' } 
        });
      } catch {}
    }
    setUploadItems((prev) => prev.filter((p) => p.id !== id));
  };

  const handleDeleteImage = async (pid: string) => {
    if (deleting.includes(pid)) return;
    setDeleting((s) => [...s, pid]);
    const prev = imagesLocal;
    setImagesLocal((list) => list.filter((i) => i.public_id !== pid));
    
    if (preset) {
      try {
        const form = new FormData();
        form.append('removePublicIds', pid);
        const res = await fetch(`/api/presets/${preset.id}`, { method: 'PATCH', body: form });
        if (!res.ok) throw new Error('Failed to delete image');
      } catch (err) {
        setImagesLocal(prev);
        alert('Failed to delete image');
      } finally {
        setDeleting((s) => s.filter((x) => x !== pid));
      }
    } else {
      setDeleting((s) => s.filter((x) => x !== pid));
    }
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
    
    setBusy(true);
    try {
      const data = {
        name,
        description,
        tags: tags.split(',').map(s => s.trim()).filter(Boolean),
        dngUrl: dngUrl.trim(),
        imageUrls: imagesLocal.map(img => JSON.stringify(img)),
        orderPublicIds: imagesLocal.map(i => i.public_id),
      };
      await onSave(data);
      onBack();
    } catch (err: any) {
      alert(err.message || 'Failed to save preset');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2.5 rounded-xl hover:bg-white/5 text-zinc-400 hover:text-white transition-colors border border-transparent hover:border-white/10"
          >
            <ArrowLeft size={20} />
          </button>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-white">
              {preset ? 'Edit Preset' : 'Create New Preset'}
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5 hidden sm:block">
              {preset ? 'Update your preset details and images' : 'Add a new Lightroom preset to your collection'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {preset && onDelete && (
            <button
              onClick={() => {
                if (confirm(`Delete preset "${preset.name}"?`)) {
                  onDelete(preset).then(onBack);
                }
              }}
              className="px-3 sm:px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border border-red-500/20"
            >
              <span className="hidden sm:inline">Delete Preset</span>
              <Trash2 size={16} className="sm:hidden" />
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={busy}
            className="flex items-center gap-2 px-4 sm:px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold hover:from-indigo-600 hover:to-purple-700 transition-all shadow-lg shadow-indigo-500/20 disabled:opacity-50 disabled:cursor-not-allowed text-sm"
          >
            {busy ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                <span className="hidden sm:inline">Saving...</span>
              </>
            ) : (
              <>
                <Save size={16} />
                <span className="hidden sm:inline">Save Changes</span>
                <span className="sm:hidden">Save</span>
              </>
            )}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Basic Info Card */}
          <div className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-5 sm:p-6 space-y-5">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Info size={14} />
              Basic Information
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                Preset Name <span className="text-red-400">*</span>
              </label>
              <input 
                className={`w-full px-4 py-3 rounded-xl bg-black/50 border text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition-all ${
                  errors.name 
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                    : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20'
                }`}
                value={name}
                onChange={(e) => { setName(e.target.value); if (errors.name) setErrors(prev => ({ ...prev, name: undefined })); }}
                placeholder="e.g. Summer Haze"
              />
              {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>}
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
              <textarea 
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[120px] resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe the look and feel of this preset..."
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">Tags</label>
              <input 
                className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="dreamy, warm, portrait (comma separated)"
              />
              <p className="mt-1.5 text-xs text-zinc-600">Separate tags with commas</p>
            </div>
          </div>

          {/* Images Card */}
          <div className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon size={14} />
                Preview Images
              </h3>
              <span className="text-xs text-zinc-600">{imagesLocal.length} images</span>
            </div>

            {/* Drag & Drop Zone */}
            <div
              ref={dropRef}
              onDragEnter={handleDragEnter}
              onDragLeave={handleDragLeave}
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging 
                  ? 'border-indigo-500 bg-indigo-500/10' 
                  : 'border-white/10 hover:border-white/20'
              }`}
            >
              <input 
                type="file" 
                multiple 
                accept="image/*" 
                onChange={(e) => handleFiles(e.target.files)} 
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer" 
              />
              <div className="flex flex-col items-center gap-3">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${
                  isDragging ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/5 text-zinc-500'
                }`}>
                  <Upload size={24} />
                </div>
                <div>
                  <p className="text-sm font-medium text-zinc-300">
                    {isDragging ? 'Drop images here' : 'Drop images here or click to upload'}
                  </p>
                  <p className="text-xs text-zinc-600 mt-1">PNG, JPG up to 10MB each</p>
                </div>
              </div>
            </div>

            {/* Image Grid */}
            {(imagesLocal.length > 0 || uploadItems.length > 0) && (
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 mt-4">
                {imagesLocal.map((img, idx) => (
                  <div 
                    key={img.public_id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group bg-zinc-800"
                  >
                    <ImageWithLqip src={img.url} alt="preset" fill className="object-cover" transformOpts={{ w: 300, h: 300, fit: 'cover' }} />
                    {idx === 0 && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-indigo-500 text-white text-[10px] font-semibold uppercase">
                        Cover
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDeleteImage(img.public_id)}
                      disabled={deleting.includes(img.public_id)}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500 disabled:opacity-50"
                    >
                      {deleting.includes(img.public_id) ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : (
                        <Trash2 size={14} />
                      )}
                    </button>
                  </div>
                ))}
                {uploadItems.map((it) => (
                  <div key={it.id} className="relative aspect-square rounded-xl overflow-hidden border border-white/10 bg-zinc-800">
                    <img src={it.preview} alt="upload" className="object-cover w-full h-full opacity-50" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      {it.status === 'uploading' && (
                        <div className="w-3/4">
                          <div className="w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-indigo-500 to-purple-500 h-full transition-all duration-300" 
                              style={{ width: `${it.progress}%` }} 
                            />
                          </div>
                          <p className="text-xs text-center text-white mt-2">{it.progress}%</p>
                        </div>
                      )}
                      {it.status === 'error' && (
                        <div className="text-center p-2">
                          <p className="text-xs text-red-400 font-medium">{it.error || 'Upload failed'}</p>
                          <button
                            type="button"
                            onClick={() => cancelUpload(it.id)}
                            className="mt-2 text-[10px] px-2 py-1 rounded bg-white/10 text-zinc-300 hover:text-white hover:bg-white/20 transition-colors"
                          >
                            Remove
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Download URL Card */}
          <div className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-5 sm:p-6">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2 mb-4">
              <Link2 size={14} />
              Download Settings
            </h3>
            
            <div>
              <label className="block text-sm font-medium text-zinc-300 mb-2">
                DNG Download URL <span className="text-red-400">*</span>
              </label>
              <input 
                type="url"
                className={`w-full px-4 py-3 rounded-xl bg-black/50 border text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition-all text-sm ${
                  errors.dngUrl 
                    ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                    : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20'
                }`}
                value={dngUrl}
                onChange={(e) => { setDngUrl(e.target.value); if (errors.dngUrl) setErrors(prev => ({ ...prev, dngUrl: undefined })); }}
                placeholder="https://..."
              />
              {errors.dngUrl && <p className="mt-1.5 text-xs text-red-400">{errors.dngUrl}</p>}
              <p className="mt-2 text-xs text-zinc-600">
                This link will be used when users download the preset file.
              </p>
            </div>
          </div>

          {/* Tips Card */}
          <div className="bg-gradient-to-br from-indigo-500/10 to-purple-500/10 border border-indigo-500/20 rounded-2xl p-5 sm:p-6">
            <h4 className="text-sm font-semibold text-indigo-400 mb-3">💡 Pro Tips</h4>
            <ul className="space-y-2 text-xs text-zinc-400">
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                Use high-quality preview images to showcase your preset
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                Include before/after comparisons when possible
              </li>
              <li className="flex items-start gap-2">
                <span className="w-1 h-1 rounded-full bg-indigo-400 mt-1.5 flex-shrink-0" />
                Add relevant tags to help users find your preset
              </li>
            </ul>
          </div>
        </div>
      </form>
    </div>
  );
}
