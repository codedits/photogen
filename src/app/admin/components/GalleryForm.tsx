"use client";

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { X, Upload, Save, ArrowLeft, Trash2, Plus, Star, Eye, EyeOff, MapPin, Camera, Info, Link2, Loader2, Image as ImageIcon, Settings } from 'lucide-react';
import ImageWithLqip from '../../../components/ImageWithLqip';

const CATEGORIES = [
  { id: 'portrait', label: 'Portrait', icon: '👤' },
  { id: 'landscape', label: 'Landscape', icon: '🏔️' },
  { id: 'architecture', label: 'Architecture', icon: '🏛️' },
  { id: 'street', label: 'Street', icon: '🚶' },
  { id: 'nature', label: 'Nature', icon: '🌿' },
  { id: 'fashion', label: 'Fashion', icon: '👗' },
  { id: 'event', label: 'Event', icon: '🎉' },
  { id: 'commercial', label: 'Commercial', icon: '📦' },
];

interface GalleryFormProps {
  item?: any;
  onBack: () => void;
  onSave: (data: any) => Promise<void>;
  onDelete?: (item: any) => Promise<void>;
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
      focal_length: item?.metadata?.focal_length || ''
    }
  });

  const [imagesLocal, setImagesLocal] = useState(item?.images || []);
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
  const [isDragging, setIsDragging] = useState(false);
  const [errors, setErrors] = useState<{ name?: string }>({});
  
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
    const list = Array.from(files).filter(f => f.type.startsWith('image/')).slice(0, 10);
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
          setImagesLocal((prev: any) => [...prev, { url: data.url, public_id: data.public_id }]);
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

  const validateForm = () => {
    const newErrors: { name?: string } = {};
    if (!formData.name.trim()) newErrors.name = 'Title is required';
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
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
        metadata: {
          ...formData.metadata,
          iso: formData.metadata.iso ? parseInt(formData.metadata.iso) : undefined
        }
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
              {item ? 'Edit Gallery Item' : 'Add to Gallery'}
            </h2>
            <p className="text-sm text-zinc-500 mt-0.5 hidden sm:block">
              {item ? 'Update your gallery item details' : 'Showcase your work with a new gallery entry'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 sm:gap-3">
          {item && onDelete && (
            <button
              onClick={() => {
                if (confirm(`Delete "${item.name}"?`)) {
                  onDelete(item).then(onBack);
                }
              }}
              className="px-3 sm:px-4 py-2 rounded-xl text-sm font-medium text-red-400 hover:text-red-300 hover:bg-red-500/10 transition-colors border border-red-500/20"
            >
              <span className="hidden sm:inline">Delete Item</span>
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
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-300 mb-2">
                  Title <span className="text-red-400">*</span>
                </label>
                <input 
                  className={`w-full px-4 py-3 rounded-xl bg-black/50 border text-white placeholder:text-zinc-600 focus:outline-none focus:ring-2 transition-all ${
                    errors.name 
                      ? 'border-red-500/50 focus:border-red-500 focus:ring-red-500/20' 
                      : 'border-white/10 focus:border-indigo-500/50 focus:ring-indigo-500/20'
                  }`}
                  value={formData.name}
                  onChange={(e) => { setFormData(prev => ({ ...prev, name: e.target.value })); if (errors.name) setErrors({}); }}
                  placeholder="e.g. Sunset in Santorini"
                />
                {errors.name && <p className="mt-1.5 text-xs text-red-400">{errors.name}</p>}
              </div>
              
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-zinc-300 mb-2">Description</label>
                <textarea 
                  className="w-full px-4 py-3 rounded-xl bg-black/50 border border-white/10 text-white placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all min-h-[100px] resize-none"
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Tell the story behind this photo..."
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Category</label>
                <div className="grid grid-cols-4 gap-2">
                  {CATEGORIES.map(cat => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setFormData(prev => ({ ...prev, category: cat.id }))}
                      className={`p-2 rounded-xl text-center transition-all ${
                        formData.category === cat.id
                          ? 'bg-indigo-500/20 border-indigo-500/50 text-white border'
                          : 'bg-black/30 border border-white/10 text-zinc-400 hover:bg-white/5 hover:text-white'
                      }`}
                    >
                      <span className="text-lg block mb-0.5">{cat.icon}</span>
                      <span className="text-[10px] uppercase tracking-wider font-medium">{cat.label}</span>
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-2">Visibility</label>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, visibility: 'public' }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                      formData.visibility === 'public'
                        ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-400 border'
                        : 'bg-black/30 border border-white/10 text-zinc-400 hover:bg-white/5'
                    }`}
                  >
                    <Eye size={16} />
                    <span className="text-sm font-medium">Public</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormData(prev => ({ ...prev, visibility: 'private' }))}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-3 rounded-xl transition-all ${
                      formData.visibility === 'private'
                        ? 'bg-zinc-500/20 border-zinc-500/50 text-zinc-300 border'
                        : 'bg-black/30 border border-white/10 text-zinc-400 hover:bg-white/5'
                    }`}
                  >
                    <EyeOff size={16} />
                    <span className="text-sm font-medium">Private</span>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Images Card */}
          <div className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-5 sm:p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
                <ImageIcon size={14} />
                Gallery Images
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
                {imagesLocal.map((img: any, idx: number) => (
                  <div 
                    key={img.public_id}
                    className="relative aspect-square rounded-xl overflow-hidden border border-white/10 group bg-zinc-800"
                  >
                    <ImageWithLqip src={img.url} alt="gallery" fill className="object-cover" transformOpts={{ w: 300, h: 300, fit: 'cover' }} />
                    {idx === 0 && (
                      <div className="absolute top-2 left-2 px-2 py-0.5 rounded-md bg-indigo-500 text-white text-[10px] font-semibold uppercase">
                        Cover
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => setImagesLocal((prev: any) => prev.filter((i: any) => i.public_id !== img.public_id))}
                      className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/60 backdrop-blur-sm text-white opacity-0 group-hover:opacity-100 transition-all hover:bg-red-500"
                    >
                      <Trash2 size={14} />
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
          {/* Details Card */}
          <div className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider">Details</h3>
            
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Photographer</label>
              <input 
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={formData.photographer}
                onChange={(e) => setFormData(prev => ({ ...prev, photographer: e.target.value }))}
                placeholder="Your name"
              />
            </div>
            
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Location</label>
              <div className="relative">
                <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
                <input 
                  className="w-full px-3 py-2.5 pl-9 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  placeholder="City, Country"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Equipment</label>
              <input 
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={formData.equipment}
                onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
                placeholder="Camera, Lens"
              />
            </div>

            <div>
              <label className="block text-xs text-zinc-500 mb-1.5">Tags</label>
              <input 
                className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                value={formData.tags}
                onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                placeholder="sunset, ocean, travel"
              />
            </div>
            
            {/* Featured Toggle */}
            <div className="pt-2">
              <button
                type="button"
                onClick={() => setFormData(prev => ({ ...prev, featured: !prev.featured }))}
                className={`w-full flex items-center justify-between px-4 py-3 rounded-xl transition-all ${
                  formData.featured
                    ? 'bg-yellow-500/10 border border-yellow-500/30'
                    : 'bg-black/30 border border-white/10 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-2">
                  <Star size={16} className={formData.featured ? "text-yellow-500 fill-yellow-500" : "text-zinc-500"} />
                  <span className={`text-sm font-medium ${formData.featured ? 'text-yellow-400' : 'text-zinc-400'}`}>
                    Featured Item
                  </span>
                </div>
                <div className={`w-10 h-6 rounded-full transition-colors ${formData.featured ? 'bg-yellow-500' : 'bg-zinc-700'}`}>
                  <div className={`w-4 h-4 rounded-full bg-white shadow-md transform transition-transform mt-1 ${formData.featured ? 'translate-x-5' : 'translate-x-1'}`} />
                </div>
              </button>
            </div>
          </div>

          {/* Camera Settings Card */}
          <div className="bg-zinc-900/30 border border-white/[0.06] rounded-2xl p-5 sm:p-6 space-y-4">
            <h3 className="text-sm font-semibold text-zinc-400 uppercase tracking-wider flex items-center gap-2">
              <Settings size={14} />
              Camera Settings
            </h3>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Aperture</label>
                <input 
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={formData.metadata.aperture}
                  onChange={(e) => setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, aperture: e.target.value } }))}
                  placeholder="f/1.8"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Shutter</label>
                <input 
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={formData.metadata.shutter}
                  onChange={(e) => setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, shutter: e.target.value } }))}
                  placeholder="1/200"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">ISO</label>
                <input 
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={formData.metadata.iso}
                  onChange={(e) => setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, iso: e.target.value } }))}
                  placeholder="100"
                />
              </div>
              <div>
                <label className="block text-xs text-zinc-500 mb-1.5">Focal Length</label>
                <input 
                  className="w-full px-3 py-2.5 rounded-xl bg-black/50 border border-white/10 text-white text-sm placeholder:text-zinc-600 focus:outline-none focus:border-indigo-500/50 focus:ring-2 focus:ring-indigo-500/20 transition-all"
                  value={formData.metadata.focal_length}
                  onChange={(e) => setFormData(prev => ({ ...prev, metadata: { ...prev.metadata, focal_length: e.target.value } }))}
                  placeholder="35mm"
                />
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}
