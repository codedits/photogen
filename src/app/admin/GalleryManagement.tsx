"use client";

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Camera, Star, Eye, EyeOff, MapPin, Upload, X, Edit2, Trash2 } from 'lucide-react';
import ImageWithLqip from '../../components/ImageWithLqip';
import type { GalleryDoc } from '../api/gallery/route';

interface GalleryItem extends Omit<GalleryDoc, '_id'> {
  _id: string;
}

const CATEGORIES = [
  'portrait',
  'landscape', 
  'architecture',
  'street',
  'nature',
  'fashion',
  'event',
  'commercial'
];

export default function GalleryManagement() {
  const [items, setItems] = useState<GalleryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);
  const [editingItem, setEditingItem] = useState<GalleryItem | null>(null);
  const [uploadItems, setUploadItems] = useState<Array<{ 
    id: string; 
    preview: string; 
    file?: File; 
    progress: number; 
    status: 'idle'|'uploading'|'done'|'error'|'cancelled'; 
    public_id?: string; 
    url?: string; 
    xhr?: XMLHttpRequest | null 
  }>>([]);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'portrait',
    tags: '',
    featured: false,
    visibility: 'public' as 'public' | 'private',
    photographer: '',
    location: '',
    equipment: '',
    metadata: {
      aperture: '',
      shutter: '',
      iso: '',
      focal_length: ''
    }
  });

  const fetchGalleryItems = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/gallery?limit=100&visibility=all'); // Admin sees all
      const data = await res.json();
      
      if (res.ok) {
        setItems(data.items || []);
      } else {
        console.error('Gallery fetch error:', data.error || res.statusText);
      }
    } catch (error) {
      console.error('Failed to fetch gallery items:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchGalleryItems();
  }, [fetchGalleryItems]);

  const resetForm = () => {
    setFormData({
      name: '',
      description: '',
      category: 'portrait',
      tags: '',
      featured: false,
      visibility: 'public',
      photographer: '',
      location: '',
      equipment: '',
      metadata: {
        aperture: '',
        shutter: '',
        iso: '',
        focal_length: ''
      }
    });
    setUploadItems([]);
  };

  const handleFiles = (files?: FileList | null) => {
    if (!files || !files.length) return;
    
    const list = Array.from(files).slice(0, 10); // Allow more for gallery
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
        } else {
          setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'error', xhr: null } : p));
        }
      } catch {
        setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'error', xhr: null } : p));
      }
    };
    
    xhr.onerror = () => {
      setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'error', xhr: null } : p));
    };
    
    setUploadItems((prev) => prev.map((p) => p.id === item.id ? { ...p, status: 'uploading', xhr } : p));
    xhr.send(form);
  };

  const cancelUpload = async (id: string) => {
    const it = uploadItems.find((u) => u.id === id);
    if (!it) return;
    
    if (it.xhr) {
      try { it.xhr.abort(); } catch {}
    }
    
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

  const submitGalleryItem = async (e: React.FormEvent) => {
    e.preventDefault();
    
    const completedUploads = uploadItems.filter(u => u.status === 'done');
    if (completedUploads.length === 0) {
      alert('Please upload at least one image');
      return;
    }

    try {
      const payload = {
        ...formData,
        tags: formData.tags.split(',').map(t => t.trim()).filter(Boolean),
        images: completedUploads.map(u => ({ url: u.url!, public_id: u.public_id! })),
        metadata: {
          ...formData.metadata,
          iso: formData.metadata.iso ? parseInt(formData.metadata.iso) : undefined
        }
      };

      const url = editingItem ? `/api/gallery/${editingItem._id}` : '/api/gallery';
      const method = editingItem ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      
      const data = await res.json();
      
      if (res.ok) {
        setShowCreate(false);
        setEditingItem(null);
        resetForm();
        await fetchGalleryItems();
        alert(editingItem ? 'Gallery item updated!' : 'Gallery item created!');
      } else {
        alert(data.error || 'Failed to save gallery item');
      }
    } catch (error) {
      alert('Error saving gallery item');
      console.error(error);
    }
  };

  const deleteGalleryItem = async (item: GalleryItem) => {
    if (!confirm(`Delete "${item.name}"? This cannot be undone.`)) return;
    
    try {
      const res = await fetch(`/api/gallery/${item._id}`, { method: 'DELETE' });
      
      if (res.ok) {
        await fetchGalleryItems();
        alert('Gallery item deleted');
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to delete gallery item');
      }
    } catch (error) {
      alert('Error deleting gallery item');
      console.error(error);
    }
  };

  const editGalleryItem = (item: GalleryItem) => {
    setEditingItem(item);
    setFormData({
      name: item.name,
      description: item.description || '',
      category: item.category,
      tags: item.tags.join(', '),
      featured: item.featured,
      visibility: item.visibility,
      photographer: item.photographer || '',
      location: item.location || '',
      equipment: item.equipment || '',
      metadata: {
        aperture: item.metadata?.aperture || '',
        shutter: item.metadata?.shutter || '',
        iso: item.metadata?.iso?.toString() || '',
        focal_length: item.metadata?.focal_length || ''
      }
    });
    setUploadItems(item.images.map((img, i) => ({
      id: `existing_${i}`,
      preview: img.url,
      progress: 100,
      status: 'done' as const,
      public_id: img.public_id,
      url: img.url,
      xhr: null
    })));
    setShowCreate(true);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Gallery Management</h3>
        <button
          onClick={() => {
            if (!showCreate) {
              resetForm();
              setEditingItem(null);
            }
            setShowCreate(!showCreate);
          }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-md transition-colors"
        >
          <Camera className="w-4 h-4" />
          {showCreate ? 'Cancel' : 'Add Gallery Item'}
        </button>
      </div>

      {/* Create/Edit Form */}
      {showCreate && (
        <div className="bg-black/30 border border-white/10 rounded-lg p-6">
          <h4 className="text-lg font-medium mb-4">
            {editingItem ? 'Edit Gallery Item' : 'Create Gallery Item'}
          </h4>
          
          <form onSubmit={submitGalleryItem} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Left Column - Basic Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Name *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded-md"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded-md h-20"
                  rows={3}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Category *</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                    className="w-full p-2 bg-white/5 border border-white/20 rounded-md"
                    required
                  >
                    {CATEGORIES.map(cat => (
                      <option key={cat} value={cat}>{cat}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium mb-1">Visibility</label>
                  <select
                    value={formData.visibility}
                    onChange={(e) => setFormData(prev => ({ ...prev, visibility: e.target.value as 'public' | 'private' }))}
                    className="w-full p-2 bg-white/5 border border-white/20 rounded-md"
                  >
                    <option value="public">Public</option>
                    <option value="private">Private</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Tags (comma separated)</label>
                <input
                  type="text"
                  value={formData.tags}
                  onChange={(e) => setFormData(prev => ({ ...prev, tags: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded-md"
                  placeholder="portrait, studio, dramatic"
                />
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="featured"
                  checked={formData.featured}
                  onChange={(e) => setFormData(prev => ({ ...prev, featured: e.target.checked }))}
                  className="w-4 h-4"
                />
                <label htmlFor="featured" className="text-sm font-medium flex items-center gap-1">
                  <Star className="w-4 h-4" />
                  Featured Item
                </label>
              </div>
            </div>

            {/* Right Column - Additional Info */}
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Photographer</label>
                <input
                  type="text"
                  value={formData.photographer}
                  onChange={(e) => setFormData(prev => ({ ...prev, photographer: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded-md"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded-md"
                  placeholder="New York, NY"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Equipment</label>
                <input
                  type="text"
                  value={formData.equipment}
                  onChange={(e) => setFormData(prev => ({ ...prev, equipment: e.target.value }))}
                  className="w-full p-2 bg-white/5 border border-white/20 rounded-md"
                  placeholder="Canon 5D Mark IV, 85mm f/1.4"
                />
              </div>

              {/* Camera Settings */}
              <div>
                <label className="block text-sm font-medium mb-2">Camera Settings</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    value={formData.metadata.aperture}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      metadata: { ...prev.metadata, aperture: e.target.value } 
                    }))}
                    className="p-2 bg-white/5 border border-white/20 rounded-md text-xs"
                    placeholder="f/1.4"
                  />
                  <input
                    type="text"
                    value={formData.metadata.shutter}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      metadata: { ...prev.metadata, shutter: e.target.value } 
                    }))}
                    className="p-2 bg-white/5 border border-white/20 rounded-md text-xs"
                    placeholder="1/125s"
                  />
                  <input
                    type="text"
                    value={formData.metadata.iso}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      metadata: { ...prev.metadata, iso: e.target.value } 
                    }))}
                    className="p-2 bg-white/5 border border-white/20 rounded-md text-xs"
                    placeholder="800"
                  />
                  <input
                    type="text"
                    value={formData.metadata.focal_length}
                    onChange={(e) => setFormData(prev => ({ 
                      ...prev, 
                      metadata: { ...prev.metadata, focal_length: e.target.value } 
                    }))}
                    className="p-2 bg-white/5 border border-white/20 rounded-md text-xs"
                    placeholder="85mm"
                  />
                </div>
              </div>
            </div>

            {/* Images Upload - Full Width */}
            <div className="md:col-span-2">
              <label className="block text-sm font-medium mb-2">Images *</label>
              <div className="border-2 border-dashed border-white/20 rounded-lg p-6 text-center">
                <input
                  type="file"
                  multiple
                  accept="image/*"
                  onChange={(e) => handleFiles(e.target.files)}
                  className="hidden"
                  id="gallery-upload"
                />
                <label 
                  htmlFor="gallery-upload" 
                  className="cursor-pointer flex flex-col items-center gap-2"
                >
                  <Upload className="w-8 h-8 text-white/40" />
                  <span className="text-sm text-white/60">
                    Click to upload images or drag and drop
                  </span>
                </label>
              </div>

              {/* Upload Preview Grid */}
              {uploadItems.length > 0 && (
                <div className="mt-4 grid grid-cols-3 md:grid-cols-6 gap-3">
                  {uploadItems.map((item) => (
                    <div key={item.id} className="relative group">
                      <div className="aspect-square bg-neutral-800 rounded-md overflow-hidden">
                        <img 
                          src={item.preview} 
                          alt="Upload preview" 
                          className="w-full h-full object-cover"
                        />
                        
                        {/* Progress bar */}
                        {item.status === 'uploading' && (
                          <div className="absolute bottom-0 left-0 right-0 bg-black/50 p-1">
                            <div className="w-full bg-white/20 rounded-full h-1">
                              <div 
                                className="bg-indigo-500 h-1 rounded-full transition-all"
                                style={{ width: `${item.progress}%` }}
                              />
                            </div>
                          </div>
                        )}
                        
                        {/* Remove button */}
                        <button
                          type="button"
                          onClick={() => cancelUpload(item.id)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity"
                        >
                          <X className="w-3 h-3 text-white" />
                        </button>
                      </div>
                      
                      <div className="text-xs text-center mt-1 text-white/60 capitalize">
                        {item.status}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button - Full Width */}
            <div className="md:col-span-2 flex gap-3 pt-4">
              <button
                type="submit"
                disabled={uploadItems.filter(u => u.status === 'done').length === 0}
                className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:bg-indigo-600/50 text-white rounded-md transition-colors"
              >
                {editingItem ? 'Update Gallery Item' : 'Create Gallery Item'}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreate(false);
                  setEditingItem(null);
                  resetForm();
                }}
                className="px-6 py-2 bg-white/10 hover:bg-white/15 text-white rounded-md transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Gallery Items List */}
      <div className="bg-black/20 border border-white/10 rounded-lg">
        <div className="p-4 border-b border-white/10">
          <h4 className="font-medium">Gallery Items ({items.length})</h4>
        </div>
        
        {loading ? (
          <div className="p-8 text-center text-white/60">Loading gallery items...</div>
        ) : items.length === 0 ? (
          <div className="p-8 text-center text-white/60">No gallery items yet</div>
        ) : (
          <div className="divide-y divide-white/10">
            {items.map((item) => (
              <div key={item._id} className="p-4 flex items-center gap-4 hover:bg-white/5">
                
                {/* Thumbnail */}
                <div className="w-16 h-16 bg-neutral-800 rounded-md overflow-hidden flex-shrink-0">
                  {item.images[0] && (
                    <ImageWithLqip
                      src={item.images[0].url}
                      alt={item.name}
                      width={64}
                      height={64}
                      className="w-full h-full object-cover"
                      transformOpts={{ w: 128, h: 128, fit: 'cover' }}
                    />
                  )}
                </div>

                {/* Info */}
                <div className="flex-grow min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h5 className="font-medium truncate">{item.name}</h5>
                    {item.featured && (
                      <Star className="w-4 h-4 text-yellow-500 flex-shrink-0" />
                    )}
                    <div className={`flex items-center gap-1 text-xs px-2 py-1 rounded ${
                      item.visibility === 'public' ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'
                    }`}>
                      {item.visibility === 'public' ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                      {item.visibility}
                    </div>
                  </div>
                  
                  <div className="text-sm text-white/70 flex items-center gap-4">
                    <span className="capitalize">{item.category}</span>
                    <span>{item.images.length} image{item.images.length !== 1 ? 's' : ''}</span>
                    {item.location && (
                      <div className="flex items-center gap-1">
                        <MapPin className="w-3 h-3" />
                        <span>{item.location}</span>
                      </div>
                    )}
                  </div>
                  
                  {item.tags.length > 0 && (
                    <div className="text-xs text-white/50 mt-1">
                      {item.tags.map(tag => `#${tag}`).join(' ')}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => editGalleryItem(item)}
                    className="p-2 hover:bg-white/10 rounded-md transition-colors"
                    title="Edit"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => deleteGalleryItem(item)}
                    className="p-2 hover:bg-white/10 rounded-md transition-colors text-red-400"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}