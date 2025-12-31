"use client";

import React, { memo } from 'react';
import ImageWithLqip from '../../components/ImageWithLqip';
import { AdminRow } from './page';

type PresetRow = {
  id: string;
  name: string;
  description?: string;
  prompt?: string;
  tags?: string[];
  images?: { url: string; public_id: string }[];
  dng?: { url?: string; public_id?: string; format?: string } | null;
};

interface PresetsManagementProps {
  showCreate: boolean;
  setShowCreate: (show: boolean) => void;
  name: string;
  setName: (name: string) => void;
  description: string;
  setDescription: (desc: string) => void;
  tags: string;
  setTags: (tags: string) => void;
  uploadItems: Array<{ 
    id: string; 
    preview: string; 
    file?: File; 
    progress: number; 
    status: 'idle'|'uploading'|'done'|'error'|'cancelled'; 
    public_id?: string; 
    url?: string; 
    xhr?: XMLHttpRequest | null 
  }>;
  setUploadItems: React.Dispatch<React.SetStateAction<Array<{ 
    id: string; 
    preview: string; 
    file?: File; 
    progress: number; 
    status: 'idle'|'uploading'|'done'|'error'|'cancelled'; 
    public_id?: string; 
    url?: string; 
    xhr?: XMLHttpRequest | null 
  }>>>;
  dngUrl: string;
  setDngUrl: (url: string) => void;
  loading: boolean;
  message: string | null;
  uploadProgress: number;
  handleFiles: (files?: FileList | null) => void;
  submit: (e: React.FormEvent) => Promise<void>;
  list: any[];
  listLoading: boolean;
  hasMore: boolean;
  loadMore: () => void;
  updatePreset: (row: PresetRow, changes: any) => Promise<void>;
  deletePreset: (row: PresetRow) => Promise<void>;
}

export default function PresetsManagement(props: PresetsManagementProps) {
  const {
    showCreate,
    setShowCreate,
    name,
    setName,
    description,
    setDescription,
    tags,
    setTags,
    uploadItems,
    dngUrl,
    setDngUrl,
    loading,
    message,
    uploadProgress,
    handleFiles,
    submit,
    list,
    listLoading,
    hasMore,
    loadMore,
    updatePreset,
    deletePreset
  } = props;

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
    props.setUploadItems((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className={`grid grid-cols-1 ${showCreate ? 'lg:grid-cols-2' : ''} gap-6`}>
      {showCreate && (
        <div className="rounded-lg border border-white/8 p-4 bg-black/30">
          <h3 className="text-lg font-semibold mb-3">Create Preset</h3>
          <form onSubmit={submit} className="grid grid-cols-1 gap-3">
            <input 
              value={name} 
              onChange={(e) => setName(e.target.value)} 
              placeholder="Name" 
              className="p-2 rounded bg-white/5" 
              required 
            />
            <input 
              value={description} 
              onChange={(e) => setDescription(e.target.value)} 
              placeholder="Description" 
              className="p-2 rounded bg-white/5" 
            />
            <input 
              value={tags} 
              onChange={(e) => setTags(e.target.value)} 
              placeholder="tags (comma separated)" 
              className="p-2 rounded bg-white/5" 
            />

            <label className="text-sm text-slate-300">DNG download URL (required)</label>
            <input 
              type="url" 
              value={dngUrl} 
              onChange={(e) => setDngUrl(e.target.value)} 
              placeholder="https://example.com/preset.dng" 
              className="p-2 rounded bg-white/5" 
              required 
            />

            <label className="text-sm text-slate-300 mt-3">Images (max 8)</label>
            <input 
              type="file" 
              accept="image/*" 
              multiple 
              onChange={(e) => handleFiles(e.target.files)} 
              className="p-2 rounded bg-white/5" 
            />

            {!!uploadItems.length && (
              <div className="mt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
                {uploadItems.slice(0, 8).map((it) => (
                  <div key={it.id} className="relative h-28 w-full rounded overflow-hidden bg-slate-800">
                    <img src={it.preview} alt="preview" className="h-full w-full object-cover" />
                    <div className="absolute left-1 right-1 bottom-1">
                      <div className="w-full bg-white/5 rounded h-2 overflow-hidden">
                        <div className="bg-indigo-600 h-2" style={{ width: `${it.progress}%` }} />
                      </div>
                      <div className="flex justify-between text-xs text-slate-300 mt-1">
                        <div>{it.status}</div>
                        <div>
                          {it.status !== 'done' && (
                            <button type="button" onClick={() => cancelUpload(it.id)} className="text-xs text-red-400">
                              Cancel
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {uploadProgress > 0 && (
              <div className="w-full bg-white/5 rounded overflow-hidden h-3 mt-2">
                <div className="bg-indigo-600 h-3" style={{ width: `${uploadProgress}%` }} />
              </div>
            )}

            <div className="flex items-center gap-3 mt-2">
              <button disabled={loading} className="px-3 py-2 rounded bg-indigo-600 text-white">
                {loading ? 'Creating...' : 'Create Preset'}
              </button>
              <div className="text-sm text-slate-300">{message}</div>
            </div>
          </form>
        </div>
      )}

      <div className="rounded-lg border border-white/8 p-4 bg-black/20">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-semibold">Manage Presets</h3>
          <div>
            <button 
              type="button" 
              onClick={() => setShowCreate(!showCreate)} 
              className="inline-flex items-center gap-2 px-3 py-1 rounded bg-indigo-600 hover:bg-indigo-500 text-white" 
              disabled={loading} 
              aria-disabled={loading}
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-sm">New preset</span>
            </button>
          </div>
        </div>

        {listLoading ? (
          <div className="text-sm text-slate-300">Loading…</div>
        ) : (
          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
            {list.map((item) => {
              const adapted: PresetRow = {
                id: item.id,
                name: item.name ?? 'Untitled',
                description: item.description ?? '',
                prompt: item.prompt,
                tags: item.tags ?? [],
                images: item.images ?? [],
                dng: item.dng ?? null,
              };
              return (
                <AdminRow 
                  key={adapted.id} 
                  row={adapted} 
                  onUpdate={updatePreset} 
                  onDelete={async () => { await deletePreset(adapted); }} 
                />
              );
            })}
            {hasMore && (
              <div className="pt-2">
                <button 
                  type="button" 
                  onClick={() => loadMore()} 
                  className="w-full text-center py-2 text-sm rounded bg-white/10 hover:bg-white/15"
                >
                  Load more…
                </button>
              </div>
            )}
            {!list.length && (
              <div className="text-sm text-slate-400">No presets yet.</div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}